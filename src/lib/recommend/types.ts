/**
 * Shared types for the recommendation pipeline.
 */

export interface CandidateProfile {
  desired_roles: string[];   // e.g. ["Frontend Developer", "React Developer"]
  hard_skills: string[];     // e.g. ["React", "TypeScript", "TailwindCSS"]
  soft_skills: string[];     // e.g. ["teamwork", "communication"]
  locations: string[];       // e.g. ["Hồ Chí Minh", "HCM"]
  experience_years: number;  // 0 if unknown
  raw_text: string;          // original combined text for fallback matching
}
