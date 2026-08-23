import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ResumeContentSchema } from "@/lib/schemas/resume";
import { ExportClient } from "./ExportClient";

export default async function ResumeExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, user_id, title, content")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume) notFound();

  const parsedContent = ResumeContentSchema.safeParse(resume.content);
  if (!parsedContent.success) notFound();

  return <ExportClient resumeId={resume.id} title={resume.title} content={parsedContent.data} />;
}
