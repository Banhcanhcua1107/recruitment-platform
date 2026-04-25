export default function CvBuilderLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-8 w-64 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-full bg-slate-100" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-white bg-white p-5 shadow-sm">
            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-4 h-7 w-16 animate-pulse rounded-full bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="mb-3 h-24 animate-pulse rounded-2xl bg-slate-100 last:mb-0" />
        ))}
      </div>
    </div>
  );
}
