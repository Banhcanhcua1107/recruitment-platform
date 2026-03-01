import type { Job } from "@/types/job";
import rawJobs from "@/data/real_jobs_data.json";

const jobs: Job[] = rawJobs as Job[];

/** Return every job (cached at module level). */
export function getAllJobs(): Job[] {
  return jobs;
}

/** Find a single job by its UUID id. */
export function getJobById(id: string): Job | undefined {
  return jobs.find((j) => j.id === id);
}

/** Return all unique locations present in the dataset. */
export function getAllLocations(): string[] {
  return [...new Set(jobs.map((j) => j.location).filter(Boolean))];
}

/** Return all unique industries present in the dataset. */
export function getAllIndustries(): string[] {
  const set = new Set<string>();
  for (const j of jobs) {
    for (const ind of j.industry) {
      if (ind) set.add(ind);
    }
  }
  return [...set];
}
