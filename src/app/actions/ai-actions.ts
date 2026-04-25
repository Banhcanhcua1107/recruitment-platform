"use server";

import { existsSync } from "node:fs";
import { fetchWithTimeout, UpstreamTimeoutError } from "@/lib/upstream-http";
import { CV_WRITER_SYSTEM_PROMPT_VI, CV_WRITER_SYSTEM_PROMPT_EN } from "./ai-config";

// ── Language detection ──────────────────────────────────────
// Returns "vi" if the text contains Vietnamese diacritics, otherwise "en"
function detectLanguage(text: string): "vi" | "en" {
  return /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(text)
    ? "vi"
    : "en";
}
// ── Format detection ──────────────────────────────────────────────────
// Detects whether the content is a bullet list, a paragraph, or short text
type ContentFormat = "list" | "paragraph" | "short";

function detectFormat(text: string): ContentFormat {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.filter(l => /^[-•*]\s/.test(l) || /^\d+\.\s/.test(l));
  const textLines   = lines.filter(l => !/^[-•*]\s/.test(l) && !/^\d+\.\s/.test(l));

  // Dominant format wins: if more than half the lines are bullets → list
  if (bulletLines.length > 0 && bulletLines.length >= textLines.length) return "list";
  // At least 2 bullets even if text lines are more → list
  if (bulletLines.length >= 2) return "list";

  // Count sentence endings to detect paragraph
  const sentences = (text.match(/[.!?]\s/g) || []).length;
  if (sentences >= 2 || (lines.length === 1 && text.length > 80)) return "paragraph";
  if (lines.length >= 2 && text.length > 120) return "paragraph";

  return "short";
}

function normalizeForSimilarity(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\n\r]+/g, " ")
    .trim()
    .toLowerCase();
}

function calculateDiceSimilarity(original: string, suggestion: string): number {
  const a = normalizeForSimilarity(original);
  const b = normalizeForSimilarity(suggestion);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const bigrams = (source: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < source.length - 1; i++) {
      set.add(source.slice(i, i + 2));
    }
    return set;
  };

  const sourceA = bigrams(a);
  const sourceB = bigrams(b);
  let overlap = 0;
  sourceA.forEach((gram) => {
    if (sourceB.has(gram)) {
      overlap += 1;
    }
  });

  return (2 * overlap) / (sourceA.size + sourceB.size);
}

