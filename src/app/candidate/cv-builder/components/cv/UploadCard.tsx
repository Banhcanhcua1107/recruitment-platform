import { Upload, ScanLine } from "lucide-react";

interface UploadCardProps {
  onClick: () => void;
}

export function UploadCard({ onClick }: UploadCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-[340px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 text-left transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-white hover:shadow-xl"
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-100">
        <Upload
          size={28}
          className="text-blue-400 transition-colors group-hover:text-blue-600"
        />
      </div>
      <h3 className="text-[17px] font-bold text-slate-800">Tải CV có sẵn</h3>
      <p className="mt-1 max-w-[200px] text-center text-sm font-medium text-slate-500">
        AI quét và nhập dữ liệu tự động
      </p>

      <div className="mt-5 flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-100/60 px-3.5 py-1.5 shadow-sm transition-colors group-hover:border-blue-300 group-hover:bg-blue-100">
        <ScanLine size={13} className="text-blue-600" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
          PDF • JPG • PNG • DOCX
        </span>
      </div>
    </button>
  );
}
