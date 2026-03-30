const NOTIFICATION_SECTIONS = [
  {
    title: "Cập nhật ứng tuyển",
    description: "Nhận thông báo khi trạng thái hồ sơ thay đổi hoặc có lịch phỏng vấn mới.",
  },
  {
    title: "Gợi ý việc làm",
    description: "Nhận đề xuất việc làm mới khi hệ thống phát hiện tin phù hợp với hồ sơ của bạn.",
  },
  {
    title: "Tin nhắn hệ thống",
    description: "Nhận các thông báo quan trọng về tài khoản, hồ sơ và CV đã lưu.",
  },
];

export default function CandidateNotificationSettingsPage() {
  return (
    <section className="space-y-5">
      <div className="rounded-[30px] border border-slate-200 bg-white px-6 py-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              Notification Preferences
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
              Trung tâm thông báo
            </h2>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
              Hạ tầng lưu tùy chọn chi tiết chưa được refactor trong phase này, nhưng cấu trúc route và khu vực
              thiết lập đã sẵn sàng để nối với backend khi multi-role permissions được mở rộng.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Sẵn sàng để nối backend
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {NOTIFICATION_SECTIONS.map((section) => (
          <article
            key={section.title}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">{section.title}</h3>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                  {section.description}
                </p>
              </div>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-400">
                Soon
              </span>
            </div>

            <div className="mt-6 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-700">Email</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Chưa bật lưu cấu hình
                  </p>
                </div>
                <div className="h-6 w-11 rounded-full bg-slate-200" aria-hidden="true" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
