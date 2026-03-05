"use server";

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
  const normalize = (s: string) =>
    s.replace(/<[^>]*>/g, "").replace(/[\s\n\r]+/g, " ").trim().toLowerCase();

  const a = normalize(original);
  const b = normalize(suggestion);

  if (!a || !b) return false;

  // Character-level overlap (Sørensen–Dice on bigrams)
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ba = bigrams(a);
  const bb = bigrams(b);
  let overlap = 0;
  ba.forEach(g => { if (bb.has(g)) overlap++; });
  const dice = (2 * overlap) / (ba.size + bb.size);

  return dice > threshold;
}

import { CV_WRITER_SYSTEM_PROMPT_VI, CV_WRITER_SYSTEM_PROMPT_EN } from "./ai-config";

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

  if (lang === "vi") {
    return CV_WRITER_SYSTEM_PROMPT_VI.replace("{FORMAT_RULE}", formatRuleVi);
  }
  return CV_WRITER_SYSTEM_PROMPT_EN.replace("{FORMAT_RULE}", formatRuleEn);
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

  if (lang === "vi") {
    return `${hint}\n\nNội dung gốc (KHÔNG được sao chép):\n${currentContent.trim()}${context ? `\n\nBối cảnh: ${context}` : ""}\n\n${anchorVi}`;
  }
  return `${hint}\n\nOriginal content (DO NOT copy):\n${currentContent.trim()}${context ? `\n\nContext: ${context}` : ""}\n\n${anchorEn}`;
}

// ── Ollama caller ────────────────────────────────────────────
async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  prefill = "",
  temperature = 0.2
): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model   = process.env.OLLAMA_CV_SUGGEST_MODEL ?? "qwen3:4b";

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt },
  ];
  // Assistant prefill forces the model to start output immediately, no English reasoning.
  // Ollama returns only the continuation — we must prepend the seed back ourselves.
  if (prefill) messages.push({ role: "assistant", content: prefill });

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: { 
          temperature: 0.2, // Quan trọng: Giảm sáng tạo thừa
          num_predict: 500,  // Giới hạn độ dài để không viết quá dài
          top_p: 0.5,
          // Thêm Stop Sequences để AI dừng lại khi định nói nhảm
          stop: ["Okay", "Note:", "Lưu ý:", "Wait", "Hmm", "\n\n\n"] 
        },
        messages,
      }),
    });

    if (!res.ok) {
      console.error(`[Ollama] HTTP ${res.status}:`, await res.text());
      return "";
    }

    const body = await res.json();
    const content = (body?.message?.content ?? "").trim();
    // Prepend the prefill seed back (Ollama strips it from the response)
    return prefill ? prefill + content : content;
  } catch (err) {
    console.error("[Ollama] call failed:", err);
    return "";
  }
}

// ════════════════════════════════════════════════════════════
// Public Server Action – CV content optimization
// ════════════════════════════════════════════════════════════

export interface OptimizeResult {
  success: boolean;
  suggestion?: string;    // the rewritten content — apply this to CV
  explanation?: string;   // what was improved / removed
  suggestions?: string;   // additional info that could strengthen the content
  error?: string;
  provider?: string;
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

  const lang   = detectLanguage(currentContent);
  const format  = detectFormat(currentContent);
  const systemPrompt = buildSystemPrompt(lang, format);
  const userPrompt   = buildUserPrompt(sectionType, fieldName, currentContent, lang, format, context);
  // Prefill forces the model past reasoning and into output immediately
  const prefill = format === "list" ? "- " : "";

  // First attempt with normal temperature
  let raw = await callOllama(systemPrompt, userPrompt, prefill, 0.7);
  if (!raw) {
    return {
      success: false,
      error: "Ollama không phản hồi. Đảm bảo Ollama đang chạy và model '" +
        (process.env.OLLAMA_CV_SUGGEST_MODEL ?? "qwen3:4b") +
        "' đã được pull.",
    };
  }

  // Extract the actual output, stripping any model reasoning preamble
  let output = extractOutput(raw, lang);

  // If output is too similar to input, retry once with higher temperature
  if (output.length > 10 && isTooSimilar(currentContent, output)) {
    console.log("[AI] Suggestion too similar to original, retrying with higher temperature...");
    raw = await callOllama(systemPrompt, userPrompt, prefill, 0.9);
    if (raw) {
      const retryOutput = extractOutput(raw, lang);
      if (retryOutput.length > 10) {
        output = retryOutput;
      }
    }
  }

  if (output.length > 10) {
    const model = process.env.OLLAMA_CV_SUGGEST_MODEL ?? "qwen3:4b";
    return {
      success: true,
      suggestion: output,
      provider: `ollama/${model}`,
    };
  }

  return {
    success: false,
    error: "Không thể tối ưu nội dung. Vui lòng thử lại.",
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

  const raw = await callOllama(systemPrompt, userPrompt);
  if (!raw) {
    return {
      success: false,
      error: "Ollama không phản hồi. Kiểm tra 'ollama serve' và 'ollama pull qwen3:4b'.",
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
