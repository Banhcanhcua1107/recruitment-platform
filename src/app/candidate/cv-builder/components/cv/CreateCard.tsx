import Link from "next/link";
import { Plus } from "lucide-react";

export function CreateCard() {
  return (
    <Link
      href="/candidate/templates"
      className="group flex flex-col items-center justify-center h-[340px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-white hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      <div className="size-16 rounded-full bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center transition-all mb-4 group-hover:scale-110 duration-300">
        <Plus size={28} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
      </div>
      <h3 className="text-[17px] font-bold text-slate-800">Tạo CV mới</h3>
      <p className="text-slate-500 text-sm mt-1 font-medium">Chọn từ thư viện mẫu</p>
    </Link>
  );
}
