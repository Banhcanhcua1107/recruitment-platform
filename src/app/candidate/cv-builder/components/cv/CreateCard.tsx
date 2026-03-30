import Link from "next/link";
import { Plus } from "lucide-react";

interface CreateCardProps {
  compact?: boolean;
}

export function CreateCard({ compact = false }: CreateCardProps) {
  return (
    <Link
      href="/candidate/templates"
      className={`group flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white transition-colors duration-200 hover:border-emerald-400 hover:bg-emerald-50/40 ${
        compact ? "h-40 px-3.5" : "h-85"
      }`}
    >
      <div
        className={`mb-3 flex items-center justify-center rounded-full bg-slate-100 transition-colors duration-200 group-hover:bg-emerald-50 ${
          compact ? "size-10" : "size-16"
        }`}
      >
        <Plus
          size={compact ? 20 : 28}
          className="text-slate-400 transition-colors duration-200 group-hover:text-emerald-600"
        />
      </div>
      <h3 className={`${compact ? "text-sm" : "text-[17px]"} text-center font-bold leading-snug text-slate-800`}>
        Tao CV moi
      </h3>
      <p className={`mt-1 ${compact ? "text-[11px]" : "text-sm"} text-center font-medium text-slate-500`}>
        Bat dau tu thu vien mau
      </p>
    </Link>
  );
}
