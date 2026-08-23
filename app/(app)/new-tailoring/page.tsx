import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { NewTailoringForm } from "./NewTailoringForm";

export default async function NewTailoringPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: resumes }, { data: profile }] = await Promise.all([
    supabase
      .from("resumes")
      .select("id, title, is_default")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase.from("profiles").select("gemini_key_status").eq("id", user.id).single(),
  ]);

  return (
    <div className="mx-auto max-w-max-width-doc px-margin-mobile py-lg md:px-0 md:py-xl">
      <h1 className="mb-1 font-sans text-headline-lg text-primary">New Tailoring</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        Pick a resume, paste the job description, and we&rsquo;ll tailor it for this role.
      </p>
      <NewTailoringForm
        resumes={(resumes ?? []).map((r) => ({ id: r.id, title: r.title, isDefault: r.is_default }))}
        geminiConfigured={profile?.gemini_key_status === "valid"}
      />
    </div>
  );
}
