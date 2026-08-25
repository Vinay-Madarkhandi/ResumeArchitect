import { Skeleton } from "@/components/ui/Skeleton";

/** Shown while /library, /settings, or /new-tailoring's server component is
 * fetching from Supabase — without this, the whole route segment stays
 * blank until the fetch resolves, which is what read as "nothing happens
 * for a few seconds" after clicking a nav link. */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl px-margin-mobile py-lg md:px-margin-desktop md:py-xl">
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-xl h-5 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
