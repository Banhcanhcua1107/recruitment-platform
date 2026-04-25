"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Job as FullJob } from "@/types/job";
import { Job as DashJob } from "@/types/dashboard";
import {
  getRecommendedJobsPayload,
  postRecommendedJobsPayload,
} from "@/lib/client/recommend-jobs";

/* ─── Skill display filter (mirrors server-side isDisplayableSkill) ─── */
const JUNK_TAG_SET = new Set([
  "chi", "minh", "noi", "nang", "phong", "hoa", "hcm", "tphcm", "hn", "sg",
  "van", "cong", "nghe", "vien", "ky", "thu", "su", "phan", "mem", "cung",
  "mang", "dien", "lanh", "dau", "khi", "xay", "dung", "bao", "tri", "sua",
  "chua", "ung", "tuyen", "sinh", "dao", "tao", "kinh", "doanh", "ban",
  "hang", "tai", "chinh", "ngan", "bat", "dong", "san", "ke", "toan", "kiem",
  "luat", "phap", "tien", "luong", "hiem", "quyen", "loi", "nhan", "chuyen",
  "truong", "nhom", "pho", "giam", "doc", "quan", "doi", "yeu", "cau", "tot",
  "nghiep", "trinh", "do", "hien", "nay", "hoc", "tap", "cac", "nhung",
  "mot", "cua", "cho", "voi", "duoc", "khong", "trong", "mac", "dinh",
  "hieu", "biet", "tham", "gia",
]);
function isCleanTag(tag: string): boolean {
  const t = tag.toLowerCase().trim();
  if (t.length <= 2) return false;
  if (/^\d+$/.test(t)) return false;
  return !JUNK_TAG_SET.has(t);
}

/* ─── Types ─── */
interface RecommendedItem {
  jobId: string;
  matchScore: number;
  fitLevel: "High" | "Medium" | "Low";
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
  job: FullJob;
}

interface RecommendedJobsProps {
  /** Legacy jobs coming from the dashboard hook (Supabase latest) */
  jobs: DashJob[];
  loading?: boolean;
}

/* ─── Skeleton Card ─── */
function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse flex flex-col h-full">
      <div className="flex justify-between mb-5">
        <div className="size-12 rounded-xl bg-slate-100" />
        <div className="size-8 rounded-full bg-slate-100" />
      </div>
      <div className="h-5 bg-slate-100 rounded-lg w-3/4 mb-3" />
      <div className="h-4 bg-slate-100 rounded-lg w-1/2 mb-5" />
      <div className="h-7 bg-slate-100 rounded-xl w-2/5 mb-4" />
      <div className="h-3 bg-slate-50 rounded w-full mt-auto" />
    </div>
  );
}

/* ─── Score colour helper ─── */
function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-slate-400";
}
function scoreBorder(score: number) {
  if (score >= 80) return "border-emerald-200";
  if (score >= 60) return "border-amber-200";
  return "border-slate-200";
}

/* ─── Fit level helpers ─── */
function fitLevelLabel(level: string) {
  switch (level) {
    case "High": return "Rất phù hợp";
    case "Medium": return "Phù hợp";
    default: return "Ít phù hợp";
  }
}
function fitLevelColor(level: string) {
  switch (level) {
    case "High": return "bg-emerald-50 text-emerald-600 border-emerald-100";
    case "Medium": return "bg-amber-50 text-amber-600 border-amber-100";
    default: return "bg-slate-50 text-slate-500 border-slate-100";
  }
}

