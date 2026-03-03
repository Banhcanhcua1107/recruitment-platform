/**
 * Import real_jobs_data.json into Supabase `jobs` table.
 *
 * Usage:
 *   npx tsx scripts/import-real-jobs.ts
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (preferred — bypasses RLS)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY (fallback — needs INSERT policy)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ── Config ───────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BATCH_SIZE = 200;

// ── Types ────────────────────────────────────
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
  description?: string[];
  requirements?: string[];
  benefits?: string[];
  industry?: string[];
  experience_level?: string | null;
  level?: string;
  employment_type?: string;
  deadline?: string;
  education_level?: string;
  age_range?: string;
  full_address?: string;
}

// ── Helpers ──────────────────────────────────

/** Map a raw JSON job to the DB row shape */
function toRow(job: RawJob) {
  return {
    id: job.id,
    title: job.title,
    company_name: job.company_name,
    logo_url: job.logo_url ?? null,
    cover_url: job.cover_url ?? null,
    salary: job.salary ?? null,
    location: job.location ?? null,
    posted_date: job.posted_date ?? null,
    source_url: job.source_url ?? null,
    description: job.description ?? [],
    requirements: job.requirements ?? [],
    benefits: job.benefits ?? [],
    industry: job.industry ?? [],
    experience_level: job.experience_level ?? null,
    level: job.level ?? null,
    employment_type: job.employment_type ?? null,
    deadline: job.deadline ?? null,
    education_level: job.education_level ?? null,
    age_range: job.age_range ?? null,
    full_address: job.full_address ?? null,
    raw: job, // store full original object
  };
}

// ── Main ─────────────────────────────────────
async function main() {
  // 1. Read JSON
  const filePath = path.resolve(__dirname, "../src/data/real_jobs_data.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const jobs: RawJob[] = JSON.parse(raw);

  console.log(`📂  Loaded ${jobs.length} jobs from real_jobs_data.json`);

  // 2. Deduplicate by id (in case JSON has duplicates)
  const unique = new Map<string, RawJob>();
  for (const job of jobs) {
    if (!unique.has(job.id)) {
      unique.set(job.id, job);
    }
  }
  const deduped = Array.from(unique.values());
  console.log(`🔑  ${deduped.length} unique jobs (deduped by id)`);

  // 3. Batch upsert
  const rows = deduped.map(toRow);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("jobs").upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`❌  Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(
        `✅  Batch ${Math.floor(i / BATCH_SIZE) + 1}: upserted ${batch.length} rows (${inserted}/${rows.length})`
      );
    }
  }

  console.log(`\n🏁  Done — ${inserted} inserted/updated, ${errors} failed`);

  // ── 4. Optional: Upload JSON backup to Supabase Storage ──
  try {
    console.log("\n📦  Uploading backup to Supabase Storage...");

    // Ensure bucket exists (ignore error if already created)
    await supabase.storage.createBucket("datasets", { public: false });

    const fileBuffer = fs.readFileSync(filePath);
    const { error: uploadError } = await supabase.storage
      .from("datasets")
      .upload("real_jobs_data.json", fileBuffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      console.warn("⚠️  Storage upload warning:", uploadError.message);
    } else {
      console.log("✅  Backup uploaded to storage: datasets/real_jobs_data.json");
    }
  } catch (err) {
    console.warn("⚠️  Storage upload skipped (bucket may not be configured):", err);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
