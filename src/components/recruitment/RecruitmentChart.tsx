"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecruitmentTrendPoint } from "@/types/recruitment";

export function RecruitmentChart({ data }: { data: RecruitmentTrendPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      setIsReady(Boolean(rect && rect.width > 0 && rect.height > 0));
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Card className="rounded-[32px] border-slate-200/80">
      <CardHeader>
        <CardTitle>Xu hướng ứng tuyển</CardTitle>
        <p className="text-sm text-slate-500">
          Số hồ sơ nhận được trong 7 ngày gần nhất.
        </p>
      </CardHeader>
      <CardContent className="min-w-0">
        <div ref={containerRef} className="h-[320px] min-h-[320px] w-full min-w-[280px]">
          {isReady ? (
            <ResponsiveContainer width="100%" height={320} minWidth={280}>
              <BarChart data={data}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: "#dbeafe",
                    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
                  }}
                />
                <Bar
                  dataKey="applications"
                  fill="#2563eb"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-3xl bg-slate-100" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