// ── Extract actual output, stripping model reasoning ────────────────
// Models (qwen3, qwen2.5) often prepend English reasoning even for Vietnamese tasks.
// This function aggressively strips all non-content text.
function extractOutput(raw: string, lang: "vi" | "en"): string {
  // 1. Strip <think>...</think> blocks (matched or orphaned)
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const closeThinkIdx = text.lastIndexOf("</think>");
  if (closeThinkIdx !== -1) {
    text = text.slice(closeThinkIdx + "</think>".length);
  }

  // 2. Strip markdown code fences
  text = text.replace(/```[\w]*\n?/g, "").replace(/```/g, "").trim();

  if (!text) return "";

  // 3. Detect and strip leading reasoning block.
  //    Models often output a big block of English reasoning before the actual content.
  //    Strategy: find the first line that looks like actual CV content (starts with -)
  //    or contains Vietnamese diacritics, and discard everything before it.
  const lines = text.split("\n");

  // Patterns that indicate model reasoning/thinking (not CV content)
  const isReasoningLine = (line: string): boolean => {
    const t = line.trim();
    if (!t) return true; // blank lines in reasoning block
    // English reasoning starters
    if (/^(okay|ok[,.\s]|let'?s|let me|first[,.\s]|so[,.\s]|now[,.\s]|wait[,.\s]|hmm|i need|i'll|i will|i have|i should|the user|the original|looking at|based on|note:|here'?s|alright|this means|for example|original:|rewritten:|draft:|attempt:|output:|result:|improved:|step\s*\d|but |however |also |next |then |since |because |maybe |perhaps |actually )/i.test(t)) {
      return true;
    }
    // Lines that are clearly meta-commentary about the task
    if (/^(the (task|prompt|input|content|user|key|main|goal|rules?)|my (approach|plan|strategy)|i('m| am| was| will| need| should| have)|this (is|means|should|requires)|each (bullet|point|line|item)|looking|checking|reviewing|analyzing|let'?s)/i.test(t)) {
      return true;
    }
    return false;
  };

  // Find first non-reasoning line
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    // If line starts with "- " it's a bullet point (CV content)
    if (t.startsWith("- ")) break;
    // If line contains Vietnamese diacritics, it's likely CV content
    if (lang === "vi" && /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(t)) {
      break;
    }
    if (isReasoningLine(t)) {
      startIdx = i + 1;
    } else {
      break;
    }
  }

  const result = lines.slice(startIdx).join("\n").trim();

  // 4. Strip trailing reasoning/notes (model sometimes appends advice after content)
  //    Remove lines after the last bullet point or after a blank line followed by reasoning
  const resultLines = result.split("\n");
  let endIdx = resultLines.length;
  for (let i = resultLines.length - 1; i >= 0; i--) {
    const t = resultLines[i].trim();
    if (!t) { endIdx = i; continue; }
    // If trailing line looks like a note/advice, cut it
    if (/^(\*|note:|lưu ý:|chú thích:|tip:|→|=>|ps:|p\.s\.|remember|disclaimer)/i.test(t)) {
      endIdx = i;
      continue;
    }
    break;
  }

  return resultLines.slice(0, endIdx).join("\n").trim() || text;
}

// ── Similarity check ─────────────────────────────────────────
// Simple word-overlap ratio to detect when model just copied the input
function isTooSimilar(original: string, suggestion: string, threshold = 0.80): boolean {
  return calculateDiceSimilarity(original, suggestion) > threshold;
}

function resolvePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function resolveNonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallback;
}

const OLLAMA_REQUEST_TIMEOUT_MS = resolvePositiveInteger(process.env.OLLAMA_REQUEST_TIMEOUT_MS, 60000);
const OLLAMA_RETRY_MAX_RETRIES = resolveNonNegativeInteger(process.env.OLLAMA_RETRY_MAX_RETRIES, 1);
const OLLAMA_RETRY_BASE_DELAY_MS = resolvePositiveInteger(process.env.OLLAMA_RETRY_BASE_DELAY_MS, 900);
const OLLAMA_RETRY_MAX_DELAY_MS = resolvePositiveInteger(process.env.OLLAMA_RETRY_MAX_DELAY_MS, 1500);
const IS_CONTAINER_RUNTIME = existsSync("/.dockerenv");

// ── Build the system prompt ─────────────────────────────────
function buildSystemPrompt(lang: "vi" | "en", format: ContentFormat): string {
  const formatRuleVi =
    format === "list"
      ? `- Trả về danh sách bullet points (dùng dấu -).\n- Mỗi bullet point cần tập trung phô diễn kỹ năng và thành tựu đo lường được.\n- KHÔNG viết thành đoạn văn.`
      : format === "paragraph"
      ? `- Viết thành một đoạn văn liền mạch từ 5 đến 7 câu sắc sảo, phô diễn trọn vẹn sức mạnh năng lực cá nhân.\n- Không dùng gạch đầu dòng.`
      : `- Giữ dạng câu ngắn gọn, súc tích.\n- Trực diện vào vấn đề, không dài dòng.`;

  const formatRuleEn =
    format === "list"
      ? `- Return a bullet list (use - prefix).\n- Each bullet must showcase measurable achievements and strong skills.\n- Do NOT write as a paragraph.`
      : format === "paragraph"
      ? `- Write as a single flowing paragraph of 5-7 professional sentences demonstrating maximum capability.\n- No bullet points.`
      : `- Keep it concise and impactful.\n- Do NOT write a long paragraph.`;

  const additionalRulesVi = `
RANG BUOC BO SUNG (BAT BUOC):
- Giữ nguyên ý nghĩa nghiệp vụ cốt lõi của nội dung gốc.
- KHÔNG bịa thêm số liệu, thành tích, công nghệ hoặc vai trò không có trong dữ liệu gốc.
- Phải diễn đạt lại khác rõ rệt, không sao chép nguyên văn dài dòng từ nội dung gốc.
- Không thêm phần mở đầu/kết luận kiểu hội thoại.`;

  const additionalRulesEn = `
ADDITIONAL MANDATORY RULES:
- Preserve the original business meaning.
- DO NOT invent metrics, achievements, technologies, or responsibilities.
- Rewrite with meaningfully different wording; avoid near-verbatim copying.
- No conversational preface or trailing explanations.`;

  if (lang === "vi") {
    return `${CV_WRITER_SYSTEM_PROMPT_VI.replace("{FORMAT_RULE}", formatRuleVi)}\n${additionalRulesVi}`;
  }
  return `${CV_WRITER_SYSTEM_PROMPT_EN.replace("{FORMAT_RULE}", formatRuleEn)}\n${additionalRulesEn}`;
}

