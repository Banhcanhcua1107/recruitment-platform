
import React from "react";
import Link from "next/link";
import { CandidateProfile } from "@/types/dashboard";

interface ProfileStrengthProps {
  profile: CandidateProfile | null;
  loading?: boolean;
}

export default function ProfileStrength({ profile, loading }: ProfileStrengthProps) {
  if (loading) return (
      <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm h-[250px] animate-pulse">
      </div>
  );

  const percentage = profile?.completion_percentage || 0;

  return (
    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h4 className="text-xl font-black text-slate-900 italic">Sức mạnh hồ sơ</h4>
        <span className="text-primary font-black text-lg">{percentage}%</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
        <div 
          className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(30,77,183,0.4)] transition-all duration-1000 ease-out" 
          style={{width: `${percentage}%`}}
        ></div>
      </div>
      <p className="text-slate-500 font-bold mb-8 leading-relaxed">
        {percentage < 100 
            ? <>Hãy thêm Portfolio để đạt <span className="text-slate-900 font-black">100%</span> điểm tin cậy cho nhà tuyển dụng.</>
            : <>Hồ sơ của bạn đã hoàn hảo! Hãy sẵn sàng đón nhận cơ hội mới.</>
        }
      </p>
      <Link href="/candidate/profile">
          <button className="w-full py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all text-base cursor-pointer">
              {percentage < 100 ? "Bổ sung hồ sơ ngay" : "Xem hồ sơ"}
          </button>
      </Link>
    </div>
  );
}
