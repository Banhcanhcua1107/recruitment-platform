export default function JobsLoading() {
  return (
    <main className="flex-grow bg-[#f7f9fb]">
      <section className="bg-gradient-to-b from-blue-50 to-[#f7f9fb] px-6 pb-16 pt-24 md:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-4 h-14 w-96 max-w-full animate-pulse rounded-2xl bg-slate-100" />
          <div className="mx-auto mb-12 h-6 w-[38rem] max-w-full animate-pulse rounded-xl bg-slate-50" />
          <div className="rounded-[28px] bg-white p-2 shadow-[0_24px_80px_rgba(37,99,235,0.08)]">
            <div className="h-16 w-full animate-pulse rounded-[22px] bg-slate-50" />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <div className="h-9 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-9 w-28 animate-pulse rounded-full bg-slate-100" />
            <div className="h-9 w-32 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-screen-2xl space-y-8 px-6 pb-24 pt-8 md:px-12">
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-3">
              <div className="h-9 w-64 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-5 w-96 max-w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div className="h-5 w-40 animate-pulse rounded-xl bg-slate-100" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="size-14 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="space-y-2">
                      <div className="h-5 w-36 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-50" />
                    </div>
                  </div>
                  <div className="h-7 w-16 animate-pulse rounded-full bg-slate-100" />
                </div>
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-50" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-slate-50" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-8">
          <div className="hidden w-80 shrink-0 lg:block">
            <div className="space-y-6">
              <div className="h-80 animate-pulse rounded-[28px] bg-slate-100" />
              <div className="h-56 animate-pulse rounded-[28px] bg-blue-100/80" />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <div className="h-9 w-52 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-5 w-80 max-w-full animate-pulse rounded-xl bg-slate-100" />
              </div>
              <div className="h-11 w-40 animate-pulse rounded-2xl bg-slate-100" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-5 md:flex-row">
                    <div className="size-16 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="h-6 w-72 max-w-full animate-pulse rounded bg-slate-100" />
                          <div className="h-4 w-48 max-w-full animate-pulse rounded bg-slate-50" />
                        </div>
                        <div className="h-10 w-28 animate-pulse rounded-2xl bg-blue-50" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-7 w-24 animate-pulse rounded-xl bg-slate-100" />
                        <div className="h-7 w-24 animate-pulse rounded-xl bg-slate-100" />
                        <div className="h-7 w-20 animate-pulse rounded-xl bg-slate-100" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
