import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAllJobs } from "@/lib/jobs";
import { rankJobsWithGemini } from "@/lib/gemini";
import type { Job } from "@/types/job";
import { recommendJobs, preFilterForGemini } from "@/lib/recommend";

export const dynamic = "force-dynamic";

/* ── helpers to extract text from profile document ── */
interface ProfileSection {
  type: string;
  isHidden?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
}
interface ProfileDocument {
  sections?: ProfileSection[];
}

function extractCandidateTextFromDocument(doc: ProfileDocument): string {
  const parts: string[] = [];
  const sections = doc?.sections ?? [];

  for (const sec of sections) {
    if (sec.isHidden) continue;
    const c = sec.content;
    if (!c) continue;

    switch (sec.type) {
      case "personal_info":
        if (c.fullName) parts.push(`Tên: ${c.fullName}`);
        if (c.address) parts.push(`Địa điểm: ${c.address}`);
        break;

      case "summary":
      case "career_goal":
        if (c.content) {
          const label = sec.type === "summary" ? "Giới thiệu" : "Mục tiêu nghề nghiệp";
          parts.push(`${label}: ${c.content}`);
        }
        break;

      case "skills":
        if (Array.isArray(c.skills) && c.skills.length > 0) {
          const names = c.skills.map((s: { name?: string }) => s.name).filter(Boolean);
          if (names.length) parts.push(`Kỹ năng: ${names.join(", ")}`);
        }
        break;

      case "languages":
        if (Array.isArray(c.languages) && c.languages.length > 0) {
          const names = c.languages.map((l: { name?: string; level?: string }) =>
            l.level ? `${l.name} (${l.level})` : l.name
          );
          parts.push(`Ngoại ngữ: ${names.join(", ")}`);
        }
        break;

      case "experience":
        if (Array.isArray(c.items) && c.items.length > 0) {
          const expTexts = c.items.map(
            (e: { title?: string; company?: string; description?: string[] }) => {
              const line = [e.title, e.company].filter(Boolean).join(" tại ");
              const desc = e.description?.slice(0, 2).join("; ") ?? "";
              return desc ? `${line} – ${desc}` : line;
            }
          );
          parts.push(`Kinh nghiệm:\n${expTexts.join("\n")}`);
        }
        break;

      case "education":
        if (Array.isArray(c.items) && c.items.length > 0) {
          const eduTexts = c.items.map(
            (e: { school?: string; major?: string; degree?: string }) =>
              [e.degree, e.major, e.school].filter(Boolean).join(" – ")
          );
          parts.push(`Học vấn: ${eduTexts.join("; ")}`);
        }
        break;

      case "certifications":
        if (Array.isArray(c.items) && c.items.length > 0) {
          const names = c.items.map((i: { name?: string }) => i.name).filter(Boolean);
          if (names.length) parts.push(`Chứng chỉ: ${names.join(", ")}`);
        }
        break;

      case "projects":
        if (Array.isArray(c.items) && c.items.length > 0) {
          const projTexts = c.items.map(
            (p: { name?: string; technologies?: string[] }) => {
              const tech = p.technologies?.join(", ") ?? "";
              return tech ? `${p.name} (${tech})` : p.name;
            }
          );
          parts.push(`Dự án: ${projTexts.join("; ")}`);
        }
        break;
    }
  }

  return parts.join("\n");
}

/* ─── GET: return cached recommendations for the logged-in user ─── */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ items: [], candidateSummary: "" });
    }

    const { data: cached } = await supabase
      .from("job_recommendations")
      .select("items, candidate_summary, suggested_roles, suggested_companies, updated_at")
      .eq("user_id", user.id)
      .single();

    if (!cached) {
      return NextResponse.json({ items: [], candidateSummary: "", suggestedRoles: [], suggestedCompanies: [] });
    }

    return NextResponse.json({
      items: cached.items ?? [],
      candidateSummary: cached.candidate_summary ?? "",
      suggestedRoles: cached.suggested_roles ?? [],
      suggestedCompanies: cached.suggested_companies ?? [],
      cachedAt: cached.updated_at,
    });
  } catch (err: unknown) {
    console.error("recommend-jobs GET error:", err);
    return NextResponse.json({ items: [], candidateSummary: "" });
  }
}

