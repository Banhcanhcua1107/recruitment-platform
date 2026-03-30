import { redirect } from "next/navigation";

export default function CandidateApplicationsRedirectPage() {
  redirect("/candidate/jobs/applied");
}
