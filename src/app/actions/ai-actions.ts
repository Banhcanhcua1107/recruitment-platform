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
// qwen3:4b reasons in English even for Vietnamese tasks.
// The actual Vietnamese output is always the LAST block of text with VI diacritics.
function extractOutput(raw: string, lang: "vi" | "en"): string {
  // 1. Strip properly matched <think>...</think> blocks
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // 2. If an orphaned </think> remains (model started reasoning without <think> opener),
  //    everything before it is reasoning — take only what comes after it.
  const closeThinkIdx = text.lastIndexOf("</think>");
  if (closeThinkIdx !== -1) {
    text = text.slice(closeThinkIdx + "</think>".length);
  }

  // 3. Strip markdown code fences
  text = text.replace(/```[\w]*\n?/g, "").replace(/```/g, "").trim();

  if (!text) return "";

  const hasViDiacritics = (s: string) =>
    /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(s);

  const isReasoningLine = (line: string): boolean =>
    /^(okay|ok[,.\s]|let'?s|let me|first[,.\s]|so[,.\s]|now[,.\s]|wait[,.\s]|i need|i'll|i will|i have|i should|the user|the original|looking at|based on|note:|here'?s|alright|this means|for example|original:|rewritten:|draft:|attempt:|output:|result:|improved:|step\s*\d)/i
      .test(line.trim());

  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  if (lang === "vi") {
    // Find the LAST contiguous run of paragraphs that contain VI diacritics.
    let lastVi = paragraphs.length - 1;
    while (lastVi >= 0 && !hasViDiacritics(paragraphs[lastVi])) lastVi--;

    if (lastVi >= 0) {
      let firstVi = lastVi;
      while (firstVi > 0 && hasViDiacritics(paragraphs[firstVi - 1])) firstVi--;
      const output = paragraphs.slice(firstVi, lastVi + 1).join("\n\n");
      if (output.length > 10) return output;
    }

    // Fallback: strip leading English reasoning lines
    const lines = text.split("\n");
    let start = 0;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { start = i + 1; continue; }
      if (isReasoningLine(t)) { start = i + 1; } else { break; }
    }
    return lines.slice(start).join("\n").trim() || text;
  }

  // English: remove leading reasoning paragraphs
  let startIdx = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    if (isReasoningLine(paragraphs[i].split("\n")[0])) {
      startIdx = i + 1;
    } else {
      break;
    }
  }
  return paragraphs.slice(startIdx).join("\n\n").trim() || text;
}

