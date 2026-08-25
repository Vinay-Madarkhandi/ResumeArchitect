import { Skeleton } from "@/components/ui/Skeleton";

/** Shown while a resume's editor or export page is loading its content,
 * source resume, and (for tailored resumes) change explanations from
 * Supabase — several sequential/parallel queries that otherwise left the
 * screen blank until every one resolved. */
export default function ResumeLoading() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-lg">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex flex-1 justify-center overflow-hidden bg-background p-lg md:p-xl">
        <Skeleton className="mx-auto w-full max-w-[720px]" />
      </div>
    </div>
  );
}
