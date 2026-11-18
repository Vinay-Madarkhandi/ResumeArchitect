import { listApplications } from "@/lib/data/resumes";

export function applicationLabel(row: { title: string; job_title: string | null; company: string | null }) {
  return row.job_title ? `${row.job_title}${row.company ? ` at ${row.company}` : ""}` : row.title;
}

/** Saved applications as target options, labeled by role and company. */
export async function applicationOptions(userId: string) {
  return (await listApplications(userId)).map((r) => ({ id: r.id, label: applicationLabel(r) }));
}
