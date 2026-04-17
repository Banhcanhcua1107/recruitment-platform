import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY/ANON_KEY)");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");
const SEED_TAG = "seed_hr_testdev_real_jobs_v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type JsonTextArray = string[] | null | undefined;

interface RawJob {
  id: string;
  title: string;
  company_name: string;
  logo_url?: string;
  cover_url?: string;
  salary?: string;
  location?: string;
  posted_date?: string;
  source_url?: string;
  description?: JsonTextArray;
  requirements?: JsonTextArray;
  benefits?: JsonTextArray;
  industry?: JsonTextArray;
  experience_level?: string | null;
  level?: string;
  employment_type?: string;
  deadline?: string;
  education_level?: string;
  age_range?: string;
  full_address?: string;
}

interface HrProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface EmployerRow {
  id: string;
  company_name: string | null;
  email: string | null;
  logo_url: string | null;
  cover_url: string | null;
  location: string | null;
  industry: unknown;
  company_size: string | null;
  company_description: string | null;
}

interface JobRow {
  id: string;
  employer_id: string | null;
  title: string | null;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value: unknown): string {
  return normalizeText(value).toLocaleLowerCase("vi");
}

function isTestDevEmail(email: string): boolean {
  const v = email.toLowerCase();
  return v.endsWith("@gmail.test") || v.endsWith("@example.test") || v.endsWith("@example.com");
}

function toTextArray(value: JsonTextArray): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => normalizeText(item)).filter(Boolean)));
}

function stableInt(seed: string): number {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 8);
  return parseInt(hex, 16);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex
    .slice(12, 16)
    .join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function fallbackDescription(title: string, companyName: string): string[] {
  return [
    `Phu trach vi tri ${title} tai ${companyName} voi muc tieu dat ket qua kinh doanh ro rang.`,
    "Phoi hop voi cac phong ban lien quan de toi uu quy trinh va chat luong van hanh.",
    "Bao cao ket qua cong viec dinh ky, de xuat cai tien va theo doi chi so hieu qua.",
  ];
}

function fallbackRequirements(title: string): string[] {
  return [
    `Co kinh nghiem lien quan den vi tri ${title} va kha nang lam viec doc lap.`,
    "Ky nang giao tiep, phoi hop nhom va giai quyet van de tot.",
    "Tinh than trach nhiem cao, chu dong va san sang hoc hoi.",
  ];
}

function fallbackBenefits(): string[] {
  return [
    "Thu nhap canh tranh, xem xet dieu chinh theo hieu qua lam viec.",
    "Day du che do BHXH, BHYT, BHTN theo quy dinh.",
    "Moi truong chuyen nghiep, co lo trinh phat trien ro rang.",
  ];
}

function plusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function pickFiveDistinctJobs(pool: RawJob[], seed: string): RawJob[] {
  if (pool.length < 5) {
    throw new Error(`Dataset does not have enough jobs. Need >= 5, got ${pool.length}`);
  }

  const selected: RawJob[] = [];
  const usedTitles = new Set<string>();

  let index = stableInt(`${seed}:start`) % pool.length;
  let step = (stableInt(`${seed}:step`) % (pool.length - 1)) + 1;
  while (gcd(step, pool.length) !== 1) {
    step = (step % (pool.length - 1)) + 1;
  }

  for (let i = 0; i < pool.length * 3 && selected.length < 5; i += 1) {
    const candidate = pool[index];
    const titleKey = normalizeKey(candidate.title);
    if (!usedTitles.has(titleKey)) {
      selected.push(candidate);
      usedTitles.add(titleKey);
    }
    index = (index + step) % pool.length;
  }

  if (selected.length < 5) {
    for (const candidate of pool) {
      if (selected.length >= 5) break;
      const titleKey = normalizeKey(candidate.title);
      if (!usedTitles.has(titleKey)) {
        selected.push(candidate);
        usedTitles.add(titleKey);
      }
    }
  }

  if (selected.length < 5) {
    throw new Error("Could not pick 5 distinct job titles from dataset");
  }

  return selected;
}

async function tableExists(tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select("*").limit(1);
  if (!error) return true;
  const message = String(error.message ?? "").toLowerCase();
  if (message.includes("could not find the table") || message.includes("does not exist")) {
    return false;
  }
  throw new Error(`Unable to probe table ${tableName}: ${error.message}`);
}

