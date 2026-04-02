"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/recruitment/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { RecruitmentCandidate } from "@/types/recruitment";

function formatAppliedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

interface CandidateRowProps {
  candidate: RecruitmentCandidate;
  onOpenDetail: (candidate: RecruitmentCandidate) => void;
}

export function CandidateRow({ candidate, onOpenDetail }: CandidateRowProps) {
  return (
    <TableRow className="group">
      <TableCell className="pl-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDetail(candidate)}
              className="text-left text-base font-medium tracking-tight text-primary transition hover:underline hover:decoration-primary/40 hover:underline-offset-4"
            >
              {candidate.fullName}
            </button>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-slate-600">
              {`ID: ${candidate.candidateCode}`}
            </span>
          </div>
          <div className="space-y-1 text-xs text-slate-500">
            <p>{candidate.email || "Chưa có email trong snapshot ứng tuyển"}</p>
            <p>{candidate.phone || "Chưa có số điện thoại trong snapshot ứng tuyển"}</p>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-2">
          <p className="font-medium text-slate-900">{candidate.appliedPosition}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link
              href={candidate.jobUrl}
              className="inline-flex items-center gap-1 text-slate-500 transition hover:text-primary"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              Mở job
            </Link>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <StatusBadge status={candidate.status} />
      </TableCell>

      <TableCell className="text-sm text-slate-600">{formatAppliedAt(candidate.appliedAt)}</TableCell>

      <TableCell className="pr-6 text-right">
        <button
          type="button"
          onClick={() => onOpenDetail(candidate)}
          className={buttonVariants("outline", "sm")}
        >
          Xem chi tiết
        </button>
      </TableCell>
    </TableRow>
  );
}
