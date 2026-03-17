"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildEducationSummary,
  buildWorkExperienceSummary,
  createEmptyEducation,
  createEmptyWorkExperience,
} from "@/lib/candidate-profile-shared";
import type {
  CandidateEducation,
  CandidateProfileRecord,
  CandidateWorkExperience,
} from "@/types/candidate-profile";
import {
  ProfileModal,
  SectionActions,
  SkillComposer,
  createInitials,
} from "./ProfilePrimitives";

export function HeroEditorModal({
  profile,
  saving,
  onClose,
  onSave,
  onError,
}: {
  profile: CandidateProfileRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (profile: CandidateProfileRecord) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState({
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl || "",
    headline: profile.headline,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  async function handleAvatarUpload(file: File | null) {
    if (!file) {
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/candidate/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        avatarUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.avatarUrl) {
        throw new Error(result.error || "Không thể tải ảnh đại diện lên.");
      }

      setDraft((current) => ({ ...current, avatarUrl: result.avatarUrl || "" }));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  }

  return (
    <ProfileModal
      title="Chỉnh sửa phần đầu hồ sơ"
      subtitle="Cập nhật thông tin nhận diện nghề nghiệp để hồ sơ của bạn trông chuyên nghiệp và đáng tin cậy hơn."
      onClose={onClose}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex size-28 items-center justify-center overflow-hidden rounded-[28px] bg-slate-100 text-3xl font-black text-slate-700">
            {draft.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.avatarUrl}
                alt={draft.fullName || "Ảnh đại diện"}
                className="h-full w-full object-cover"
              />
            ) : (
              createInitials(draft.fullName || "Ứng viên")
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Ảnh đại diện</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Chọn ảnh chân dung rõ nét để hồ sơ tạo cảm giác chuyên nghiệp hơn.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void handleAvatarUpload(event.target.files?.[0] ?? null);
                }}
              />
              <Button
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <span className="material-symbols-outlined text-lg">photo_camera</span>
                {uploadingAvatar ? "Đang tải ảnh..." : "Tải ảnh đại diện"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Họ và tên</label>
            <Input
              value={draft.fullName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="Ví dụ: Nguyễn Minh Anh"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Chức danh / Tiêu đề nghề nghiệp
            </label>
            <Input
              value={draft.headline}
              onChange={(event) =>
                setDraft((current) => ({ ...current, headline: event.target.value }))
              }
              placeholder="Ví dụ: Frontend Developer | React | Next.js"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <Input
              value={draft.email}
              onChange={(event) =>
                setDraft((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="tenban@email.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Số điện thoại</label>
            <Input
              value={draft.phone}
              onChange={(event) =>
                setDraft((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="Ví dụ: 0909 123 456"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Địa điểm</label>
            <Input
              value={draft.location}
              onChange={(event) =>
                setDraft((current) => ({ ...current, location: event.target.value }))
              }
              placeholder="Ví dụ: Hồ Chí Minh, Việt Nam"
            />
          </div>
        </div>

        <SectionActions
          onCancel={onClose}
          onSave={() =>
            onSave({
              ...profile,
              fullName: draft.fullName,
              avatarUrl: draft.avatarUrl || null,
              headline: draft.headline,
              email: draft.email,
              phone: draft.phone,
              location: draft.location,
            })
          }
          saving={saving}
        />
      </div>
    </ProfileModal>
  );
}

export function AboutEditorModal({
  profile,
  saving,
  onClose,
  onSave,
}: {
  profile: CandidateProfileRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (profile: CandidateProfileRecord) => void;
}) {
  const [introduction, setIntroduction] = useState(profile.introduction);

  return (
    <ProfileModal
      title="Chỉnh sửa giới thiệu bản thân"
      subtitle="Đây là phần giúp nhà tuyển dụng hiểu nhanh kinh nghiệm, định hướng và giá trị của bạn."
      onClose={onClose}
    >
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Giới thiệu bản thân
          </label>
          <textarea
            rows={10}
            value={introduction}
            onChange={(event) => setIntroduction(event.target.value)}
            placeholder="Mô tả ngắn gọn về kinh nghiệm, kỹ năng nổi bật, ngành nghề bạn theo đuổi và giá trị bạn có thể mang lại."
            className="w-full rounded-[24px] border border-slate-200 px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <SectionActions
          onCancel={onClose}
          onSave={() =>
            onSave({
              ...profile,
              introduction,
            })
          }
          saving={saving}
        />
      </div>
    </ProfileModal>
  );
}

export function SkillsEditorModal({
  profile,
  saving,
  onClose,
  onSave,
}: {
  profile: CandidateProfileRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (profile: CandidateProfileRecord) => void;
}) {
  const [skills, setSkills] = useState(profile.skills);

  return (
    <ProfileModal
      title="Chỉnh sửa kỹ năng"
      subtitle="Bổ sung các kỹ năng mà nhà tuyển dụng thường tìm kiếm để tăng khả năng hiển thị hồ sơ."
      onClose={onClose}
    >
      <div className="space-y-6">
        <SkillComposer value={skills} onChange={setSkills} />

        <SectionActions
          onCancel={onClose}
          onSave={() =>
            onSave({
              ...profile,
              skills,
            })
          }
          saving={saving}
        />
      </div>
    </ProfileModal>
  );
}

export function ExperienceEditorModal({
  profile,
  saving,
  onClose,
  onSave,
  onError,
}: {
  profile: CandidateProfileRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (profile: CandidateProfileRecord) => void;
  onError: (message: string) => void;
}) {
  const [items, setItems] = useState<CandidateWorkExperience[]>(
    profile.workExperiences.length > 0 ? profile.workExperiences : [createEmptyWorkExperience()]
  );

  function updateItem(id: string, patch: Partial<CandidateWorkExperience>) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              endDate:
                patch.isCurrent === true
                  ? ""
                  : patch.endDate !== undefined
                    ? patch.endDate
                    : item.endDate,
            }
          : item
      )
    );
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.length === 1 ? [createEmptyWorkExperience()] : current.filter((item) => item.id !== id)
    );
  }

  return (
    <ProfileModal
      title="Chỉnh sửa kinh nghiệm làm việc"
      subtitle="Mỗi kinh nghiệm nên nêu rõ vai trò, công ty, khoảng thời gian và đóng góp nổi bật."
      onClose={onClose}
    >
      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h4 className="text-lg font-black text-slate-900">Kinh nghiệm {index + 1}</h4>
              <Button variant="ghost" onClick={() => removeItem(item.id)}>
                <span className="material-symbols-outlined text-lg">delete</span>
                Xóa
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Chức danh</label>
                <Input
                  value={item.title}
                  onChange={(event) => updateItem(item.id, { title: event.target.value })}
                  placeholder="Ví dụ: Product Designer"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Công ty</label>
                <Input
                  value={item.company}
                  onChange={(event) => updateItem(item.id, { company: event.target.value })}
                  placeholder="Ví dụ: TalentFlow"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={item.startDate}
                  onChange={(event) => updateItem(item.id, { startDate: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Ngày kết thúc</label>
                <Input
                  type="date"
                  value={item.endDate}
                  disabled={item.isCurrent}
                  onChange={(event) => updateItem(item.id, { endDate: event.target.value })}
                />
              </div>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={item.isCurrent}
                  onChange={(event) => updateItem(item.id, { isCurrent: event.target.checked })}
                  className="size-4 rounded border-slate-300"
                />
                Tôi đang làm việc tại vị trí này
              </label>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Mô tả công việc và kết quả nổi bật
                </label>
                <textarea
                  rows={5}
                  value={item.description}
                  onChange={(event) => updateItem(item.id, { description: event.target.value })}
                  placeholder="Mô tả phạm vi công việc, thành tựu, tác động hoặc các dự án đáng chú ý."
                  className="w-full rounded-[24px] border border-slate-200 px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={() => setItems((current) => [...current, createEmptyWorkExperience()])}>
          <span className="material-symbols-outlined text-lg">add</span>
          Thêm kinh nghiệm
        </Button>

        <SectionActions
          onCancel={onClose}
          onSave={() => {
            const cleanedItems = items.filter(
              (item) =>
                item.title ||
                item.company ||
                item.startDate ||
                item.endDate ||
                item.description ||
                item.isCurrent
            );

            if (cleanedItems.length === 0) {
              onSave({
                ...profile,
                workExperiences: [],
                workExperience: "",
              });
              return;
            }

            if (
              cleanedItems.some(
                (item) =>
                  !item.title ||
                  !item.company ||
                  !item.startDate ||
                  (!item.isCurrent && !item.endDate) ||
                  !item.description
              )
            ) {
              onError(
                "Vui lòng điền đầy đủ chức danh, công ty, thời gian và mô tả cho từng kinh nghiệm làm việc"
              );
              return;
            }

            onSave({
              ...profile,
              workExperiences: cleanedItems,
              workExperience: buildWorkExperienceSummary(cleanedItems),
            });
          }}
          saving={saving}
        />
      </div>
    </ProfileModal>
  );
}

export function EducationEditorModal({
  profile,
  saving,
  onClose,
  onSave,
  onError,
}: {
  profile: CandidateProfileRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (profile: CandidateProfileRecord) => void;
  onError: (message: string) => void;
}) {
  const [items, setItems] = useState<CandidateEducation[]>(
    profile.educations.length > 0 ? profile.educations : [createEmptyEducation()]
  );

  function updateItem(id: string, patch: Partial<CandidateEducation>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.length === 1 ? [createEmptyEducation()] : current.filter((item) => item.id !== id)
    );
  }

  return (
    <ProfileModal
      title="Chỉnh sửa học vấn"
      subtitle="Bổ sung trường học, chương trình đào tạo và các mốc phát triển học thuật quan trọng của bạn."
      onClose={onClose}
    >
      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h4 className="text-lg font-black text-slate-900">Học vấn {index + 1}</h4>
              <Button variant="ghost" onClick={() => removeItem(item.id)}>
                <span className="material-symbols-outlined text-lg">delete</span>
                Xóa
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Trường / Tổ chức đào tạo
                </label>
                <Input
                  value={item.school}
                  onChange={(event) => updateItem(item.id, { school: event.target.value })}
                  placeholder="Ví dụ: Đại học Bách Khoa"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Chuyên ngành / Bằng cấp
                </label>
                <Input
                  value={item.degree}
                  onChange={(event) => updateItem(item.id, { degree: event.target.value })}
                  placeholder="Ví dụ: Kỹ sư Công nghệ thông tin"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={item.startDate}
                  onChange={(event) => updateItem(item.id, { startDate: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Ngày kết thúc</label>
                <Input
                  type="date"
                  value={item.endDate}
                  onChange={(event) => updateItem(item.id, { endDate: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Mô tả thêm (không bắt buộc)
                </label>
                <textarea
                  rows={4}
                  value={item.description}
                  onChange={(event) => updateItem(item.id, { description: event.target.value })}
                  placeholder="Ví dụ: học bổng, dự án tốt nghiệp, thành tích nổi bật hoặc chứng chỉ liên quan."
                  className="w-full rounded-[24px] border border-slate-200 px-4 py-4 text-sm leading-7 text-slate-900 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={() => setItems((current) => [...current, createEmptyEducation()])}>
          <span className="material-symbols-outlined text-lg">add</span>
          Thêm học vấn
        </Button>

        <SectionActions
          onCancel={onClose}
          onSave={() => {
            const cleanedItems = items.filter(
              (item) => item.school || item.degree || item.startDate || item.endDate || item.description
            );

            if (cleanedItems.length === 0) {
              onSave({
                ...profile,
                educations: [],
                education: "",
              });
              return;
            }

            if (
              cleanedItems.some((item) => !item.school || !item.degree || !item.startDate || !item.endDate)
            ) {
              onError(
                "Vui lòng điền đầy đủ trường học, bằng cấp và thời gian cho từng mục học vấn"
              );
              return;
            }

            onSave({
              ...profile,
              educations: cleanedItems,
              education: buildEducationSummary(cleanedItems),
            });
          }}
          saving={saving}
        />
      </div>
    </ProfileModal>
  );
}

export function VisibilityEditorModal({
  profile,
  saving,
  onClose,
  onSave,
}: {
  profile: CandidateProfileRecord;
  saving: boolean;
  onClose: () => void;
  onSave: (profile: CandidateProfileRecord) => void;
}) {
  const [visibility, setVisibility] = useState(profile.profileVisibility);

  return (
    <ProfileModal
      title="Cập nhật trạng thái hồ sơ"
      subtitle="Chọn chế độ hiển thị phù hợp với mục tiêu tìm việc hiện tại của bạn."
      onClose={onClose}
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setVisibility("public")}
          className={`w-full rounded-[24px] border p-5 text-left transition ${
            visibility === "public"
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-start gap-4">
            <span
              className={`mt-1 size-4 rounded-full border-4 ${
                visibility === "public"
                  ? "border-emerald-500 bg-white"
                  : "border-slate-300 bg-white"
              }`}
            />
            <div>
              <p className="text-base font-black text-slate-900">
                Công khai hồ sơ để nhà tuyển dụng tìm thấy
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Hồ sơ của bạn có thể xuất hiện trong khu vực tìm kiếm ứng viên và được xem bởi nhà tuyển dụng.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setVisibility("private")}
          className={`w-full rounded-[24px] border p-5 text-left transition ${
            visibility === "private"
              ? "border-slate-300 bg-slate-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-start gap-4">
            <span
              className={`mt-1 size-4 rounded-full border-4 ${
                visibility === "private"
                  ? "border-slate-700 bg-white"
                  : "border-slate-300 bg-white"
              }`}
            />
            <div>
              <p className="text-base font-black text-slate-900">
                Ẩn hồ sơ khỏi tìm kiếm nhà tuyển dụng
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Hồ sơ vẫn được dùng khi bạn ứng tuyển, nhưng sẽ không hiển thị trong khu vực tìm kiếm công khai.
              </p>
            </div>
          </div>
        </button>

        <SectionActions
          onCancel={onClose}
          onSave={() =>
            onSave({
              ...profile,
              profileVisibility: visibility,
            })
          }
          saving={saving}
          saveLabel="Lưu trạng thái"
        />
      </div>
    </ProfileModal>
  );
}
