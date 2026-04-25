export default function RecommendedJobsLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-8 w-72 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-100" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="size-11 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="mt-5 h-5 w-4/5 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
