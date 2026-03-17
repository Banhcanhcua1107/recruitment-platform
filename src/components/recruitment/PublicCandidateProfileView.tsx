import Link from "next/link";
import type { ReactNode } from "react";
import { formatDateRange, formatProfileUpdatedAt } from "@/lib/candidate-profile-shared";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";

function createInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function InfoPill({
  icon,
  value,
}: {
  icon: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
      <span className="material-symbols-outlined text-base">{icon}</span>
      {value}
    </span>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
        <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </section>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-500">
      {text}
    </div>
  );
}

export function PublicCandidateProfileView({
  candidate,
}: {
  candidate: PublicCandidateSearchResult;
}) {
  const currentExperience =
    candidate.workExperiences.find((item) => item.isCurrent) || candidate.workExperiences[0] || null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#f7fbff_0%,#f8fafc_24%,#f8fafc_100%)] pb-14">
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-10 lg:px-10">
        <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-400">
          <Link href="/hr/candidates" className="inline-flex items-center gap-2 hover:text-primary">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Quay lại danh sách ứng viên
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-bold text-slate-900">Hồ sơ ứng viên công khai</span>
        </nav>

        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="h-40 bg-[linear-gradient(120deg,#0f172a_0%,#0f766e_46%,#38bdf8_100%)] sm:h-52" />
          <div className="px-6 pb-8 sm:px-8 lg:px-10">
            <div className="-mt-16 flex flex-col gap-6 lg:-mt-20 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
                <div className="flex size-28 items-center justify-center overflow-hidden rounded-[28px] border-4 border-white bg-slate-100 text-3xl font-black text-slate-700 shadow-lg sm:size-32">
                  {candidate.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={candidate.avatarUrl}
                      alt={candidate.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    createInitials(candidate.fullName || "UV")
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                      {candidate.fullName}
                    </h1>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                      Công khai
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-700 sm:text-xl">
                      {candidate.headline || currentExperience?.title || "Ứng viên đang cập nhật tiêu đề chuyên môn"}
                    </p>
                    {currentExperience?.company ? (
                      <p className="text-sm font-medium text-slate-500 sm:text-base">
                        {currentExperience.company}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      {candidate.location ? <InfoPill icon="location_on" value={candidate.location} /> : null}
                      {candidate.email ? <InfoPill icon="mail" value={candidate.email} /> : null}
                      {candidate.phone ? <InfoPill icon="call" value={candidate.phone} /> : null}
                    </div>
                  </div>

                  <p className="text-sm text-slate-500">
                    Cập nhật lần cuối: {formatProfileUpdatedAt(candidate.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {candidate.email ? (
                  <a
                    href={`mailto:${candidate.email}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-lg">mail</span>
                    Gửi email
                  </a>
                ) : null}
                {candidate.cvUrl ? (
                  <a
                    href={candidate.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    <span className="material-symbols-outlined text-lg">description</span>
                    Xem CV
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            <Section
              title="Giới thiệu bản thân"
              description="Tổng quan ngắn gọn về định hướng, thế mạnh và giá trị nghề nghiệp của ứng viên."
            >
              {candidate.introduction ? (
                <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {candidate.introduction}
                </p>
              ) : (
                <EmptyBlock text="Ứng viên chưa bổ sung phần giới thiệu bản thân." />
              )}
            </Section>

            <Section
              title="Kỹ năng"
              description="Các kỹ năng chuyên môn và kỹ năng mềm nổi bật được ứng viên công khai."
            >
              {candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {candidate.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyBlock text="Ứng viên chưa công khai danh sách kỹ năng." />
              )}
            </Section>

            <Section
              title="Kinh nghiệm làm việc"
              description="Các vai trò, công ty và đóng góp chính trong hành trình nghề nghiệp của ứng viên."
            >
              {candidate.workExperiences.length > 0 ? (
                <div className="space-y-6">
                  {candidate.workExperiences.map((item) => (
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
              ) : candidate.workExperience ? (
                <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {candidate.workExperience}
                </p>
              ) : (
                <EmptyBlock text="Ứng viên chưa công khai chi tiết kinh nghiệm làm việc." />
              )}
            </Section>

            <Section
              title="Học vấn"
              description="Thông tin học vấn và các cột mốc đào tạo quan trọng của ứng viên."
            >
              {candidate.educations.length > 0 ? (
                <div className="space-y-6">
                  {candidate.educations.map((item) => (
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
              ) : candidate.education ? (
                <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">
                  {candidate.education}
                </p>
              ) : (
                <EmptyBlock text="Ứng viên chưa công khai thông tin học vấn." />
              )}
            </Section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">Thông tin liên hệ</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Liên hệ trực tiếp với ứng viên qua các thông tin được công khai trên hồ sơ.
              </p>
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {candidate.email || "Ứng viên chưa công khai email"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Số điện thoại
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {candidate.phone || "Ứng viên chưa công khai số điện thoại"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">CV / Hồ sơ đính kèm</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Tải về hoặc xem nhanh hồ sơ đính kèm mà ứng viên đang sử dụng trong hệ thống.
              </p>
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                {candidate.cvUrl ? (
                  <a
                    href={candidate.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-semibold text-primary hover:underline"
                  >
                    Mở CV của ứng viên
                  </a>
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Ứng viên chưa tải CV công khai trên hồ sơ này.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">Gợi ý đánh giá nhanh</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>Đối chiếu tiêu đề chuyên môn với vị trí bạn đang tuyển.</li>
                <li>Ưu tiên xem kỹ phần thành tựu trong kinh nghiệm làm việc gần nhất.</li>
                <li>Kiểm tra kỹ kỹ năng, học vấn và CV trước khi liên hệ.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
