import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { NewApplication } from "@/components/tailor/NewApplication";

export const metadata: Metadata = { title: "New application" };

export default async function NewApplicationPage({ searchParams }: PageProps<"/new">) {
  const { retry } = await searchParams;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: resumes }, { data: profile }] = await Promise.all([
    supabase
      .from("resumes")
      .select("id, title, kind, is_default, status")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("gemini_key_status").eq("id", user.id).single(),
  ]);

  // Master first, then tailored resumes (tailoring a tailored copy is allowed).
  const sources = (resumes ?? [])
    .filter((r) => r.kind === "tailored" || r.is_default)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((r) => ({ id: r.id, title: r.title, kind: r.kind }));

  return (
    <NewApplication
      sources={sources}
      hasKey={profile?.gemini_key_status === "valid"}
      retryId={typeof retry === "string" ? retry : null}
    />
  );
}
