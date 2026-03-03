
export type ApplicationStatus = 'pending' | 'viewed' | 'interviewing' | 'offered' | 'rejected';

export interface DashboardStats {
  totalApplied: number;
  profileViews: number;
  interviews: number;
  savedJobs: number;
}

// Company interface is no longer needed as per new schema, 
// but we keep a simplified one locally if we want to group data in UI, 
// otherwise we flatten it.
// Let's flatten Job to match the DB table

export interface Job {
  id: string; // UUID text (matches real_jobs_data.json)
  title: string;
  company_name: string;
  logo_url?: string;
  location?: string;
  salary?: string;
  requirements?: string[];
  posted_date?: string;
  created_at?: string;
}

export interface Application {
  id: string;
  job_id: string; // UUID text FK
  status: ApplicationStatus;
  created_at: string;
  job: Job;
}

export interface CV {
  id: string;
  title: string;
  thumbnail_url?: string;
  updated_at: string;
  url: string;
}

export interface CandidateProfile {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  completion_percentage: number;
}

export interface DashboardData {
  user: CandidateProfile | null;
  stats: DashboardStats;
  recentApplications: Application[];
  recommendedJobs: Job[];
  cvs: CV[];
  isLoading: boolean;
  error: string | null;
}