function loadDataset(): RawJob[] {
  const candidates = [
    path.resolve(process.cwd(), "docs/real_jobs_data.json"),
    path.resolve(process.cwd(), "src/data/real_jobs_data.json"),
  ];

  const datasetPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!datasetPath) {
    throw new Error("Cannot find real_jobs_data.json in docs/ or src/data/");
  }

  const content = fs.readFileSync(datasetPath, "utf8");
  const parsed = JSON.parse(content) as RawJob[];

  const dedup = new Map<string, RawJob>();
  for (const item of parsed) {
    const id = normalizeText(item.id);
    const title = normalizeText(item.title);
    const companyName = normalizeText(item.company_name);
    if (!id || !title || !companyName) continue;
    if (!dedup.has(id)) dedup.set(id, item);
  }

  const jobs = Array.from(dedup.values()).sort((a, b) => {
    const ka = `${normalizeText(a.title)}|${normalizeText(a.company_name)}|${normalizeText(a.id)}`;
    const kb = `${normalizeText(b.title)}|${normalizeText(b.company_name)}|${normalizeText(b.id)}`;
    return ka.localeCompare(kb, "vi");
  });

  if (jobs.length < 5) {
    throw new Error(`Dataset has only ${jobs.length} valid jobs after cleanup`);
  }

  return jobs;
}

function ensureNonEmptyArray(value: JsonTextArray, fallback: string[]): string[] {
  const arr = toTextArray(value);
  return arr.length > 0 ? arr : fallback;
}

