import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ResumeCard } from "@/components/library/ResumeCard";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";

export default async function LibraryPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: resumes } = await supabase
    .from("resumes")
    .select("id, kind, title, is_default, status, job_title_snapshot, job_company_snapshot, updated_at, pdf_storage_path")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  const list = resumes ?? [];
  const hasMaster = list.some((r) => r.is_default);

  return (
    <div className="mx-auto max-w-6xl px-margin-mobile py-lg md:px-margin-desktop md:py-xl">
      <div className="mb-xl flex flex-col items-start justify-between gap-md md:flex-row md:items-center">
        <div>
          <h1 className="font-sans text-headline-lg text-primary">Your resumes</h1>
          <p className="font-sans text-body-lg text-on-surface-variant">
            {hasMaster ? "Pick up an old application or start a new one." : "Upload a resume to get started."}
          </p>
        </div>
        <Link href="/new-tailoring">
          <Button variant="primary" size="lg">
            <Icon name="new-tailoring" size={18} />
            New Tailoring
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-outline-variant p-xxl text-center">
          <Icon name="document" size={28} className="mx-auto mb-md text-on-surface-variant" />
          <h2 className="mb-1 font-sans text-headline-md text-on-surface">No resumes yet</h2>
          <p className="mb-md font-sans text-body-lg text-on-surface-variant">
            Upload your resume to create your master profile.
          </p>
          <Link href="/onboarding/upload">
            <Button variant="primary">Upload your resume</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {list.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}
    </div>
  );
}