// ── Section-specific rewriting hints ────────────────────────
const SECTION_HINTS_VI: Record<string, string> = {
  summary: "Viết lại phần giới thiệu bản thân này thành đoạn văn chuyên nghiệp hơn, nêu bật giá trị cốt lõi và năng lực chính.",
  experience_list: "Viết lại mô tả công việc này: dùng động từ mạnh, thêm số liệu cụ thể, tập trung vào thành tựu thay vì liệt kê nhiệm vụ.",
  project_list: "Viết lại mô tả dự án này: làm rõ vai trò cá nhân, nêu kết quả đạt được, đề cập tech stack cụ thể.",
  award_list: "Viết lại mô tả giải thưởng này: nêu rõ ý nghĩa và giá trị của giải thưởng.",
};

const SECTION_HINTS_EN: Record<string, string> = {
  summary: "Rewrite this personal summary into a more professional paragraph highlighting core value and key capabilities.",
  experience_list: "Rewrite this job description: use strong action verbs, add specific metrics, focus on achievements not duties.",
  project_list: "Rewrite this project description: clarify individual role, state outcomes achieved, mention specific tech stack.",
  award_list: "Rewrite this award description: emphasize significance and impact of the award.",
};

// ── Build the user prompt ───────────────────────────────────
function buildUserPrompt(
  sectionType: string,
  fieldName: string,
  currentContent: string,
  lang: "vi" | "en",
  format: ContentFormat,
  context?: string
): string {
  const anchorVi =
    format === "list" ? "Viết lại hoàn toàn bằng tiếng Việt (KHÁC bản gốc):"
    : format === "paragraph" ? "Viết lại hoàn toàn thành đoạn văn tiếng Việt (KHÁC bản gốc):"
    : "Viết lại câu ngắn gọn bằng tiếng Việt (KHÁC bản gốc):";

  const anchorEn =
    format === "list" ? "Completely rewrite as bullet list (DIFFERENT from original):"
    : format === "paragraph" ? "Completely rewrite as paragraph (DIFFERENT from original):"
    : "Completely rewrite concisely (DIFFERENT from original):";

  const hint = lang === "vi"
    ? (SECTION_HINTS_VI[sectionType] || "Viết lại nội dung này chuyên nghiệp hơn.")
    : (SECTION_HINTS_EN[sectionType] || "Rewrite this content more professionally.");

  const normalizedFieldName = fieldName.trim() || "content";

  if (lang === "vi") {
    return `${hint}

Trường cần tối ưu: ${normalizedFieldName}
Ràng buộc:
- Không sao chép nguyên văn quá giống bản gốc.
- Không bịa dữ kiện mới.
- Nếu thiếu số liệu trong bản gốc, dùng diễn đạt định tính thay vì tự thêm số.

Nội dung gốc (KHÔNG được sao chép):
${currentContent.trim()}${context ? `\n\nBối cảnh: ${context}` : ""}

${anchorVi}`;
  }
  return `${hint}

Target field: ${normalizedFieldName}
Constraints:
- Do not copy near-verbatim from the original.
- Do not invent new facts.
- If there are no metrics in the input, keep impact qualitative instead of inventing numbers.

Original content (DO NOT copy):
${currentContent.trim()}${context ? `\n\nContext: ${context}` : ""}

${anchorEn}`;
}

