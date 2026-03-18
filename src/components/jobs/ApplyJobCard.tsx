"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

const ApplicationModal = dynamic(
  () => import("@/components/jobs/ApplicationModal").then((module) => module.ApplicationModal),
  {
    ssr: false,
    loading: () => null,
  }
);

interface ApplyJobCardProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  sourceUrl?: string | null;
  compact?: boolean;
}

export function ApplyJobCard({
  jobId,
  jobTitle,
  companyName,
  sourceUrl,
  compact = false,
}: ApplyJobCardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted) {
        setIsAuthenticated(Boolean(user));
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  function preloadModal() {
    void import("@/components/jobs/ApplicationModal");
  }

  return (
    <>
      <aside
        className={[
          "rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.18)]",
          compact ? "p-5" : "p-6 sm:p-7",
        ].join(" ")}
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Ứng tuyển nhanh
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Gửi hồ sơ trực tiếp
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Điền thông tin cá nhân, giới thiệu ngắn gọn và chọn CV phù hợp cho vị trí này.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <FeatureLine
              icon="person"
              title="Thông tin tự động"
              description="Lấy nhanh dữ liệu từ hồ sơ ứng viên đã lưu."
            />
            <FeatureLine
              icon="description"
              title="Chọn đúng CV"
              description="Dùng CV có sẵn hoặc tải lên một bản mới."
            />
          </div>

          {isAuthenticated === null ? (
            <div className="h-14 animate-pulse rounded-[18px] bg-slate-100" />
          ) : !isAuthenticated ? (
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              <p className="font-semibold">Đăng nhập tài khoản ứng viên để tiếp tục ứng tuyển.</p>
              <Link
                href="/login"
                className="mt-3 inline-flex items-center gap-2 font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-base">login</span>
                Đăng nhập ngay
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              onMouseEnter={preloadModal}
              onFocus={preloadModal}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-5 text-sm font-black text-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-primary-hover active:translate-y-px"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
              Ứng tuyển ngay
            </button>
          )}

          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-primary/30 hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Xem tin gốc
            </a>
          ) : null}

          <p className="text-xs leading-5 text-slate-500">
            Hồ sơ sẽ được gửi trực tiếp đến nhà tuyển dụng ngay sau khi bạn xác nhận.
          </p>
        </div>
      </aside>

      {isModalOpen ? (
        <ApplicationModal
          jobId={jobId}
          jobTitle={jobTitle}
          companyName={companyName}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </>
  );
}

function FeatureLine({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary ring-1 ring-slate-200">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}
