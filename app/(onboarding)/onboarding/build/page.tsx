import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { ResumeBuilder } from "@/components/builder/ResumeBuilder";

export const metadata: Metadata = { title: "Build your resume" };

export default async function BuildPage() {
  const user = await requireUser();
  return <ResumeBuilder email={user.email} />;
}
