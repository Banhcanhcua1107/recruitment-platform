import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStatsCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: string;
}

export function DashboardStatsCard({
  title,
  value,
  subtitle,
  icon,
}: DashboardStatsCardProps) {
  return (
    <Card className="flex h-full flex-col rounded-3xl border-slate-200/85 bg-white/95 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.24)]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {title}
          </p>
          <CardTitle className="text-4xl font-black tracking-tight">
            {value}
          </CardTitle>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-primary">
          <span className="material-symbols-outlined text-[30px]">{icon}</span>
        </div>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <p className="text-sm font-medium text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