const DEBUG_PREVIEW_MAX_CHARS = 1200;
const MODEL_OUTPUT_MIN_CHARS = 10;

function truncateForDebug(value: string, maxChars = DEBUG_PREVIEW_MAX_CHARS) {
  const text = value.trim();
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}...`;
}

interface OllamaCallResult {
  output: string;
  rawOutput: string;
  model: string;
  error: string | null;
  failure: OllamaCallFailure | null;
  endpoint: string;
  attempts: number;
  requestPreview: {
    baseUrl: string;
    model: string;
    temperature: number;
    prefill: string;
    systemPromptPreview: string;
    userPromptPreview: string;
  };
}

type OllamaFailureType = "timeout" | "unreachable" | "network" | "http" | "empty_output" | "unknown";

interface OllamaCallFailure {
  type: OllamaFailureType;
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
  endpoint: string;
  statusCode?: number;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function isLocalhostOllamaUrl(url: string) {
  return /^https?:\/\/(localhost|127(?:\.\d{1,3}){3})(:\d+)?\b/i.test(url);
}

function resolveLocalDockerHintMessage(endpoint: string) {
  if (IS_CONTAINER_RUNTIME && isLocalhostOllamaUrl(endpoint)) {
    return "Phát hiện app đang chạy trong container nhưng OLLAMA_BASE_URL đang trỏ localhost. Hãy đổi sang http://host.docker.internal:11434.";
  }

  return "Kiểm tra cấu hình URL giữa local và Docker (local: http://localhost:11434, Docker: http://host.docker.internal:11434).";
}

function summarizeUpstreamDetail(value: string, maxChars = 320) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars)}...`;
}