export async function POST(request: Request) {
  try {
    // ---------- 1. Resolve candidate text ----------
    let candidateText = "";

    // Check for explicit body text first (manual input from UI)
    let bodyText = "";
    try {
      const body = await request.json();
      if (body.candidate_text) {
        bodyText = body.candidate_text;
      }
    } catch {
      // empty body is fine
    }

    // If user provided custom text, prioritise it
    if (bodyText) {
      candidateText = bodyText;
    } else {
      // Otherwise try auth-based profile
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        // Pull profile document (JSONB)
        const { data: profile } = await supabase
          .from("candidate_profiles")
          .select("document")
          .eq("user_id", authUser.id)
          .single();

        if (profile?.document) {
          candidateText = extractCandidateTextFromDocument(
            profile.document as ProfileDocument
          );
        }

        // Try to get latest CV text as extra context
        const { data: cvRows } = await supabase
          .from("cvs")
          .select("content")
          .eq("user_id", authUser.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (cvRows?.[0]?.content) {
          const cvContent =
            typeof cvRows[0].content === "string"
              ? cvRows[0].content
              : JSON.stringify(cvRows[0].content);
          candidateText += `\nCV:\n${cvContent.slice(0, 3000)}`;
        }
      }
    }

    if (!candidateText) {
      candidateText =
        "Ứng viên đang tìm việc tại Việt Nam, quan tâm công nghệ, marketing và kinh doanh.";
    }

    // ---------- 2. Load all jobs ----------
    const allJobs: Job[] = getAllJobs();

    // ---------- 3. Pre-filter + Ollama (with local pipeline fallback) ----------
    const TOP_K = 6;
    let candidateSummary = "";
    let suggestedRoles: string[] = [];
    let suggestedCompanies: string[] = [];
    let recommendations: {
      jobId: string;
      jobTitle: string;
      companyName: string;
      matchScore: number;
      fitLevel: "High" | "Medium" | "Low";
      reasons: string[];
      matchedSkills: string[];
      missingSkills: string[];
    }[];

    try {
      // Pre-filter: send only relevant jobs to Ollama (saves tokens & avoids noise)
      const { filteredJobs } = preFilterForGemini(candidateText, allJobs, 30);

      const aiResult = await rankJobsWithGemini({
        candidateText,
        jobs: filteredJobs.length > 0 ? filteredJobs : allJobs,
        topK: TOP_K,
      });
      candidateSummary = aiResult.candidateSummary;
      suggestedRoles = aiResult.suggestedRoles ?? [];
      suggestedCompanies = aiResult.suggestedCompanies ?? [];
      recommendations = aiResult.recommendations;
    } catch (aiErr) {
      console.warn("Ollama unavailable, using local recommendation pipeline:", aiErr instanceof Error ? aiErr.message : aiErr);
      // Local pipeline fallback — uses hard filter + weighted scoring
      const result = recommendJobs(candidateText, allJobs, TOP_K);
      recommendations = result.recommendations.map((r) => ({
        ...r,
        jobTitle: "",
        companyName: "",
      }));
    }

    // ---------- 4. Map IDs back to full job objects ----------
    const jobMap = new Map(allJobs.map((j) => [j.id, j]));

    const items = recommendations
      .map((rec) => {
        const job = jobMap.get(rec.jobId);
        if (!job) return null;
        return {
          jobId: rec.jobId,
          matchScore: rec.matchScore,
          fitLevel: rec.fitLevel,
          reasons: rec.reasons,
          matchedSkills: rec.matchedSkills,
          missingSkills: rec.missingSkills,
          job,
        };
      })
      .filter(Boolean);

    // ---------- 5. Persist to Supabase for the logged-in user ----------
    try {
      const supabase = await createClient();
      const { data: { user: authUser2 } } = await supabase.auth.getUser();
      if (authUser2 && items.length > 0) {
        await supabase
          .from("job_recommendations")
          .upsert(
            {
              user_id: authUser2.id,
              items,
              candidate_summary: candidateSummary,
              suggested_roles: suggestedRoles,
              suggested_companies: suggestedCompanies,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
      }
    } catch (saveErr) {
      // Non-fatal — don't fail the response if caching fails
      console.warn("Failed to cache recommendations:", saveErr);
    }

    return NextResponse.json({
      candidateSummary,
      suggestedRoles,
      suggestedCompanies,
      items,
    });
  } catch (err: unknown) {
    console.error("recommend-jobs error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}

// Old localFallbackMatch removed — replaced by src/lib/recommend/ pipeline
