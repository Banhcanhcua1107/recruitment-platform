/** Job type matching src/data/real_jobs_data.json */
export interface Job {
  id: string; // UUID
  title: string;
  company_name: string;
  logo_url: string;
  cover_url: string;
  salary: string;
  location: string;
  posted_date: string;
  source_url: string;
  description: string[];
  requirements: string[];
  benefits: string[];
  industry: string[];
  experience_level: string | null;
  level: string;
  employment_type: string;
  deadline: string;
  education_level: string;
  age_range: string;
  full_address: string;
}
