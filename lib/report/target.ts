import type { JobFacts } from "@/lib/schemas/jobFacts";

export interface ReportTarget {
  id: string;
  title: string;
  company: string | null;
  text: string;
  url: string | null;
  facts: JobFacts;
}
