import { Upload, ScanLine } from "lucide-react";

interface UploadCardProps {
  onClick: () => void;
  compact?: boolean;
}

export function UploadCard({ onClick, compact = false }: UploadCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-white text-left transition-colors duration-200 hover:border-sky-400 hover:bg-sky-50/40 ${
        compact ? "h-50 px-4" : "h-85"
      }`}
    >
      <div
        className={`mb-4 flex items-center justify-center rounded-full bg-sky-50 transition-colors duration-200 group-hover:bg-sky-100 ${
          compact ? "size-12" : "size-16"
        }`}
      >
        <Upload
          size={compact ? 22 : 28}
          className="text-sky-500 transition-colors duration-200 group-hover:text-sky-700"
        />
      </div>
      <h3 className={`${compact ? "text-[15px]" : "text-[17px]"} font-bold text-slate-800`}>
        Tai CV co san
      </h3>
      <p
        className={`mt-1 max-w-50 text-center ${compact ? "text-xs" : "text-sm"} font-medium text-slate-500`}
      >
        Nhap nhanh noi dung tu CV hien co
      </p>

      <div
        className={`mt-5 flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 transition-colors duration-200 group-hover:border-sky-300 group-hover:bg-sky-100 ${
          compact ? "px-3 py-1" : "px-3.5 py-1.5"
        }`}
      >
        <ScanLine size={compact ? 12 : 13} className="text-sky-700" />
        <span
          className={`${compact ? "text-[10px]" : "text-[11px]"} font-bold uppercase tracking-wider text-sky-700`}
        >
          PDF • JPG • PNG • DOCX
        </span>
      </div>
    </button>
  );
}
