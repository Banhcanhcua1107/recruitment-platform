export default function JobsLoading() {
  return (
    <main className="flex-grow bg-[#f6f7f8]">
      {/* hero skeleton */}
      <section className="bg-white border-b border-slate-100 pt-14 pb-12 px-6">
        <div className="max-w-[1360px] mx-auto">
          <div className="h-12 w-96 max-w-full bg-slate-200 rounded-xl animate-pulse mb-4" />
          <div className="h-6 w-72 max-w-full bg-slate-100 rounded-lg animate-pulse mb-10" />
          <div className="h-[82px] max-w-6xl bg-slate-100 rounded-[28px] animate-pulse" />
        </div>
      </section>

      {/* grid skeleton */}
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm"
            >
              <div className="h-36 bg-slate-200 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-slate-200 animate-pulse" />
                  <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="h-5 w-full bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                <div className="flex gap-2 pt-2">
                  <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
