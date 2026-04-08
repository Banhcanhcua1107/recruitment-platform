import Link from "next/link";
import { BriefcaseBusiness, ChevronDown } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white pt-16 pb-8 dark:border-slate-800 dark:bg-[#101922]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="flex size-6 items-center justify-center text-primary">
                <BriefcaseBusiness className="size-6" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-extrabold leading-tight">TalentFlow</h2>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Nền tảng tuyển dụng giúp kết nối ứng viên và nhà tuyển dụng nhanh hơn,
              rõ ràng hơn và hiệu quả hơn.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 transition-colors hover:text-primary">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="text-slate-400 transition-colors hover:text-primary">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white">Về TalentFlow</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Tuyển dụng
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white">Dành cho ứng viên</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/jobs" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Việc làm mới nhất
                </Link>
              </li>
              <li>
                <Link href="/candidate/cv-builder" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Tạo CV trực tuyến
                </Link>
              </li>
              <li>
                <Link href="/companies" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Cẩm nang nghề nghiệp
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white">Nhà tuyển dụng</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/hr/jobs/create" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Đăng tin tuyển dụng
                </Link>
              </li>
              <li>
                <Link href="/hr/candidates" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Tìm kiếm hồ sơ
                </Link>
              </li>
              <li>
                <Link href="/hr-home" className="text-sm text-slate-500 transition-colors hover:text-primary dark:text-slate-400">
                  Dịch vụ và bảng giá
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 md:flex-row dark:border-slate-800">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} TalentFlow. Bảo lưu mọi quyền.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Ngôn ngữ:</span>
            <div className="flex cursor-pointer items-center gap-1 text-slate-500 transition-colors hover:text-primary">
              <span className="text-sm font-medium">Tiếng Việt</span>
              <ChevronDown className="size-4" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
