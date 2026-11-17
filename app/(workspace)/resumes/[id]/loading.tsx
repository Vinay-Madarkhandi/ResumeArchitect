import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true" aria-label="Loading resume">
      <div className="flex h-14 items-center gap-3 border-b border-line px-5">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid flex-1 lg:grid-cols-[1fr_23rem]">
        <div className="px-6 pt-16">
          <Skeleton className="mx-auto h-[70vh] max-w-[794px] rounded-sm" />
        </div>
        <div className="hidden border-l border-line p-4 lg:block">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