// ── Build the system prompt ─────────────────────────────────
function buildSystemPrompt(lang: "vi" | "en", format: ContentFormat): string {
  const formatRuleVi =
    format === "list"
      ? `- Trả về danh sách bullet points (dùng dấu -).\n- Mỗi bullet ngắn gọn, súc tích, thể hiện năng lực thực tế.\n- Không viết thành đoạn văn.`
      : format === "paragraph"
      ? `- Viết thành một đoạn văn liền mạch từ 5 đến 7 câu chuyên nghiệp.\n- Không dùng bullet points.\n- Tránh liệt kê kỹ năng kiểu danh sách tẽ.`
      : `- Giữ dạng câu ngắn gọn.\n- Không viết thành đoạn văn dài.\n- Không dùng bullet points.`;

  const formatRuleEn =
    format === "list"
      ? `- Return a bullet list (use - prefix).\n- Each bullet must be concise and capability-focused.\n- Do NOT write as a paragraph.`
      : format === "paragraph"
      ? `- Write as a single flowing paragraph of 5-7 professional sentences.\n- No bullet points.\n- Avoid repetitive skill listing.`
      : `- Keep it as short sentence(s).\n- Do NOT write a long paragraph.\n- No bullet points.`;

  const outputInstructionVi =
    format === "list"
      ? `VIẾT NGAY DANH SÁCH KẾT QUẢ. KHÔNG viết bất kỳ thứ gì khác.`
      : format === "paragraph"
      ? `VIẾT NGAY ĐOẠN VĂN KẾT QUẢ. KHÔNG viết bất kỳ thứ gì khác.`
      : `VIẾT NGAY CÂU KẾT QUẢ. KHÔNG viết bất kỳ thứ gì khác.`;

  const outputInstructionEn =
    format === "list"
      ? `OUTPUT THE IMPROVED BULLET LIST DIRECTLY. NOTHING ELSE.`
      : format === "paragraph"
      ? `OUTPUT THE REWRITTEN PARAGRAPH DIRECTLY. NOTHING ELSE.`
      : `OUTPUT THE IMPROVED TEXT DIRECTLY. NOTHING ELSE.`;

  if (lang === "vi") {
    return `Bạn là trợ lý tối ưu CV chuyên nghiệp.

Nhiệm vụ: Cải thiện và nâng tầm nội dung bên dưới.

GIỚI HẠN NGHIÊM NGẶT:
- Không bịa thành tích giả.
- Không thêm công nghệ không có trong nội dung.
- Giữ ngôn ngữ tiếng Việt.
- Không xuất phân tích hay giải thích.

QUY TẮC NÂNG TẦM:
- Được phép cấu trúc lại và tăng cường ngôn từ cho mạnh hơn.
- Được phép kết hợp logic các kỹ năng thành câu khẳng định năng lực mạnh mẽ hơn.
- Được phép nhấn mạnh khả năng giải quyết vấn đề và kinh nghiệm thực tiễn dựa trên các công nghệ đã liệt kê.
- Tập trung vào giá trị và tác động, không chỉ liệt kê kỹ năng.
- Thể hiện sự tự tin và tạo ấn tượng mạnh.
${formatRuleVi}
- Không bình luận.
- Không thêm văn bản thừa.

${outputInstructionVi}`;
  }
  return `You are a professional CV optimization assistant.

Your task is to improve and elevate the content below.

STRICT LIMITS:
- Do not invent fake achievements.
- Do not add technologies that are not mentioned.
- Keep the language in English.
- Do not output analysis or explanation.

ENHANCEMENT RULES:
- You may restructure and enhance wording to make it stronger.
- You may logically combine skills into stronger capability statements.
- You may emphasize problem-solving ability and practical experience based on listed technologies.
- Focus on value and impact, not simple skill listing.
- Make it sound confident and impactful.
${formatRuleEn}
- No commentary.
- No extra text.

${outputInstructionEn}`;
}

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
    format === "list" ? "Chỉ viết danh sách kết quả tiếng Việt:"
    : format === "paragraph" ? "Chỉ viết đoạn văn kết quả tiếng Việt:"
    : "Chỉ viết câu kết quả tiếng Việt:";

  const anchorEn =
    format === "list" ? "Improved bullet list:"
    : format === "paragraph" ? "Improved paragraph:"
    : "Improved text:";

  if (lang === "vi") {
    return `Nội dung:
${currentContent.trim()}${context ? `\n\nBối cảnh: ${context}` : ""}\n\n${anchorVi}`;
  }
  return `Content:
${currentContent.trim()}${context ? `\n\nContext: ${context}` : ""}\n\n${anchorEn}`;
}

// ── Ollama caller ────────────────────────────────────────────
async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  prefill = ""
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
        think: false,
        options: { temperature: 0.5, num_predict: 2000, top_p: 0.9 },
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

  const raw = await callOllama(systemPrompt, userPrompt, prefill);
  if (!raw) {
    return {
      success: false,
      error: "Ollama không phản hồi. Đảm bảo Ollama đang chạy và model '" +
        (process.env.OLLAMA_CV_SUGGEST_MODEL ?? "qwen3:4b") +
        "' đã được pull.",
    };
  }

  // Extract the actual output, stripping any model reasoning preamble
  const output = extractOutput(raw, lang);

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
