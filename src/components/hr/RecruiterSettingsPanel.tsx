"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RecruiterSettingsState {
  recruiterAlias: string;
  notificationEmail: string;
  notifyNewCandidates: boolean;
  notifySavedCandidates: boolean;
  notifyInterviews: boolean;
  notifyDailyDigest: boolean;
  requireReauthForSensitiveActions: boolean;
  notifyNewDevice: boolean;
  hideCandidateContactsUntilViewed: boolean;
}

const SETTINGS_STORAGE_KEY = "talentflow:hr:workspace-settings";

function buildDefaultState({
  viewerName,
  viewerEmail,
}: {
  viewerName: string;
  viewerEmail: string;
}): RecruiterSettingsState {
  return {
    recruiterAlias: viewerName,
    notificationEmail: viewerEmail,
    notifyNewCandidates: true,
    notifySavedCandidates: true,
    notifyInterviews: true,
    notifyDailyDigest: false,
    requireReauthForSensitiveActions: false,
    notifyNewDevice: true,
    hideCandidateContactsUntilViewed: false,
  };
}

function SettingCheckbox({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 rounded border-slate-300 text-primary focus:ring-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-500">{description}</span>
      </span>
    </label>
  );
}

export function RecruiterSettingsPanel({
  viewerName,
  viewerEmail,
  companyName,
}: {
  viewerName: string;
  viewerEmail: string;
  companyName: string;
}) {
  const [state, setState] = useState<RecruiterSettingsState>(() => {
    const defaults = buildDefaultState({ viewerName, viewerEmail });

    if (typeof window === "undefined") {
      return defaults;
    }

    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return defaults;
      }

      return {
        ...defaults,
        ...(JSON.parse(raw) as Partial<RecruiterSettingsState>),
      };
    } catch {
      return defaults;
    }
  });
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const persist = () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
    setLastSavedAt(new Date().toISOString());
  };

  const resetState = () => {
    const defaults = buildDefaultState({ viewerName, viewerEmail });
    setState(defaults);
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    setLastSavedAt(new Date().toISOString());
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              Thiết lập recruiter
            </p>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              Tùy chỉnh vận hành tuyển dụng
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Các tùy chọn dưới đây hiện được lưu trên thiết bị này để giữ luồng làm việc
              recruiter gọn gàng ngay từ bây giờ, đồng thời mở đường cho mô hình nhiều recruiter
              trong các pha tiếp theo.
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            {lastSavedAt ? (
              <span>Đã lưu lúc {new Date(lastSavedAt).toLocaleTimeString("vi-VN")}</span>
            ) : (
              <span>Chưa có cấu hình cục bộ nào được lưu.</span>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Tài khoản recruiter
            </p>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">
              Thông tin người phụ trách
            </h3>
            <p className="text-sm leading-6 text-slate-500">
              Dùng để hiển thị nội bộ trong workspace tuyển dụng và cấu hình thông báo.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Tên hiển thị nội bộ</label>
              <Input
                value={state.recruiterAlias}
                onChange={(event) =>
                  setState((current) => ({ ...current, recruiterAlias: event.target.value }))
                }
                placeholder="Tên recruiter hoặc hiring lead"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email nhận thông báo</label>
              <Input
                type="email"
                value={state.notificationEmail}
                onChange={(event) =>
                  setState((current) => ({ ...current, notificationEmail: event.target.value }))
                }
                placeholder="hr@company.com"
              />
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Workspace hiện tại
              </p>
              <p className="mt-2 text-base font-black text-slate-900">{companyName}</p>
              <p className="mt-1 text-sm text-slate-500">{viewerEmail}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Bảo mật
            </p>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">
              Kiểm soát truy cập recruiter
            </h3>
            <p className="text-sm leading-6 text-slate-500">
              Các lựa chọn này chuẩn bị cho kịch bản nhiều recruiter dùng chung một workspace.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <SettingCheckbox
              label="Yêu cầu xác nhận lại cho thao tác nhạy cảm"
              description="Áp dụng cho các thao tác như đóng tin, đổi trạng thái hồ sơ hoặc cập nhật thông tin công ty."
              checked={state.requireReauthForSensitiveActions}
              onChange={(checked) =>
                setState((current) => ({
                  ...current,
                  requireReauthForSensitiveActions: checked,
                }))
              }
            />
            <SettingCheckbox
              label="Nhận cảnh báo khi có thiết bị mới"
              description="Giúp recruiter phát hiện sớm truy cập lạ vào workspace tuyển dụng."
              checked={state.notifyNewDevice}
              onChange={(checked) =>
                setState((current) => ({ ...current, notifyNewDevice: checked }))
              }
            />
            <SettingCheckbox
              label="Ẩn thông tin liên hệ cho đến khi mở hồ sơ"
              description="Giữ kho ứng viên gọn gàng hơn khi sàng lọc nhanh danh sách công khai."
              checked={state.hideCandidateContactsUntilViewed}
              onChange={(checked) =>
                setState((current) => ({
                  ...current,
                  hideCandidateContactsUntilViewed: checked,
                }))
              }
            />
          </div>
        </section>
      </div>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Thông báo
          </p>
          <h3 className="text-2xl font-black tracking-tight text-slate-950">
            Quy tắc cảnh báo và nhắc việc
          </h3>
          <p className="text-sm leading-6 text-slate-500">
            Tập trung vào tín hiệu giúp recruiter phản ứng nhanh với ứng viên và tiến độ tuyển dụng.
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <SettingCheckbox
            label="Ứng viên mới vào pipeline"
            description="Thông báo khi có hồ sơ mới cho các job đang mở."
            checked={state.notifyNewCandidates}
            onChange={(checked) =>
              setState((current) => ({ ...current, notifyNewCandidates: checked }))
            }
          />
          <SettingCheckbox
            label="Ứng viên được lưu"
            description="Nhắc lại khi recruiter đánh dấu hồ sơ quan trọng để quay lại xử lý."
            checked={state.notifySavedCandidates}
            onChange={(checked) =>
              setState((current) => ({ ...current, notifySavedCandidates: checked }))
            }
          />
          <SettingCheckbox
            label="Lịch phỏng vấn"
            description="Ưu tiên thông báo gần giờ hẹn để tránh bỏ sót vòng phỏng vấn."
            checked={state.notifyInterviews}
            onChange={(checked) =>
              setState((current) => ({ ...current, notifyInterviews: checked }))
            }
          />
          <SettingCheckbox
            label="Báo cáo cuối ngày"
            description="Tổng hợp các biến động chính trong workspace tuyển dụng vào cuối ngày."
            checked={state.notifyDailyDigest}
            onChange={(checked) =>
              setState((current) => ({ ...current, notifyDailyDigest: checked }))
            }
          />
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={resetState}>
          Đặt lại trên thiết bị
        </Button>
        <Button onClick={persist}>Lưu tùy chọn</Button>
      </div>
    </div>
  );
}