/* ─── Recommended Job Card ─── */
function RecommendedCard({ item }: { item: RecommendedItem }) {
  const { job, matchScore, fitLevel, reasons, matchedSkills, missingSkills } = item;
  const initial = job.company_name?.charAt(0) ?? "?";
  const hasLogo =
    job.logo_url &&
    job.logo_url !== "https://via.placeholder.com/150" &&
    !job.logo_url.includes("placeholder");

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col h-full"
    >
      {/* Top row: logo + score badge */}
      <div className="flex justify-between items-start mb-3">
        {hasLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={job.logo_url}
            alt={job.company_name}
            className="size-11 rounded-xl object-cover border border-slate-100"
          />
        ) : (
          <div className="size-11 rounded-xl bg-primary/5 flex items-center justify-center font-black text-primary text-lg border border-primary/10">
            {initial}
          </div>
        )}
        {/* Match score pill + fit level */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${fitLevelColor(fitLevel)}`}
          >
            {fitLevelLabel(fitLevel)}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black text-white ${scoreColor(matchScore)} ${scoreBorder(matchScore)} border`}
          >
            {matchScore}%
          </span>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-base font-black text-slate-900 group-hover:text-primary transition-colors leading-snug mb-1 line-clamp-2">
        {job.title}
      </h4>

      {/* Company • Location */}
      <p className="text-xs font-bold text-slate-400 line-clamp-1 mb-3">
        {job.company_name} • {job.location || "Remote"}
      </p>

      {/* Salary badge */}
      <div className="mb-3">
        <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black border border-emerald-100">
          {job.salary || "Thỏa thuận"}
        </span>
      </div>

      {/* Reasons list */}
      {reasons.length > 0 && (
        <ul className="space-y-1 mb-3">
          {reasons.slice(0, 2).map((r, i) => (
            <li
              key={i}
              className="text-xs font-bold text-slate-500 leading-relaxed flex items-start gap-1.5"
            >
              <span className="material-symbols-outlined text-amber-400 text-sm shrink-0 mt-px">
                auto_awesome
              </span>
              <span className="line-clamp-2">{r}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Skill pills */}
      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {matchedSkills.filter(isCleanTag).slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-md border border-emerald-100"
            >
              {kw}
            </span>
          ))}
          {missingSkills.filter(isCleanTag).slice(0, 2).map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[11px] font-bold rounded-md border border-slate-100 line-through"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Apply button — visible on hover */}
      <div className="mt-auto pt-2">
        <span className="block w-full py-2 bg-primary text-white font-black rounded-xl text-sm text-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-primary/20">
          Ứng tuyển ngay
        </span>
      </div>
    </Link>
  );
}

/* ─── Fallback Card (legacy Supabase jobs) ─── */
function FallbackCard({ job }: { job: DashJob }) {
  const initial = job.company_name?.charAt(0) ?? "?";
  const hasLogo =
    job.logo_url &&
    job.logo_url !== "https://via.placeholder.com/150" &&
    !job.logo_url.includes("placeholder");

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        {hasLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={job.logo_url}
            alt={job.company_name}
            className="size-12 rounded-xl object-cover border border-slate-100"
          />
        ) : (
          <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center font-black text-primary text-xl border border-primary/10">
            {initial}
          </div>
        )}
        <span className="text-slate-300 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-2xl">bookmark</span>
        </span>
      </div>
      <h4 className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors leading-snug mb-1.5 line-clamp-2">
        {job.title}
      </h4>
      <p className="text-sm font-bold text-slate-400 line-clamp-1 mb-4">
        {job.company_name} • {job.location || "Remote"}
      </p>
      <div className="mb-4">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-black border border-emerald-100">
          {job.salary || "Thỏa thuận"}
        </span>
      </div>
      <div className="mt-auto pt-3">
        <span className="block w-full py-2.5 bg-primary text-white font-black rounded-xl text-sm text-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-primary/20">
          Xem chi tiết
        </span>
      </div>
    </Link>
  );
}

/* ─── Sample placeholder ─── */
const PLACEHOLDER_TEXT = `Ví dụ:
Tên: Nguyễn Văn A
Vị trí mong muốn: Frontend Developer
Kỹ năng: React, TypeScript, TailwindCSS, Node.js
Địa điểm: Hồ Chí Minh
Kinh nghiệm: 2 năm phát triển web
Học vấn: Đại học Bách Khoa - Công nghệ thông tin`;

