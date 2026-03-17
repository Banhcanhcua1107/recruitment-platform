import Link from "next/link";
import { Plus } from "lucide-react";

export function CreateCard() {
  return (
    <Link
      href="/candidate/templates"
      className="group flex h-[340px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:bg-white hover:shadow-xl"
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-50">
        <Plus
          size={28}
          className="text-slate-400 transition-colors group-hover:text-emerald-500"
        />
      </div>
      <h3 className="text-[17px] font-bold text-slate-800">Tạo CV mới</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        Chọn từ thư viện mẫu
      </p>
    </Link>
  );
}