async function main() {
  const jobsPool = loadDataset();

  const uniqueCompanyNames = Array.from(
    new Set(jobsPool.map((job) => normalizeText(job.company_name)).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "vi"));

  const [hasCompanyProfiles, profilesRes, employersRes, jobsRes] = await Promise.all([
    tableExists("company_profiles"),
    supabase.from("profiles").select("id, email, full_name, role").eq("role", "hr"),
    supabase
      .from("employers")
      .select(
        "id, company_name, email, logo_url, cover_url, location, industry, company_size, company_description",
      ),
    supabase.from("jobs").select("id, employer_id, title").not("employer_id", "is", null),
  ]);

  if (profilesRes.error) throw new Error(`profiles query failed: ${profilesRes.error.message}`);
  if (employersRes.error) throw new Error(`employers query failed: ${employersRes.error.message}`);
  if (jobsRes.error) throw new Error(`jobs query failed: ${jobsRes.error.message}`);

  const hrProfiles = (profilesRes.data ?? [])
    .map((row) => ({
      id: String(row.id),
      email: normalizeText(row.email),
      full_name: row.full_name ? String(row.full_name) : null,
    }))
    .filter((row) => row.email && isTestDevEmail(row.email))
    .sort((a, b) => a.email.localeCompare(b.email, "vi"));

  if (hrProfiles.length === 0) {
    throw new Error("No HR test/dev accounts found in profiles");
  }

  const employersById = new Map(
    ((employersRes.data ?? []) as EmployerRow[]).map((row) => [String(row.id), row]),
  );

  const existingJobsByEmployer = new Map<string, JobRow[]>();
  for (const row of (jobsRes.data ?? []) as JobRow[]) {
    const employerId = String(row.employer_id ?? "");
    if (!employerId) continue;
    const list = existingJobsByEmployer.get(employerId) ?? [];
    list.push(row);
    existingJobsByEmployer.set(employerId, list);
  }

  const employerUpserts: Array<Record<string, unknown>> = [];
  const companyProfileUpserts: Array<Record<string, unknown>> = [];
  const desiredJobRows: Array<Record<string, unknown>> = [];
  const desiredJobIdsByEmployer = new Map<string, Set<string>>();

  const companyOffset = stableInt(`${SEED_TAG}:company_offset`) % uniqueCompanyNames.length;

  hrProfiles.forEach((hr, index) => {
    const mappedCompanyName = uniqueCompanyNames[(companyOffset + index) % uniqueCompanyNames.length];
    const pickedJobs = pickFiveDistinctJobs(jobsPool, `${SEED_TAG}:${hr.id}`);
    const representative = pickedJobs[0];

    const mergedIndustry = Array.from(
      new Set(
        pickedJobs
          .flatMap((item) => toTextArray(item.industry))
          .map((item) => normalizeText(item))
          .filter(Boolean),
      ),
    ).slice(0, 5);

    const employer = employersById.get(hr.id);
    employerUpserts.push({
      id: hr.id,
      email: hr.email,
      company_name: mappedCompanyName,
      logo_url: representative.logo_url ?? employer?.logo_url ?? null,
      cover_url: representative.cover_url ?? employer?.cover_url ?? null,
      location: representative.location ?? employer?.location ?? null,
      industry: mergedIndustry,
      company_size: employer?.company_size ?? "100-499",
      company_description:
        employer?.company_description ??
        `Doanh nghiep tap trung tuyen dung cac vai tro chat luong cao trong linh vuc ${
          mergedIndustry[0] ?? "tong hop"
        }.`,
    });

    if (hasCompanyProfiles) {
      const companyProfileDocument = {
        meta: {
          version: 1,
          generatedBy: SEED_TAG,
          generatedAt: new Date().toISOString(),
        },
        sections: [
          {
            id: "company-info",
            type: "company-info",
            title: "Thong tin cong ty",
            items: [
              { key: "name", label: "Ten cong ty", value: mappedCompanyName },
              { key: "email", label: "Email", value: hr.email },
              { key: "location", label: "Dia diem", value: representative.location ?? "" },
              { key: "size", label: "Quy mo", value: employer?.company_size ?? "100-499" },
              {
                key: "description",
                label: "Mo ta",
                value:
                  employer?.company_description ??
                  `Doanh nghiep tap trung tuyen dung cac vai tro chat luong cao trong linh vuc ${
                    mergedIndustry[0] ?? "tong hop"
                  }.`,
              },
            ],
          },
        ],
      };

      companyProfileUpserts.push({
        user_id: hr.id,
        company_name: mappedCompanyName,
        company_overview:
          employer?.company_description ??
          `Doanh nghiep tap trung tuyen dung cac vai tro chat luong cao trong linh vuc ${
            mergedIndustry[0] ?? "tong hop"
          }.`,
        email: hr.email,
        website: null,
        phone: null,
        logo_url: representative.logo_url ?? null,
        cover_url: representative.cover_url ?? null,
        location: representative.location ?? null,
        industry: mergedIndustry,
        company_size: employer?.company_size ?? "100-499",
        benefits: fallbackBenefits(),
        culture: ["Chu dong", "Hop tac", "Hoc hoi lien tuc"],
        vision: `Tro thanh doanh nghiep dan dau trong linh vuc ${mergedIndustry[0] ?? "tong hop"}.`,
        mission:
          "Xay dung moi truong lam viec hieu qua, minh bach va tao gia tri ben vung cho nhan su.",
        company_description:
          employer?.company_description ??
          `Doanh nghiep tap trung tuyen dung cac vai tro chat luong cao trong linh vuc ${
            mergedIndustry[0] ?? "tong hop"
          }.`,
        document: companyProfileDocument,
      });
    }

    const desiredIds = new Set<string>();

    pickedJobs.forEach((template, slot) => {
      const rowId = deterministicUuid(`${SEED_TAG}:${hr.id}:${slot}:${template.id}`);
      desiredIds.add(rowId);

      const title = normalizeText(template.title);
      desiredJobRows.push({
        id: rowId,
        title,
        company_name: mappedCompanyName,
        logo_url: template.logo_url ?? representative.logo_url ?? null,
        cover_url: template.cover_url ?? representative.cover_url ?? null,
        salary: template.salary ?? "Thoa thuan",
        location: template.location ?? representative.location ?? "TP. Ho Chi Minh",
        posted_date: template.posted_date ?? new Date().toISOString().slice(0, 10),
        source_url: template.source_url ?? null,
        description: ensureNonEmptyArray(
          template.description,
          fallbackDescription(title, mappedCompanyName),
        ),
        requirements: ensureNonEmptyArray(template.requirements, fallbackRequirements(title)),
        benefits: ensureNonEmptyArray(template.benefits, fallbackBenefits()),
        industry: toTextArray(template.industry),
        experience_level: template.experience_level ?? null,
        level: template.level ?? null,
        employment_type: template.employment_type ?? "Toan thoi gian",
        deadline: template.deadline ?? plusDays(30),
        education_level: template.education_level ?? null,
        age_range: template.age_range ?? null,
        full_address: template.full_address ?? template.location ?? null,
        raw: {
          seed_tag: SEED_TAG,
          seeded_for_hr: hr.email,
          seeded_slot: slot,
          source_job_id: template.id,
          source_company_name: template.company_name,
          source: template,
        },
        status: "open",
        employer_id: hr.id,
        is_public_visible: true,
        hr_email: hr.email,
        target_applications: 20,
      });
    });

    desiredJobIdsByEmployer.set(hr.id, desiredIds);
  });

  const jobsToDelete: string[] = [];
  for (const hr of hrProfiles) {
    const desiredIds = desiredJobIdsByEmployer.get(hr.id) ?? new Set<string>();
    const existing = existingJobsByEmployer.get(hr.id) ?? [];
    for (const job of existing) {
      const id = String(job.id);
      if (!desiredIds.has(id)) jobsToDelete.push(id);
    }
  }

  const beforeSummary = {
    hr_testdev_count: hrProfiles.length,
    employers_existing_for_hr: hrProfiles.filter((hr) => employersById.has(hr.id)).length,
    jobs_existing_for_hr: hrProfiles.reduce(
      (acc, hr) => acc + (existingJobsByEmployer.get(hr.id)?.length ?? 0),
      0,
    ),
    tables: {
      company_profiles: hasCompanyProfiles,
    },
  };

  const planPreview = hrProfiles.slice(0, 5).map((hr) => {
    const mappedRows = desiredJobRows.filter((row) => row.employer_id === hr.id);
    return {
      hr_email: hr.email,
      company_name: mappedRows[0]?.company_name ?? null,
      jobs: mappedRows.map((row) => row.title),
    };
  });

  console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", beforeSummary, planPreview }, null, 2));

  if (!APPLY) {
    console.log("Dry-run only. Re-run with --apply to write data.");
    return;
  }

  const { error: employerUpsertError } = await supabase
    .from("employers")
    .upsert(employerUpserts, { onConflict: "id" });
  if (employerUpsertError) {
    throw new Error(`Failed employer upsert: ${employerUpsertError.message}`);
  }

  if (hasCompanyProfiles && companyProfileUpserts.length > 0) {
    const { error: companyProfileUpsertError } = await supabase
      .from("company_profiles")
      .upsert(companyProfileUpserts, { onConflict: "user_id" });
    if (companyProfileUpsertError) {
      throw new Error(`Failed company_profiles upsert: ${companyProfileUpsertError.message}`);
    }
  }

  if (jobsToDelete.length > 0) {
    const batchSize = 200;
    for (let i = 0; i < jobsToDelete.length; i += batchSize) {
      const chunk = jobsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase.from("jobs").delete().in("id", chunk);
      if (deleteError) {
        throw new Error(`Failed deleting stale jobs: ${deleteError.message}`);
      }
    }
  }

  const { error: jobsUpsertError } = await supabase.from("jobs").upsert(desiredJobRows, {
    onConflict: "id",
  });
  if (jobsUpsertError) {
    throw new Error(`Failed jobs upsert: ${jobsUpsertError.message}`);
  }

  const hrIds = hrProfiles.map((row) => row.id);

  const [verifyEmployersRes, verifyJobsRes, verifyCompanyProfilesRes] = await Promise.all([
    supabase.from("employers").select("id, company_name").in("id", hrIds),
    supabase
      .from("jobs")
      .select("id, employer_id, title")
      .in("employer_id", hrIds)
      .order("employer_id", { ascending: true }),
    hasCompanyProfiles
      ? supabase.from("company_profiles").select("user_id, company_name").in("user_id", hrIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (verifyEmployersRes.error) {
    throw new Error(`Verification employers failed: ${verifyEmployersRes.error.message}`);
  }
  if (verifyJobsRes.error) {
    throw new Error(`Verification jobs failed: ${verifyJobsRes.error.message}`);
  }
  if (verifyCompanyProfilesRes.error) {
    throw new Error(`Verification company_profiles failed: ${verifyCompanyProfilesRes.error.message}`);
  }

  const jobsByEmployer = new Map<string, JobRow[]>();
  for (const row of (verifyJobsRes.data ?? []) as JobRow[]) {
    const employerId = String(row.employer_id ?? "");
    if (!employerId) continue;
    const list = jobsByEmployer.get(employerId) ?? [];
    list.push(row);
    jobsByEmployer.set(employerId, list);
  }

  const verification = hrProfiles.map((hr) => {
    const jobs = jobsByEmployer.get(hr.id) ?? [];
    const uniqueTitles = new Set(jobs.map((job) => normalizeKey(job.title)));
    return {
      hr_email: hr.email,
      employer_count: verifyEmployersRes.data?.some((emp) => String(emp.id) === hr.id) ? 1 : 0,
      company_profile_count: hasCompanyProfiles
        ? verifyCompanyProfilesRes.data?.filter((cp) => String(cp.user_id) === hr.id).length ?? 0
        : null,
      jobs_count: jobs.length,
      unique_title_count: uniqueTitles.size,
      sample_titles: jobs.slice(0, 5).map((job) => job.title),
    };
  });

  const failRows = verification.filter((row) => {
    const companyProfileOk = row.company_profile_count === null || row.company_profile_count === 1;
    return !(row.employer_count === 1 && row.jobs_count === 5 && row.unique_title_count === 5 && companyProfileOk);
  });

  const summary = {
    mode: "apply",
    hr_testdev_count: hrProfiles.length,
    expected_total_jobs: hrProfiles.length * 5,
    actual_total_jobs_for_hr: verification.reduce((acc, row) => acc + row.jobs_count, 0),
    fail_count: failRows.length,
    company_profiles_table_present: hasCompanyProfiles,
    changed: {
      employers_upserted: employerUpserts.length,
      company_profiles_upserted: hasCompanyProfiles ? companyProfileUpserts.length : 0,
      jobs_deleted: jobsToDelete.length,
      jobs_upserted: desiredJobRows.length,
    },
    verification_sample: verification.slice(0, 8),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (VERBOSE) {
    console.log(JSON.stringify({ failed_rows: failRows }, null, 2));
  }

  if (failRows.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
