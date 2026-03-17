"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  buildEducationSummary,
  buildWorkExperienceSummary,
  calculateCandidateProfileCompletion,
  formatDateRange,
  formatProfileUpdatedAt,
  getCurrentExperience,
  getCvFileName,
  validateCandidateProfileInput,
} from "@/lib/candidate-profile-shared";
import type { CandidateProfileRecord } from "@/types/candidate-profile";
import {
  EmptyState,
  ProfileSection,
} from "@/components/candidate/profile-editor/ProfilePrimitives";
import {
  AboutEditorModal,
  EducationEditorModal,
  ExperienceEditorModal,
  HeroEditorModal,
  SkillsEditorModal,
  VisibilityEditorModal,
} from "@/components/candidate/profile-editor/ProfileModals";

type EditorSection = "hero" | "about" | "skills" | "experience" | "education" | "visibility";
type FlashNotice = { type: "success" | "error"; message: string };

function buildProfilePayload(profile: CandidateProfileRecord) {
  return {
    ...profile,
    workExperience:
      profile.workExperiences.length > 0
        ? buildWorkExperienceSummary(profile.workExperiences)
        : profile.workExperience,
    education:
      profile.educations.length > 0
        ? buildEducationSummary(profile.educations)
        : profile.education,
  };
}

function createInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function sortExperienceItems(items: CandidateProfileRecord["workExperiences"]) {
  return [...items].sort((left, right) => {
    if (left.isCurrent && !right.isCurrent) {
      return -1;
    }
    if (!left.isCurrent && right.isCurrent) {
      return 1;
    }
    return right.startDate.localeCompare(left.startDate);
  });
}

function sortEducationItems(items: CandidateProfileRecord["educations"]) {
  return [...items].sort((left, right) => right.startDate.localeCompare(left.startDate));
}

