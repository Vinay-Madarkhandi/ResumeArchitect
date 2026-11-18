import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";

/** The job the unit tests measure against; mirrors the fake Gemini's analysis used by e2e. */
export const NORTHWIND: JobAnalysis = {
  title: "Senior Backend Engineer",
  company: "Northwind Payments",
  seniority: "Senior",
  summary: "Own the payments platform end to end.",
  requirements: [
    { id: "go", label: "Go", aliases: ["Golang"], importance: "must", category: "skill" },
    { id: "postgres", label: "PostgreSQL", aliases: ["Postgres"], importance: "must", category: "tool" },
    { id: "kafka", label: "Kafka", aliases: [], importance: "must", category: "tool" },
    { id: "k8s", label: "Kubernetes", aliases: ["K8s"], importance: "nice", category: "tool" },
  ],
  keywords: [{ term: "payments", aliases: ["payment"] }],
};
