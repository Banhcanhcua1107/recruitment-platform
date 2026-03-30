import { createClient } from "@/utils/supabase/server";

export default async function CandidateSecuritySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
            Account Access
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">Thông tin đăng nhập</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Email hiện tại</p>
              <p className="mt-2 text-base font-bold text-slate-900">{user?.email || "Chưa xác định"}</p>
            </div>
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">Đổi mật khẩu và quản lý phiên đăng nhập</p>
                  <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                    Luồng đổi mật khẩu và danh sách thiết bị chưa được gom về một module chung trong refactor này.
                    Phần route đã sẵn sàng để nối với auth settings tập trung ở phase sau.
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  TODO
                </span>
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-5">
          <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
            <h3 className="text-lg font-black text-slate-900">Gợi ý bảo mật</h3>
            <ul className="mt-4 space-y-3 text-sm font-medium leading-7 text-slate-500">
              <li className="rounded-2xl bg-slate-50 px-4 py-3">
                Bật xác thực hai bước khi hệ thống auth trung tâm hỗ trợ.
              </li>
              <li className="rounded-2xl bg-slate-50 px-4 py-3">
                Dùng email đăng nhập riêng cho tài khoản nghề nghiệp để quản lý cảnh báo tốt hơn.
              </li>
              <li className="rounded-2xl bg-slate-50 px-4 py-3">
                Kiểm tra lại các file CV đã tải lên và xóa bản cũ không còn dùng đến.
              </li>
            </ul>
          </article>

          <article className="rounded-[30px] border border-primary/10 bg-primary/5 p-6 shadow-[0_24px_60px_-42px_rgba(37,99,235,0.28)]">
            <p className="text-sm font-black text-primary">Ghi chú phase 3</p>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Trang này hiện đóng vai trò điểm neo UI cho phần cài đặt candidate. Khi auth viewer được hợp nhất ở
              các phase sau, khu vực này sẽ là nơi cắm quản lý phiên và quyền truy cập chi tiết hơn.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
