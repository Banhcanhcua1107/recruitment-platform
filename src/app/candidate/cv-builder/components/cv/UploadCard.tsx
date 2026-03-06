import { Upload, ScanLine } from "lucide-react";

interface UploadCardProps {
  onClick: () => void;
}

export function UploadCard({ onClick }: UploadCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center h-[340px] rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 hover:bg-white hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer text-left w-full"
    >
      <div className="size-16 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-all mb-4 group-hover:scale-110 duration-300">
        <Upload size={28} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
      </div>
      <h3 className="text-[17px] font-bold text-slate-800">Upload CV có sẵn</h3>
      <p className="text-slate-500 text-sm mt-1 text-center font-medium max-w-[200px]">
        AI quét và nhập dữ liệu tự động
      </p>

      <div className="flex items-center gap-1.5 mt-5 px-3.5 py-1.5 rounded-full bg-blue-100/60 border border-blue-200/60 shadow-sm transition-colors group-hover:bg-blue-100 group-hover:border-blue-300">
        <ScanLine size={13} className="text-blue-600" />
        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
          PDF • JPG • PNG
        </span>
      </div>
    </button>
  );
}
