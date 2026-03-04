"use server";

import { HfInference } from "@huggingface/inference";

// ── Section labels ──────────────────────────────────────────
const SECTION_VN: Record<string, string> = {
  header: "Thông tin cá nhân",
  personal_info: "Liên hệ",
  summary: "Giới thiệu bản thân / Tổng quan",
  experience_list: "Kinh nghiệm làm việc",
  education_list: "Học vấn",
  skill_list: "Kỹ năng",
  project_list: "Dự án",
  award_list: "Giải thưởng",
  certificate_list: "Chứng chỉ",
};

// ── Build the system prompt ─────────────────────────────────
function buildSystemPrompt(): string {
  return `Bạn là một Career Coach và Resume Expert chuyên nghiệp với 15+ năm kinh nghiệm tuyển dụng tại các tập đoàn lớn.

Phong cách viết CV của bạn:
- Dùng Action Verbs mạnh: Xây dựng, Triển khai, Tối ưu hóa, Dẫn dắt, Thiết kế, Phát triển, Quản lý, Điều phối...
- Tập trung vào KẾT QUẢ và THÀNH TÍCH, không chỉ liệt kê nhiệm vụ
- Thêm số liệu cụ thể khi có thể (ví dụ: "tăng hiệu suất 40%", "phục vụ 50,000+ users")
- Viết chuyên nghiệp bằng tiếng Việt, giữ nguyên thuật ngữ kỹ thuật bằng tiếng Anh
- Giữ format phù hợp (bullet points "- " nếu nội dung gốc dùng)
- KHÔNG bịa đặt thông tin, chỉ cải thiện cách diễn đạt
- Output CHỈ là nội dung đã tối ưu, KHÔNG giải thích, KHÔNG thêm prefix/suffix`;
}

// ── Build the user prompt ───────────────────────────────────
function buildUserPrompt(
  sectionType: string,
  fieldName: string,
  currentContent: string,
  context?: string
): string {
  const sectionLabel = SECTION_VN[sectionType] || sectionType;

  return `Tối ưu nội dung CV cho phần "${sectionLabel}" (trường: ${fieldName}).

NỘI DUNG HIỆN TẠI:
"""
${currentContent}
"""
${context ? `\nBỐI CẢNH BỔ SUNG:\n${context}\n` : ""}
Viết lại nội dung trên cho chuyên nghiệp, mạnh mẽ và ấn tượng hơn:`;
}

// ── HuggingFace call ────────────────────────────────────────
async function callHuggingFace(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.HUGGING_FACE_API_KEY;
  if (!apiKey || apiKey === "your_hf_api_key_here") return "";

  try {
    const hf = new HfInference(apiKey);

    let result = "";
    for await (const chunk of hf.chatCompletionStream({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2048,
      top_p: 0.9,
    })) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) result += delta;
    }

    return result.trim();
  } catch (err) {
    console.error("HuggingFace API error:", err);
    return "";
  }
}

// ── Groq fallback (OpenAI-compatible) ───────────────────────
async function callGroq(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      console.error("Groq error:", res.status, await res.text());
      return "";
    }

    const body = await res.json();
    return body?.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("Groq fallback error:", err);
    return "";
  }
}

// ── Gemini fallback ─────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const models = (process.env.GEMINI_MODEL || "gemini-2.0-flash,gemini-2.0-flash-lite").split(",");

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
        }),
      });

      if (res.status === 429) continue; // Skip to next model
      if (!res.ok) continue;

      const body = await res.json();
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (text) return text;
    } catch {
      continue;
    }
  }

  return "";
}

// ════════════════════════════════════════════════════════════
// Public Server Action
// ════════════════════════════════════════════════════════════

export interface OptimizeResult {
  success: boolean;
  suggestion?: string;
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

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(sectionType, fieldName, currentContent, context);
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  // Strategy: HuggingFace (Qwen) → Groq (Llama) → Gemini
  // 1. Try HuggingFace first
  let suggestion = await callHuggingFace(systemPrompt, userPrompt);
  if (suggestion) {
    return { success: true, suggestion, provider: "huggingface" };
  }

  // 2. Fallback to Groq
  suggestion = await callGroq(systemPrompt, userPrompt);
  if (suggestion) {
    return { success: true, suggestion, provider: "groq" };
  }

  // 3. Last resort: Gemini
  suggestion = await callGemini(fullPrompt);
  if (suggestion) {
    return { success: true, suggestion, provider: "gemini" };
  }

  return {
    success: false,
    error: "Tất cả AI providers đều không khả dụng. Vui lòng thử lại sau.",
  };
}