function waitFor(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRetryDelayMs(attempt: number) {
  const stepped = OLLAMA_RETRY_BASE_DELAY_MS + (attempt - 1) * 250;
  return Math.min(Math.max(stepped, 300), OLLAMA_RETRY_MAX_DELAY_MS);
}

function isRecoverableHttpStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function classifyOllamaHttpFailure(status: number, detail: string, endpoint: string): OllamaCallFailure {
  const snippet = summarizeUpstreamDetail(detail);
  const technicalMessage = snippet ? `HTTP ${status}: ${snippet}` : `HTTP ${status}`;
  const recoverable = isRecoverableHttpStatus(status);

  if (recoverable) {
    return {
      type: "http",
      recoverable: true,
      userMessage: `Ollama tạm thời không sẵn sàng (HTTP ${status}). Vui lòng thử lại.`,
      technicalMessage,
      statusCode: status,
      endpoint,
    };
  }

  return {
    type: "http",
    recoverable: false,
    userMessage: `Ollama trả về lỗi HTTP ${status}. Vui lòng kiểm tra cấu hình hoặc nội dung yêu cầu.`,
    technicalMessage,
    statusCode: status,
    endpoint,
  };
}

function classifyOllamaThrownFailure(err: unknown, endpoint: string): OllamaCallFailure {
  if (err instanceof UpstreamTimeoutError) {
    return {
      type: "timeout",
      recoverable: true,
      userMessage: "Ollama phản hồi quá chậm. Vui lòng thử lại.",
      technicalMessage: err.message,
      endpoint,
    };
  }

  const technicalMessage = err instanceof Error ? err.message : String(err);
  const normalized = technicalMessage.toLowerCase();

  if (/(econnrefused|enotfound|eai_again|getaddrinfo|connection refused|dns|invalid url|failed to parse url|no route to host)/i.test(normalized)) {
    return {
      type: "unreachable",
      recoverable: true,
      userMessage: `Không kết nối được tới Ollama. ${resolveLocalDockerHintMessage(endpoint)}`,
      technicalMessage,
      endpoint,
    };
  }

  if (/(fetch failed|network|socket hang up|connection reset|etimedout|timed out|temporarily unavailable|upstream unavailable)/i.test(normalized)) {
    return {
      type: "network",
      recoverable: true,
      userMessage: "Kết nối tới Ollama bị gián đoạn. Vui lòng thử lại.",
      technicalMessage,
      endpoint,
    };
  }

  return {
    type: "unknown",
    recoverable: false,
    userMessage: "Không thể nhận phản hồi từ Ollama. Vui lòng thử lại sau.",
    technicalMessage,
    endpoint,
  };
}

function createEmptyOutputFailure(endpoint: string): OllamaCallFailure {
  return {
    type: "empty_output",
    recoverable: false,
    userMessage: "AI không trả về nội dung hợp lệ.",
    technicalMessage: "Ollama returned empty message.content.",
    endpoint,
  };
}

function shouldRetryFailure(failure: OllamaCallFailure, attempt: number, maxAttempts: number) {
  return failure.recoverable && attempt < maxAttempts;
}

// ── Ollama caller ────────────────────────────────────────────
async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  prefill = "",
  temperature = 0.2
): Promise<OllamaCallResult> {
  const baseUrl = normalizeBaseUrl(process.env.OLLAMA_BASE_URL ?? "http://localhost:11434");
  const model   = process.env.OLLAMA_CV_SUGGEST_MODEL ?? "qwen3:4b";
  const endpoint = `${baseUrl}/api/chat`;
  const maxAttempts = OLLAMA_RETRY_MAX_RETRIES + 1;

  const requestPreview = {
    baseUrl,
    model,
    temperature,
    prefill,
    systemPromptPreview: truncateForDebug(systemPrompt, 500),
    userPromptPreview: truncateForDebug(userPrompt, 700),
  };

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt },
  ];
  // Assistant prefill forces the model to start output immediately, no English reasoning.
  // Ollama returns only the continuation — we must prepend the seed back ourselves.
  if (prefill) messages.push({ role: "assistant", content: prefill });

  if (IS_CONTAINER_RUNTIME && isLocalhostOllamaUrl(baseUrl)) {
    console.warn("[Ollama] OLLAMA_BASE_URL is localhost inside container runtime", {
      baseUrl,
      hint: "Use http://host.docker.internal:11434 for Docker setup.",
    });
  }

  let lastFailure: OllamaCallFailure | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { response } = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Connection: "keep-alive",
          },
          body: JSON.stringify({
            model,
            stream: false,
            options: {
              temperature,
              num_predict: 500, // Giới hạn độ dài để không viết quá dài
              top_p: 0.8,
              // Thêm Stop Sequences để AI dừng lại khi định nói nhảm
              stop: ["Okay", "Note:", "Lưu ý:", "Wait", "Hmm", "\n\n\n"],
            },
            messages,
          }),
        },
        {
          timeoutMs: OLLAMA_REQUEST_TIMEOUT_MS,
          timeoutMessage: `Ollama request timed out after ${OLLAMA_REQUEST_TIMEOUT_MS}ms.`,
        },
      );

      if (!response.ok) {
        const detail = await response.text();
        const failure = classifyOllamaHttpFailure(response.status, detail, endpoint);
        lastFailure = failure;

        if (shouldRetryFailure(failure, attempt, maxAttempts)) {
          const delayMs = resolveRetryDelayMs(attempt);
          console.warn("[Ollama] recoverable HTTP failure, scheduling retry", {
            endpoint,
            model,
            attempt,
            maxAttempts,
            statusCode: response.status,
            delayMs,
          });
          await waitFor(delayMs);
          continue;
        }

        const logger = failure.recoverable ? console.warn : console.error;
        logger("[Ollama] HTTP failure", {
          endpoint,
          model,
          attempt,
          maxAttempts,
          statusCode: response.status,
          error: failure.technicalMessage,
        });

        return {
          output: "",
          rawOutput: "",
          model,
          error: failure.technicalMessage,
          failure,
          endpoint,
          attempts: attempt,
          requestPreview,
        };
      }

      const body = await response.json();
      const content = (body?.message?.content ?? "").trim();
      const fullOutput = prefill ? prefill + content : content;

      if (!fullOutput.trim()) {
        const failure = createEmptyOutputFailure(endpoint);
        console.warn("[Ollama] empty output", {
          endpoint,
          model,
          attempt,
          maxAttempts,
        });

        return {
          output: "",
          rawOutput: "",
          model,
          error: failure.technicalMessage,
          failure,
          endpoint,
          attempts: attempt,
          requestPreview,
        };
      }

      if (attempt > 1) {
        console.info("[Ollama] recovered after retry", {
          endpoint,
          model,
          attempt,
          maxAttempts,
        });
      }

      return {
        output: fullOutput,
        rawOutput: fullOutput,
        model,
        error: null,
        failure: null,
        endpoint,
        attempts: attempt,
        requestPreview,
      };
    } catch (err) {
      const failure = classifyOllamaThrownFailure(err, endpoint);
      lastFailure = failure;

      if (shouldRetryFailure(failure, attempt, maxAttempts)) {
        const delayMs = resolveRetryDelayMs(attempt);
        console.warn("[Ollama] recoverable call failure, scheduling retry", {
          endpoint,
          model,
          attempt,
          maxAttempts,
          type: failure.type,
          error: failure.technicalMessage,
          delayMs,
        });
        await waitFor(delayMs);
        continue;
      }

      const logger = failure.recoverable ? console.warn : console.error;
      logger("[Ollama] call failed", {
        endpoint,
        model,
        attempt,
        maxAttempts,
        type: failure.type,
        error: failure.technicalMessage,
      });

      return {
        output: "",
        rawOutput: "",
        model,
        error: failure.technicalMessage,
        failure,
        endpoint,
        attempts: attempt,
        requestPreview,
      };
    }
  }

  const fallbackFailure: OllamaCallFailure = lastFailure ?? {
    type: "unknown",
    recoverable: false,
    userMessage: "Không thể nhận phản hồi từ Ollama. Vui lòng thử lại sau.",
    technicalMessage: "Unknown Ollama failure.",
    endpoint,
  };

  return {
    output: "",
    rawOutput: "",
    model,
    error: fallbackFailure.technicalMessage,
    failure: fallbackFailure,
    endpoint,
    attempts: maxAttempts,
    requestPreview,
  };
}

