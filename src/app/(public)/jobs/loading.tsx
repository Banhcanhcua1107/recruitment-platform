export default function JobsLoading() {
  return (
    <main className="flex-grow bg-[#f6f7f8]">
      {/* hero skeleton */}
      <section className="bg-white border-b border-slate-100 pt-14 pb-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center lg:items-start text-center lg:text-left relative z-10">
          <div className="h-12 w-96 max-w-full bg-slate-100 rounded-xl animate-pulse mb-4" />
          <div className="h-6 w-72 max-w-full bg-slate-50 rounded-lg animate-pulse mb-10" />
          <div className="h-24 max-w-5xl w-full bg-slate-50 rounded-[28px] animate-pulse" />
          <div className="mt-8 flex flex-wrap gap-3 w-full max-w-5xl justify-center lg:justify-start">
            <div className="h-10 w-24 bg-slate-50 rounded-xl animate-pulse" />
            <div className="h-10 w-32 bg-slate-50 rounded-xl animate-pulse" />
            <div className="h-10 w-28 bg-slate-50 rounded-xl animate-pulse" />
          </div>
        </div>
      </section>

      {/* grid skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-8 lg:py-10 flex gap-8">
        {/* sidebar skeleton */}
        <div className="hidden lg:flex w-[300px] shrink-0 flex-col space-y-6">
           <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse" />
           <div className="h-12 w-full bg-slate-100 rounded-xl animate-pulse" />
           <div className="h-32 w-full bg-slate-100 rounded-xl animate-pulse" />
           <div className="h-32 w-full bg-slate-100 rounded-xl animate-pulse" />
        </div>

        {/* cards skeleton */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex justify-between items-center w-full">
            <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-10 w-40 bg-slate-100 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[20px] border border-slate-100 overflow-hidden shadow-sm"
            >
              <div className="h-40 bg-slate-100 animate-pulse" />
              <div className="p-5 flex flex-col relative">
                <div className="absolute -top-10 right-5 size-14 rounded-2xl border-4 border-white bg-slate-200 animate-pulse" />
                <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse mb-3" />
                <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse mb-5" />
                <div className="h-8 w-24 bg-slate-50 rounded-lg mb-4 animate-pulse" />
                
                <div className="mt-auto space-y-3">
                  <div className="flex gap-4">
                     <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                     <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-slate-50 rounded-md animate-pulse" />
                    <div className="h-6 w-20 bg-slate-50 rounded-md animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </main>
  );
}