/* ─── Main Section ─── */
export default function RecommendedJobs({
  jobs,
  loading: dashLoading,
}: RecommendedJobsProps) {
  const [geminiItems, setGeminiItems] = useState<RecommendedItem[]>([]);
  const [candidateSummary, setCandidateSummary] = useState("");
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const [suggestedCompanies, setSuggestedCompanies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Manual input state ── */
  const [showManualInput, setShowManualInput] = useState(false);
  const [customText, setCustomText] = useState("");

  /* ── Pick 6 random jobs for default display ── */
  const randomJobs = useMemo(() => {
    return [...jobs]
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, 6);
  }, [jobs]);

  /* ── Load cached recommendations on mount ── */
  useEffect(() => {
    let cancelled = false;

    async function loadCached() {
      try {
        // Try Supabase cache first (GET)
        const data = (await getRecommendedJobsPayload()) as {
          items?: RecommendedItem[];
          candidateSummary?: string;
          suggestedRoles?: string[];
          suggestedCompanies?: string[];
        } | null;
        if (!cancelled && data?.items?.length) {
          setGeminiItems(data.items);
          setCandidateSummary(data.candidateSummary ?? "");
          setSuggestedRoles(data.suggestedRoles ?? []);
          setSuggestedCompanies(data.suggestedCompanies ?? []);
          setHasFetched(true);
          // Also mirror to localStorage
          try {
            localStorage.setItem(
              "rec_jobs_cache",
              JSON.stringify({ items: data.items, candidateSummary: data.candidateSummary, suggestedRoles: data.suggestedRoles, suggestedCompanies: data.suggestedCompanies })
            );
          } catch { /* quota exceeded */ }
          return;
        }
      } catch {
        // Supabase/network unavailable — fall through to localStorage
      }

      // Fallback: localStorage
      try {
        const raw = localStorage.getItem("rec_jobs_cache");
        if (raw && !cancelled) {
          const cached = JSON.parse(raw);
          if (cached.items?.length > 0) {
            setGeminiItems(cached.items);
            setCandidateSummary(cached.candidateSummary ?? "");
            setSuggestedRoles(cached.suggestedRoles ?? []);
            setSuggestedCompanies(cached.suggestedCompanies ?? []);
            setHasFetched(true);
          }
        }
      } catch { /* corrupt or unavailable */ }
    }

    loadCached();
    return () => { cancelled = true; };
  }, []);

  const handleRecommend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (customText.trim()) {
        body.candidate_text = customText.trim();
      }

      const data = (await postRecommendedJobsPayload(body)) as {
        items?: RecommendedItem[];
        candidateSummary?: string;
        suggestedRoles?: string[];
        suggestedCompanies?: string[];
      };
      setCandidateSummary(data.candidateSummary ?? "");
      setSuggestedRoles(data.suggestedRoles ?? []);
      setSuggestedCompanies(data.suggestedCompanies ?? []);
      setGeminiItems(data.items ?? []);
      setHasFetched(true);

      // Mirror to localStorage as fallback cache
      try {
        localStorage.setItem(
          "rec_jobs_cache",
          JSON.stringify({ items: data.items, candidateSummary: data.candidateSummary, suggestedRoles: data.suggestedRoles, suggestedCompanies: data.suggestedCompanies })
        );
      } catch { /* quota exceeded */ }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi gọi API";
      setError(msg);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [customText]);

  // Show skeleton during initial dashboard load
  if (dashLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-52 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-10 w-48 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const showGemini = hasFetched && geminiItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">
            work
          </span>
          Việc làm phù hợp
        </h3>

        <div className="flex items-center gap-2">
          {/* Toggle manual input */}
          <button
            onClick={() => setShowManualInput((v) => !v)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">
              {showManualInput ? "expand_less" : "edit_note"}
            </span>
            {showManualInput ? "Ẩn" : "Tự nhập hồ sơ"}
          </button>

          <button
            onClick={handleRecommend}
            disabled={isLoading}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-white font-black text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-60 disabled:cursor-wait transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">
              auto_awesome
            </span>
            {isLoading ? "Đang phân tích..." : "Gợi ý công việc phù hợp"}
          </button>
        </div>
      </div>

      {/* ── Manual input panel ── */}
      {showManualInput && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-xl">person_edit</span>
            <h4 className="font-black text-slate-900 text-sm">Nhập thông tin hồ sơ thủ công</h4>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Nhập kỹ năng, vị trí mong muốn, địa điểm, kinh nghiệm... AI sẽ phân tích và gợi ý việc phù hợp.
            {" "}
            <span className="text-slate-500">Nếu bạn đã đăng nhập và có hồ sơ, dữ liệu này sẽ được ưu tiên dùng thay thế.</span>
          </p>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={PLACEHOLDER_TEXT}
            rows={6}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-700 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">
              {customText.length > 0
                ? `${customText.length} ký tự`
                : "Chưa nhập gì — sẽ dùng hồ sơ đã lưu hoặc mặc định"}
            </span>
            {customText.length > 0 && (
              <button
                onClick={() => setCustomText("")}
                className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors cursor-pointer"
              >
                Xóa nội dung
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* AI Analysis Panel */}
      {!isLoading && candidateSummary && (
        <div className="space-y-4">
          {/* Candidate summary */}
          <div className="flex items-start gap-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5">psychology</span>
            <div>
              <p className="text-xs font-black text-primary uppercase tracking-wider mb-1">Nhận xét AI</p>
              <p className="text-sm font-medium text-slate-700 leading-relaxed">{candidateSummary}</p>
            </div>
          </div>

          {/* Suggested Roles + Companies row */}
          {(suggestedRoles.length > 0 || suggestedCompanies.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Suggested Roles */}
              {suggestedRoles.length > 0 && (
                <div className="p-4 bg-violet-50/60 border border-violet-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-violet-500 text-lg">target</span>
                    <p className="text-xs font-black text-violet-600 uppercase tracking-wider">Vị trí phù hợp</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedRoles.map((role, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1.5 bg-white border border-violet-100 rounded-lg text-xs font-bold text-violet-700 shadow-sm"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Companies */}
              {suggestedCompanies.length > 0 && (
                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-amber-500 text-lg">apartment</span>
                    <p className="text-xs font-black text-amber-600 uppercase tracking-wider">Công ty / loại hình gợi ý</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedCompanies.map((company, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1.5 bg-white border border-amber-100 rounded-lg text-xs font-bold text-amber-700 shadow-sm"
                      >
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gemini results */}
      {!isLoading && showGemini && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {geminiItems.map((item) => (
            <RecommendedCard key={item.jobId} item={item} />
          ))}
        </div>
      )}

      {/* Fallback: random jobs (before AI recommendations) */}
      {!isLoading && !hasFetched && (
        <div>
          <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">shuffle</span>
            Gợi ý ngẫu nhiên — nhấn &quot;Gợi ý công việc phù hợp&quot; để nhận đề xuất từ AI
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {randomJobs.map((job) => (
              <FallbackCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state after Gemini returns 0 */}
      {!isLoading && hasFetched && geminiItems.length === 0 && !error && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <span className="material-symbols-outlined text-5xl text-slate-200 mb-3 block">
            search_off
          </span>
          <p className="text-slate-400 font-bold">
            Không tìm được gợi ý phù hợp. Hãy cập nhật hồ sơ để nhận đề xuất tốt hơn.
          </p>
        </div>
      )}
    </div>
  );
}
