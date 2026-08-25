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

  const columns = "id, kind, title, is_default, status, job_title_snapshot, job_company_snapshot, updated_at, pdf_storage_path";
  const [{ data: resumes }, { data: archived }] = await Promise.all([
    supabase
      .from("resumes")
      .select(columns)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase
      .from("resumes")
      .select(columns)
      .eq("user_id", user.id)
      .eq("status", "archived")
      .order("updated_at", { ascending: false }),
  ]);

  const list = resumes ?? [];
  const archivedList = archived ?? [];
  const hasMaster = list.some((r) => r.is_default);

  return (
    <div className="mx-auto max-w-6xl px-margin-mobile py-lg md:px-margin-desktop md:py-xl">
      <div className="mb-xl flex flex-col items-start justify-between gap-md md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-headline-lg text-primary">Your resumes</h1>
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
        <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-xxl text-center shadow-[var(--shadow-soft)]">
          <div className="bg-dot-grid -z-10" aria-hidden />
          <div className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest shadow-[var(--shadow-soft)]">
            <Icon name="document" size={24} className="text-secondary" />
          </div>
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

      {archivedList.length > 0 && (
        <details className="mt-xl">
          <summary className="cursor-pointer font-sans text-body-lg text-on-surface-variant hover:text-on-surface">
            Previous master resumes ({archivedList.length})
          </summary>
          <div className="mt-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {archivedList.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
