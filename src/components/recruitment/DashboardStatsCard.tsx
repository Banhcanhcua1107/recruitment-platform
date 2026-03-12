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
    <Card className="rounded-[28px] border-slate-200/80">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            {title}
          </p>
          <CardTitle className="text-4xl font-black tracking-tight">
            {value}
          </CardTitle>
        </div>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[30px]">{icon}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm font-medium text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
