import { NextRequest, NextResponse } from "next/server";
import {
  buildServerTimingHeader,
  fetchWithTimeout,
  type ServerTimingMetric,
  UpstreamTimeoutError,
} from "@/lib/upstream-http";

export const dynamic = "force-dynamic";

const GEMINI_TIMEOUT_MS = Number.parseInt(process.env.GEMINI_TIMEOUT_MS || "12000", 10);
const GROQ_TIMEOUT_MS = Number.parseInt(process.env.GROQ_TIMEOUT_MS || "15000", 10);
const GEMINI_RETRY_DELAY_MS = Number.parseInt(process.env.GEMINI_RETRY_DELAY_MS || "1500", 10);
const MAX_GEMINI_RETRIES = 1;

type ProviderResult = {
  text: string;
  metrics: ServerTimingMetric[];
};

function jsonWithTimings(
  body: Record<string, unknown>,
  init: { status?: number } = {},
  metrics: ServerTimingMetric[] = [],
) {
  const headers = new Headers();
  const serverTiming = buildServerTimingHeader(metrics);
  if (serverTiming) {
    headers.set("Server-Timing", serverTiming);
  }

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

async function callGroq(prompt: string): Promise<ProviderResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { text: "", metrics: [] };
  }

  try {
    const { response, durationMs } = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Connection: "keep-alive",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 2048,
        }),
      },
      {
        timeoutMs: GROQ_TIMEOUT_MS,
        timeoutMessage: `Groq request timed out after ${GROQ_TIMEOUT_MS}ms.`,
      },
    );

    const metrics = [{ name: "groq", dur: durationMs, desc: "Groq completion" }];
    if (!response.ok) {
      console.error("Groq API error:", response.status, await response.text());
      return { text: "", metrics };
    }

    const body = await response.json();
    return {
      text: body?.choices?.[0]?.message?.content?.trim() ?? "",
      metrics,
    };
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) {
      return {
        text: "",
        metrics: [{ name: "groq", dur: GROQ_TIMEOUT_MS, desc: "Groq timeout" }],
      };
    }

    console.error("Groq API error:", error);
    return { text: "", metrics: [] };
  }
}

async function callGemini(prompt: string): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { text: "", metrics: [] };
  }

  const metrics: ServerTimingMetric[] = [];
  const models = (process.env.GEMINI_MODEL || "gemini-2.0-flash,gemini-2.0-flash-lite")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt += 1) {
      try {
        const { response, durationMs } = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Connection: "keep-alive",
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
            }),
          },
          {
            timeoutMs: GEMINI_TIMEOUT_MS,
            timeoutMessage: `Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms.`,
          },
        );

        metrics.push({
          name: "gemini",
          dur: durationMs,
          desc: `${model} attempt ${attempt + 1}`,
        });

        if (response.status === 429) {
          if (attempt < MAX_GEMINI_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
            continue;
          }
          break;
        }

        if (!response.ok) {
          break;
        }

        const body = await response.json();
        const text = body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        if (text) {
          return { text, metrics };
        }
      } catch (error) {
        if (error instanceof UpstreamTimeoutError) {
          metrics.push({
            name: "gemini",
            dur: GEMINI_TIMEOUT_MS,
            desc: `${model} timeout`,
          });
          break;
        }

        console.error("Gemini API error:", error);
        break;
      }
    }
  }

  return { text: "", metrics };
}

export async function POST(req: NextRequest) {
  try {
    const { sectionType, fieldName, currentContent, context } = await req.json();

    if (!currentContent || !currentContent.trim()) {
      return jsonWithTimings(
        { error: "Noi dung trong. Hay nhap noi dung truoc khi toi uu." },
        { status: 400 },
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    if (!geminiKey && !groqKey) {
      return jsonWithTimings({ error: "AI service is not configured." }, { status: 500 });
    }

    const SECTION_VN: Record<string, string> = {
      header: "Thong tin ca nhan",
      personal_info: "Lien he",
      summary: "Gioi thieu ban than / Tong quan",
      experience_list: "Kinh nghiem lam viec",
      education_list: "Hoc van",
      skill_list: "Ky nang",
      project_list: "Du an",
      award_list: "Giai thuong",
      certificate_list: "Chung chi",
    };

    const sectionLabel = SECTION_VN[sectionType] || sectionType;

    const prompt = `Ban la mot chuyen gia viet CV voi 10+ nam kinh nghiem tuyen dung.

Nhiem vu: Toi uu noi dung CV cho phan "${sectionLabel}" (truong: ${fieldName}).

NOI DUNG HIEN TAI:
"""
${currentContent}
"""

${context ? `THONG TIN BO SUNG:\n${context}\n` : ""}

Yeu cau:
1. Giu nguyen y nghia goc nhung viet lai cho chuyen nghiep, manh me hon
2. Dung dong tu hanh dong manh
3. Them so lieu cu the neu co the
4. Viet bang tieng Viet, tru thuat ngu ky thuat
5. Giu format phu hop
6. Khong them thong tin sai, chi cai thien cach dien dat
7. Output CHI la noi dung da toi uu, KHONG giai thich hay them gi khac

NOI DUNG TOI UU:`;

    const timings: ServerTimingMetric[] = [];
    const geminiResult = await callGemini(prompt);
    timings.push(...geminiResult.metrics);

    let suggestion = geminiResult.text;
    let provider = "gemini";

    if (!suggestion) {
      const groqResult = await callGroq(prompt);
      timings.push(...groqResult.metrics);
      suggestion = groqResult.text;
      provider = "groq";
    }

    if (!suggestion) {
      return jsonWithTimings(
        { error: "AI dang qua tai. Vui long thu lai sau." },
        { status: 429 },
        timings,
      );
    }

    return jsonWithTimings({ suggestion, provider }, {}, timings);
  } catch (error) {
    console.error("Optimize content error:", error);
    return jsonWithTimings(
      { error: "Da xay ra loi. Vui long thu lai sau." },
      { status: 500 },
    );
  }
}