export function CandidateProfileEditor() {
  const [profile, setProfile] = useState<CandidateProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeEditor, setActiveEditor] = useState<EditorSection | null>(null);
  const [savingSection, setSavingSection] = useState<EditorSection | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [notice, setNotice] = useState<FlashNotice | null>(null);
  const cvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/candidate/profile", { cache: "no-store" });
        const result = (await response.json()) as { profile?: CandidateProfileRecord; error?: string };

        if (!response.ok || !result.profile) {
          throw new Error(result.error || "Không thể tải hồ sơ cá nhân.");
        }

        setProfile(result.profile);
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? error.message : "Không thể tải hồ sơ cá nhân.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const currentExperience = useMemo(
    () => (profile ? getCurrentExperience(profile.workExperiences) : null),
    [profile]
  );

  const completion = profile
    ? calculateCandidateProfileCompletion({
        ...profile,
        cvUrl: profile.cvUrl,
        cvFilePath: profile.cvFilePath,
      })
    : 0;

  async function persistProfile(
    nextProfile: CandidateProfileRecord,
    section: EditorSection,
    successMessage: string
  ) {
    const payload = buildProfilePayload(nextProfile);
    const validationError = validateCandidateProfileInput(payload);

    if (validationError) {
      setNotice({ type: "error", message: validationError });
      return false;
    }

    setSavingSection(section);

    try {
      const response = await fetch("/api/candidate/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { profile?: CandidateProfileRecord; error?: string };

      if (!response.ok || !result.profile) {
        throw new Error(result.error || "Không thể cập nhật hồ sơ.");
      }

      setProfile(result.profile);
      setActiveEditor(null);
      setNotice({ type: "success", message: successMessage });
      return true;
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.",
      });
      return false;
    } finally {
      setSavingSection(null);
    }
  }

  async function uploadCv(file: File | null) {
    if (!file) {
      return;
    }

    setUploadingCv(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/candidate/profile/cv", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        cvUrl?: string;
        filePath?: string;
        error?: string;
      };

      if (!response.ok || !result.cvUrl || !result.filePath) {
        throw new Error(result.error || "Không thể tải CV lên.");
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              cvUrl: result.cvUrl ?? current.cvUrl,
              cvFilePath: result.filePath ?? current.cvFilePath,
            }
          : current
      );
      setNotice({ type: "success", message: "Tải CV lên thành công" });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.",
      });
    } finally {
      setUploadingCv(false);
      if (cvInputRef.current) {
        cvInputRef.current.value = "";
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#f8fafc_28%,#f8fafc_100%)]">
        <div className="mx-auto max-w-[1280px] space-y-6 px-6 py-10 lg:px-10">
          <div className="h-72 animate-pulse rounded-[36px] bg-slate-100" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="h-60 animate-pulse rounded-[32px] bg-slate-100" />
              <div className="h-60 animate-pulse rounded-[32px] bg-slate-100" />
            </div>
            <div className="space-y-6">
              <div className="h-56 animate-pulse rounded-[32px] bg-slate-100" />
              <div className="h-56 animate-pulse rounded-[32px] bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-rose-700">
          {notice?.message || "Không thể tải hồ sơ cá nhân."}
        </div>
      </div>
    );
  }

  const displayRole =
    profile.headline || currentExperience?.title || "Bổ sung chức danh chuyên môn của bạn";
  const displayCompany = currentExperience?.company || "";
  const cvFileName = getCvFileName(profile);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#f7fbff_0%,#f8fafc_24%,#f8fafc_100%)] pb-14">
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-10 lg:px-10">
        {notice ? (
          <div
            className={`fixed right-4 top-4 z-[120] max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-lg ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="h-40 bg-[linear-gradient(120deg,#0f172a_0%,#0f766e_46%,#38bdf8_100%)] sm:h-52" />
          <div className="px-6 pb-8 sm:px-8 lg:px-10">
            <div className="-mt-16 flex flex-col gap-6 lg:-mt-20 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
                <div className="flex size-28 items-center justify-center overflow-hidden rounded-[28px] border-4 border-white bg-slate-100 text-3xl font-black text-slate-700 shadow-lg sm:size-32">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    createInitials(profile.fullName || "Ứng viên")
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                      {profile.fullName || "Hồ sơ ứng viên"}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                        profile.profileVisibility === "public"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {profile.profileVisibility === "public" ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-700 sm:text-xl">{displayRole}</p>
                    {displayCompany ? (
                      <p className="text-sm font-medium text-slate-500 sm:text-base">
                        {displayCompany}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      {profile.location ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          {profile.location}
                        </span>
                      ) : null}
                      {profile.email ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                          <span className="material-symbols-outlined text-base">mail</span>
                          {profile.email}
                        </span>
                      ) : null}
                      {profile.phone ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                          <span className="material-symbols-outlined text-base">call</span>
                          {profile.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-sm text-slate-500">
                    Cập nhật lần cuối: {formatProfileUpdatedAt(profile.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {profile.cvUrl ? (
                  <a
                    href={profile.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-lg">description</span>
                    Xem CV
                  </a>
                ) : null}
                <Button className="rounded-2xl" onClick={() => setActiveEditor("hero")}>
                  <span className="material-symbols-outlined text-lg">edit_square</span>
                  Chỉnh sửa hồ sơ
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-8">
            <ProfileSection
              title="Giới thiệu bản thân"
              description="Tóm tắt ngắn gọn nhưng thuyết phục về thế mạnh, định hướng và giá trị chuyên môn của bạn."
              onEdit={() => setActiveEditor("about")}
            >
              {profile.introduction ? (
                <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {profile.introduction}
                </p>
              ) : (
                <EmptyState text="Hãy viết phần giới thiệu bản thân để nhà tuyển dụng hiểu bạn là ai, bạn mạnh ở đâu và đang tìm kiếm cơ hội như thế nào." />
              )}
            </ProfileSection>

            <ProfileSection
              title="Kỹ năng"
              description="Những kỹ năng cốt lõi giúp nhà tuyển dụng và hệ thống tìm thấy hồ sơ của bạn dễ hơn."
              onEdit={() => setActiveEditor("skills")}
            >
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState text="Chưa có kỹ năng nào được thêm. Bạn nên bổ sung các kỹ năng chuyên môn và kỹ năng mềm nổi bật." />
              )}
            </ProfileSection>

            <ProfileSection
              title="Kinh nghiệm làm việc"
              description="Trình bày các vai trò tiêu biểu, phạm vi công việc và tác động bạn đã tạo ra."
              onEdit={() => setActiveEditor("experience")}
            >
              {profile.workExperiences.length > 0 ? (
                <div className="space-y-6">
                  {sortExperienceItems(profile.workExperiences).map((item) => (
                    <article key={item.id} className="relative pl-8">
                      <div className="absolute left-0 top-2 h-full w-px bg-slate-200" />
                      <div className="absolute left-[-7px] top-2 size-4 rounded-full border-4 border-white bg-primary shadow" />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
                            <p className="text-sm font-semibold text-slate-600">{item.company}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {formatDateRange(item.startDate, item.endDate, item.isCurrent)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : profile.workExperience ? (
                <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {profile.workExperience}
                </p>
              ) : (
                <EmptyState text="Chưa có kinh nghiệm làm việc nào được thêm. Hãy bắt đầu với vai trò gần đây nhất hoặc vị trí bạn tự tin nhất." />
              )}
            </ProfileSection>

            <ProfileSection
              title="Học vấn"
              description="Cho nhà tuyển dụng thấy nền tảng học tập, chương trình đào tạo và các cột mốc phát triển chuyên môn của bạn."
              onEdit={() => setActiveEditor("education")}
            >
              {profile.educations.length > 0 ? (
                <div className="space-y-6">
                  {sortEducationItems(profile.educations).map((item) => (
                    <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">{item.degree}</h3>
                          <p className="text-sm font-semibold text-slate-600">{item.school}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {formatDateRange(item.startDate, item.endDate)}
                        </span>
                      </div>
                      {item.description ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {item.description}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : profile.education ? (
                <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {profile.education}
                </p>
              ) : (
                <EmptyState text="Bạn có thể thêm trường học, chuyên ngành, chứng chỉ hoặc các chương trình đào tạo quan trọng tại đây." />
              )}
            </ProfileSection>
          </main>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                    Mức độ hoàn thiện
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-slate-900">{completion}%</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  Hồ sơ nghề nghiệp
                </span>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#38bdf8_100%)] transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Hồ sơ càng đầy đủ, càng dễ được nhà tuyển dụng đánh giá nhanh và tìm thấy trong tìm kiếm.
              </p>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">CV / Hồ sơ đính kèm</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Tải lên CV để dùng lại khi ứng tuyển và giúp nhà tuyển dụng xem nhanh hồ sơ của bạn.
                  </p>
                </div>
                <span className="material-symbols-outlined text-3xl text-slate-300">description</span>
              </div>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                {profile.cvUrl ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-900">{cvFileName || "CV hiện tại"}</p>
                    <p className="text-sm leading-6 text-slate-500">
                      CV này sẽ được dùng làm mặc định khi bạn chọn hồ sơ hiện có trong biểu mẫu ứng tuyển.
                    </p>
                    <a
                      href={profile.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-semibold text-primary hover:underline"
                    >
                      Xem hoặc tải CV
                    </a>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Bạn chưa tải CV lên. Hãy thêm CV để hồ sơ trở nên hoàn chỉnh và sẵn sàng ứng tuyển.
                  </p>
                )}
              </div>

              <input
                ref={cvInputRef}
                type="file"
                aria-label="Tải lên CV hồ sơ cá nhân"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => {
                  void uploadCv(event.target.files?.[0] ?? null);
                }}
              />

              <div className="mt-5 flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={() => cvInputRef.current?.click()}
                  disabled={uploadingCv}
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  {uploadingCv ? "Đang tải CV..." : profile.cvUrl ? "Thay thế CV" : "Tải lên CV"}
                </Button>
                <p className="text-xs leading-5 text-slate-400">
                  Hỗ trợ định dạng PDF, DOC, DOCX. Dung lượng tối đa 10MB.
                </p>
                <Link href="/candidate/cv-builder" className="text-sm font-semibold text-primary hover:underline">
                  Hoặc tạo CV từ thư viện mẫu
                </Link>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Trạng thái hồ sơ</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Kiểm soát việc nhà tuyển dụng có thể tìm thấy hồ sơ của bạn hay không.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setActiveEditor("visibility")}>
                  Chỉnh sửa
                </Button>
              </div>

              <div
                className={`mt-5 rounded-[24px] border px-4 py-4 ${
                  profile.profileVisibility === "public"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    profile.profileVisibility === "public"
                      ? "text-emerald-700"
                      : "text-slate-700"
                  }`}
                >
                  {profile.profileVisibility === "public"
                    ? "Công khai hồ sơ để nhà tuyển dụng tìm thấy"
                    : "Ẩn hồ sơ khỏi tìm kiếm nhà tuyển dụng"}
                </p>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">Nhà tuyển dụng sẽ nhìn thấy gì?</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>Thông tin cá nhân chuyên nghiệp, tiêu đề nghề nghiệp và cách liên hệ của bạn.</li>
                <li>Phần giới thiệu, kỹ năng, kinh nghiệm và học vấn theo cấu trúc rõ ràng.</li>
                <li>CV đính kèm và trạng thái công khai của hồ sơ khi bạn bật hiển thị.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>

      {activeEditor === "hero" ? (
        <HeroEditorModal
          profile={profile}
          saving={savingSection === "hero"}
          onClose={() => setActiveEditor(null)}
          onSave={(nextProfile) =>
            void persistProfile(nextProfile, "hero", "Cập nhật hồ sơ thành công")
          }
          onError={(message) => setNotice({ type: "error", message })}
        />
      ) : null}

      {activeEditor === "about" ? (
        <AboutEditorModal
          profile={profile}
          saving={savingSection === "about"}
          onClose={() => setActiveEditor(null)}
          onSave={(nextProfile) =>
            void persistProfile(nextProfile, "about", "Đã lưu phần giới thiệu bản thân")
          }
        />
      ) : null}

      {activeEditor === "skills" ? (
        <SkillsEditorModal
          profile={profile}
          saving={savingSection === "skills"}
          onClose={() => setActiveEditor(null)}
          onSave={(nextProfile) =>
            void persistProfile(nextProfile, "skills", "Đã cập nhật kỹ năng")
          }
        />
      ) : null}

      {activeEditor === "experience" ? (
        <ExperienceEditorModal
          profile={profile}
          saving={savingSection === "experience"}
          onClose={() => setActiveEditor(null)}
          onSave={(nextProfile) =>
            void persistProfile(nextProfile, "experience", "Đã cập nhật kinh nghiệm làm việc")
          }
          onError={(message) => setNotice({ type: "error", message })}
        />
      ) : null}

      {activeEditor === "education" ? (
        <EducationEditorModal
          profile={profile}
          saving={savingSection === "education"}
          onClose={() => setActiveEditor(null)}
          onSave={(nextProfile) =>
            void persistProfile(nextProfile, "education", "Đã cập nhật học vấn")
          }
          onError={(message) => setNotice({ type: "error", message })}
        />
      ) : null}

      {activeEditor === "visibility" ? (
        <VisibilityEditorModal
          profile={profile}
          saving={savingSection === "visibility"}
          onClose={() => setActiveEditor(null)}
          onSave={(nextProfile) =>
            void persistProfile(nextProfile, "visibility", "Đã cập nhật trạng thái hồ sơ")
          }
        />
      ) : null}
    </div>
  );
}
