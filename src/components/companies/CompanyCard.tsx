"use client";
import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";

interface CompanyCardProps {
  slug: string;
  name: string;
  industry: string;
  location: string;
  size: string;
  jobCount: number;
  logoUrl?: string | null;
}

function CompanyCard({
  slug,
  name,
  industry,
  location,
  size,
  jobCount,
  logoUrl,
}: CompanyCardProps) {
  const initial = name.charAt(0).toUpperCase();
  const hasLogo =
    logoUrl &&
    logoUrl !== "https://via.placeholder.com/150" &&
    !logoUrl.includes("placeholder");

  return (
    <Link
      href={`/companies/${slug}`}
      className="group bg-white border border-slate-100 rounded-3xl p-8 hover:border-primary/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_50px_rgba(30,77,183,0.12)] transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden h-full"
    >
      {/* decorative blur */}
      <div className="absolute -top-10 -right-10 size-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

      {/* Logo */}
      <div className="relative z-10 size-24 rounded-2xl bg-white border-2 border-slate-100 shadow-md mb-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 overflow-hidden shrink-0">
        {hasLogo ? (
          <Image
            src={logoUrl}
            alt={name}
            width={96}
            height={96}
            sizes="96px"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span className="text-3xl font-black text-primary">{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center">
        <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors mb-2 line-clamp-2 leading-snug tracking-tight">
          {name}
        </h3>
        <p className="text-sm font-bold text-primary/80 italic mb-4 line-clamp-1">{industry}</p>

        <div className="flex flex-wrap justify-center gap-4 mb-6 text-slate-400 font-bold text-xs uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            {location}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-primary" aria-hidden="true" />
            {size}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full pt-5 border-t border-slate-100 mt-auto relative z-10">
        <span className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-50 group-hover:bg-primary text-primary group-hover:text-white font-black rounded-2xl text-sm transition-all">
          {jobCount} việc làm đang tuyển
          <ArrowRight className="size-4.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export default memo(CompanyCard);