// ════════════════════════════════════════════════════════════
// Public Server Action – CV content optimization
// ════════════════════════════════════════════════════════════

export interface OptimizeDebugInfo {
  traceId: string;
  model: string;
  language: "vi" | "en";
  format: ContentFormat;
  similarityScore: number;
  retriedBecauseSimilar: boolean;
  usedRetryResult: boolean;
  firstAttemptRawPreview: string;
  finalAttemptRawPreview: string;
  systemPromptPreview: string;
  userPromptPreview: string;
  failureReason?: string;
  ollamaErrorType?: OllamaFailureType;
  ollamaEndpoint?: string;
  ollamaAttempts?: number;
}

export interface OptimizeResult {
  success: boolean;
  suggestion?: string;    // the rewritten content — apply this to CV
  explanation?: string;   // what was improved / removed
  suggestions?: string;   // additional info that could strengthen the content
  error?: string;
  provider?: string;
  debug?: OptimizeDebugInfo;
}

export async function optimizeCVContent(
  sectionType: string,
  fieldName: string,
  currentContent: string,
  context?: string
): Promise<OptimizeResult> {
  if (!currentContent?.trim()) {
    return { success: false, error: "Nội dung trống. Hãy nhập nội dung trước khi tối ưu." };
  }

  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const includeDebug = process.env.NODE_ENV !== "production" || process.env.AI_INCLUDE_DEBUG === "1";

  const lang = detectLanguage(currentContent);
  const format = detectFormat(currentContent);
  const systemPrompt = buildSystemPrompt(lang, format);
  const userPrompt = buildUserPrompt(sectionType, fieldName, currentContent, lang, format, context);
  // Prefill forces the model past reasoning and into output immediately
  const prefill = format === "list" ? "- " : "";

  // First attempt with normal temperature
  const firstAttempt = await callOllama(systemPrompt, userPrompt, prefill, 0.7);

  if (includeDebug) {
    console.info(`[AI optimize][${traceId}] first attempt`, {
      model: firstAttempt.model,
      request: firstAttempt.requestPreview,
      attempts: firstAttempt.attempts,
      failureType: firstAttempt.failure?.type,
      error: firstAttempt.error,
      rawOutputPreview: truncateForDebug(firstAttempt.rawOutput),
    });
  }

  if (!firstAttempt.output) {
    const model = process.env.OLLAMA_CV_SUGGEST_MODEL ?? "qwen3:4b";
    const failure = firstAttempt.failure;
    const baseError = firstAttempt.error || "Ollama không phản hồi.";
    const userMessage = failure?.userMessage || "Ollama không phản hồi. Vui lòng thử lại.";

    return {
      success: false,
      error: userMessage,
      provider: `ollama/${model}`,
      debug: includeDebug
        ? {
            traceId,
            model,
            language: lang,
            format,
            similarityScore: 0,
            retriedBecauseSimilar: false,
            usedRetryResult: false,
            firstAttemptRawPreview: "",
            finalAttemptRawPreview: "",
            systemPromptPreview: truncateForDebug(systemPrompt, 500),
            userPromptPreview: truncateForDebug(userPrompt, 700),
            failureReason: failure?.technicalMessage || baseError,
            ollamaErrorType: failure?.type,
            ollamaEndpoint: firstAttempt.endpoint,
            ollamaAttempts: firstAttempt.attempts,
          }
        : undefined,
    };
  }

  // Extract the actual output, stripping any model reasoning preamble
  let finalRaw = firstAttempt.rawOutput;
  let output = extractOutput(finalRaw, lang);
  let similarityScore = calculateDiceSimilarity(currentContent, output);

  let retriedBecauseSimilar = false;
  let usedRetryResult = false;

  // If output is too similar to input, retry once with stronger anti-copy constraints
  if (output.length > MODEL_OUTPUT_MIN_CHARS && isTooSimilar(currentContent, output, 0.74)) {
    retriedBecauseSimilar = true;

    const antiCopyAddon = lang === "vi"
      ? "Yêu cầu bổ sung: Phải viết lại khác rõ rệt bản gốc. Không sao chép cụm từ dài từ nội dung gốc."
      : "Additional requirement: Rewrite with clearly different wording. Avoid long phrase overlap from the source.";

    const retryPrompt = `${userPrompt}\n\n${antiCopyAddon}`;
    const retryAttempt = await callOllama(systemPrompt, retryPrompt, prefill, 0.95);

    if (includeDebug) {
      console.info(`[AI optimize][${traceId}] retry attempt`, {
        model: retryAttempt.model,
        request: retryAttempt.requestPreview,
        error: retryAttempt.error,
        rawOutputPreview: truncateForDebug(retryAttempt.rawOutput),
      });
    }

    if (retryAttempt.output) {
      const retryOutput = extractOutput(retryAttempt.output, lang);
      const retrySimilarity = calculateDiceSimilarity(currentContent, retryOutput);

      if (retryOutput.length > MODEL_OUTPUT_MIN_CHARS && retrySimilarity < similarityScore) {
        output = retryOutput;
        similarityScore = retrySimilarity;
        finalRaw = retryAttempt.rawOutput;
        usedRetryResult = true;
      }
    }
  }

  const model = process.env.OLLAMA_CV_SUGGEST_MODEL ?? firstAttempt.model ?? "qwen3:4b";
  const provider = `ollama/${model}`;
  const looksCopied = isTooSimilar(currentContent, output, 0.90);

  if (output.length > MODEL_OUTPUT_MIN_CHARS && !looksCopied) {
    if (includeDebug) {
      console.info(`[AI optimize][${traceId}] success`, {
        provider,
        similarityScore,
        retriedBecauseSimilar,
        usedRetryResult,
        outputPreview: truncateForDebug(output),
      });
    }

    return {
      success: true,
      suggestion: output,
      provider,
      debug: includeDebug
        ? {
            traceId,
            model,
            language: lang,
            format,
            similarityScore,
            retriedBecauseSimilar,
            usedRetryResult,
            firstAttemptRawPreview: truncateForDebug(firstAttempt.rawOutput),
            finalAttemptRawPreview: truncateForDebug(finalRaw),
            systemPromptPreview: truncateForDebug(systemPrompt, 500),
            userPromptPreview: truncateForDebug(userPrompt, 700),
            ollamaEndpoint: firstAttempt.endpoint,
            ollamaAttempts: firstAttempt.attempts,
          }
        : undefined,
    };
  }

  const failureReason = looksCopied
    ? "Kết quả AI quá giống nội dung gốc nên bị từ chối."
    : "Không thể trích xuất nội dung hợp lệ từ phản hồi AI.";

  if (includeDebug) {
    console.warn(`[AI optimize][${traceId}] failure`, {
      provider,
      similarityScore,
      retriedBecauseSimilar,
      usedRetryResult,
      outputPreview: truncateForDebug(output),
      failureReason,
    });
  }

  return {
    success: false,
    error: `AI suggestion không khả dụng: ${failureReason}`,
    provider,
    debug: includeDebug
      ? {
          traceId,
          model,
          language: lang,
          format,
          similarityScore,
          retriedBecauseSimilar,
          usedRetryResult,
          firstAttemptRawPreview: truncateForDebug(firstAttempt.rawOutput),
          finalAttemptRawPreview: truncateForDebug(finalRaw),
          systemPromptPreview: truncateForDebug(systemPrompt, 500),
          userPromptPreview: truncateForDebug(userPrompt, 700),
          failureReason,
          ollamaEndpoint: firstAttempt.endpoint,
          ollamaAttempts: firstAttempt.attempts,
        }
      : undefined,
  };
}


