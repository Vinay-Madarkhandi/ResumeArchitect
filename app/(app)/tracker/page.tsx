import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { listJobs } from "@/lib/data/jobs";
import { JobTracker } from "@/components/tracker/JobTracker";

export const metadata: Metadata = { title: "Job tracker" };

export default async function TrackerPage({ searchParams }: PageProps<"/tracker">) {
  const user = await requireOnboardedUser();
  const { job } = await searchParams;
  const jobs = await listJobs(user.id);
  return <JobTracker key={typeof job === "string" ? job : ""} jobs={jobs} initialJobId={typeof job === "string" ? job : null} />;
}
