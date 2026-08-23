import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { resolveDocument } from "@/lib/documentConversion";
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

  // Just confirming this resume's content is exportable at all — the actual
  // PDF is rendered server-side on demand by /api/resumes/[id]/export, not
  // previewed here (see ExportClient: no live PDFViewer iframe anymore,
  // which is what broke on mobile browsers that don't render one inline).
  if (!resolveDocument(resume.content)) notFound();

  return <ExportClient resumeId={resume.id} title={resume.title} />;
}