// ════════════════════════════════════════════════════════════
// Public Server Action – Company suggestions (qwen3:4b)
// ════════════════════════════════════════════════════════════

export interface CompanySuggestResult {
  success: boolean;
  companies?: Array<{ name: string; reason: string; website?: string }>;
  error?: string;
}

export async function suggestCompanies(
  cvText: string,
  preferredLocation?: string
): Promise<CompanySuggestResult> {
  if (!cvText?.trim()) {
    return { success: false, error: "CV trống." };
  }

  const lang = detectLanguage(cvText);

  const systemPrompt = lang === "vi"
    ? `Bạn là career advisor giàu kinh nghiệm tại Việt Nam. Trả lời HOÀN TOÀN bằng tiếng Việt.
Nhiệm vụ: Phân tích CV và gợi ý 5 công ty phù hợp dựa trên kỹ năng và kinh nghiệm.
Trả về JSON thuần (không markdown), format:
[{ "name": "Tên công ty", "reason": "Lý do phù hợp (1-2 câu tiếng Việt)", "website": "url nếu biết" }]`
    : `You are an experienced career advisor. Reply ENTIRELY in English.
Task: Analyze the CV and suggest 5 matching companies based on skills and experience.
Return pure JSON (no markdown), format:
[{ "name": "Company name", "reason": "Why it's a good fit (1-2 sentences)", "website": "url if known" }]`;

  const locationLine = preferredLocation
    ? (lang === "vi" ? `\nKhu vực mong muốn: ${preferredLocation}` : `\nPreferred location: ${preferredLocation}`)
    : "";

  const userPrompt = lang === "vi"
    ? `CV:\n"""\n${cvText.slice(0, 2000)}\n"""${locationLine}\nGợi ý 5 công ty phù hợp nhất, trả về JSON:`
    : `CV:\n"""\n${cvText.slice(0, 2000)}\n"""${locationLine}\nSuggest 5 best-matching companies, return JSON:`;

  const ollamaResult = await callOllama(systemPrompt, userPrompt);
  const raw = ollamaResult.output.trim();

  if (!raw) {
    return {
      success: false,
      error:
        ollamaResult.failure?.userMessage
        || ollamaResult.error
        || "Ollama không phản hồi. Kiểm tra 'ollama serve' và 'ollama pull qwen3:4b'.",
    };
  }

  try {
    const cleaned = raw.replace(/^```[\w]*\n?/m, "").replace(/```$/m, "").trim();
    const companies = JSON.parse(cleaned);
    return { success: true, companies };
  } catch {
    return { success: true, companies: [{ name: "Rà soát thủ công", reason: raw }] };
  }
}
