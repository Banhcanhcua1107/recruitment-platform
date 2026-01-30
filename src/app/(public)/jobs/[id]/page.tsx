type Job = {
  id: number;
  title: string;
  company_name: string;
  logo_url: string;
  salary: string;
  location: string;
  requirements: string[];
  posted_date: string;
};

async function getJob(id: string): Promise<Job | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/jobs/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);

  if (!job) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600 font-black">Không tìm thấy job</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f8] px-6 py-10">
      <div className="max-w-[900px] mx-auto bg-white border border-slate-100 rounded-3xl p-8">
        <div className="flex gap-5 items-start">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 border overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={job.logo_url} alt={job.company_name} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-black text-slate-900">{job.title}</h1>
            <div className="mt-2 text-slate-600 font-bold">{job.company_name}</div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                {job.location}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                {job.salary}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                {job.posted_date}
              </span>
            </div>
          </div>
        </div>

        <hr className="my-8" />

        <h2 className="text-xl font-black text-slate-900">Yêu cầu</h2>
        <ul className="mt-3 list-disc pl-6 text-slate-700 font-semibold space-y-2">
          {job.requirements?.map((r, idx) => (
            <li key={idx}>{r}</li>
          ))}
        </ul>

        <div className="mt-10">
          <button className="h-12 px-6 rounded-2xl bg-black text-white font-black">
            Ứng tuyển ngay
          </button>
        </div>
      </div>
    </main>
  );
}
