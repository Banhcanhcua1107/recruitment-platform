import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/optimize-content
 * Body: { sectionType: string, fieldName: string, currentContent: string, context?: string }
 * Returns: { suggestion: string }
 *
 * Strategy: Try Gemini first → fallback to Groq (Llama) if quota exceeded.
 */

// ── Groq fallback ───────────────────────────────────────────
async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Groq API error:", res.status, err);
    return "";
  }

  const body = await res.json();
  return body?.choices?.[0]?.message?.content?.trim() ?? "";
}

// ── Gemini call ─────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const models = (process.env.GEMINI_MODEL || "gemini-2.0-flash,gemini-2.0-flash-lite").split(",");
  const MAX_RETRIES = 1;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
        }),
      });

      if (res.status === 429) {
        console.warn(`Gemini 429 on ${model.trim()} (attempt ${attempt + 1})`);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        break;
      }

      if (!res.ok) break;

      const body = await res.json();
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (text) return text;
    }
  }

  return ""; // All Gemini models failed
}

export async function POST(req: NextRequest) {
  try {
    const { sectionType, fieldName, currentContent, context } = await req.json();

    if (!currentContent || !currentContent.trim()) {
      return NextResponse.json(
        { error: "Nội dung trống. Hãy nhập nội dung trước khi tối ưu." },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    if (!geminiKey && !groqKey) {
      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 500 }
      );
    }

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

    const sectionLabel = SECTION_VN[sectionType] || sectionType;

    const prompt = `Bạn là một chuyên gia viết CV với 10+ năm kinh nghiệm tuyển dụng.

Nhiệm vụ: Tối ưu nội dung CV cho phần "${sectionLabel}" (trường: ${fieldName}).

NỘI DUNG HIỆN TẠI:
"""
${currentContent}
"""

${context ? `THÔNG TIN BỔ SUNG:\n${context}\n` : ""}

Yêu cầu:
1. Giữ nguyên ý nghĩa gốc nhưng viết lại cho chuyên nghiệp, mạnh mẽ hơn
2. Dùng động từ hành động mạnh (Xây dựng, Triển khai, Tối ưu, Dẫn dắt...)
3. Thêm số liệu cụ thể nếu có thể (ví dụ: "tăng 30%", "phục vụ 10k users")
4. Viết bằng tiếng Việt, trừ thuật ngữ kỹ thuật
5. Giữ format phù hợp (dùng gạch đầu dòng "- " nếu nội dung gốc dùng bullet points)
6. Không thêm thông tin sai, chỉ cải thiện cách diễn đạt
7. Output CHỈ là nội dung đã tối ưu, KHÔNG giải thích hay thêm gì khác

NỘI DUNG TỐI ƯU:`;

    // Strategy: Gemini first → Groq fallback
    let suggestion = await callGemini(prompt);
    let provider = "gemini";

    if (!suggestion) {
      console.log("Gemini failed, falling back to Groq...");
      suggestion = await callGroq(prompt);
      provider = "groq";
    }

    if (!suggestion) {
      return NextResponse.json(
        { error: "AI đang quá tải. Vui lòng thử lại sau." },
        { status: 429 }
      );
    }

    console.log(`AI optimize success via ${provider}`);
    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error("Optimize content error:", err);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
