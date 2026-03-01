export default function JobDetailLoading() {
  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      {/* cover skeleton */}
      <div className="h-56 md:h-72 bg-slate-200 animate-pulse" />

      <div className="max-w-240 mx-auto px-6 -mt-20 relative z-10 pb-16">
        {/* header card skeleton */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="size-20 rounded-2xl bg-slate-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-3 w-full">
              <div className="h-8 w-3/4 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-5 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
              <div className="flex flex-wrap gap-2 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-28 bg-slate-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* body skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-4"
              >
                <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 bg-slate-100 rounded animate-pulse ${
                      i === 0 ? 'w-4/5' : i === 1 ? 'w-3/4' : i === 2 ? 'w-2/3' : i === 3 ? 'w-1/2' : 'w-2/5'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>

          <aside>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
              <div className="h-6 w-36 bg-slate-200 rounded-lg animate-pulse" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-6 bg-slate-100 rounded animate-pulse" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
