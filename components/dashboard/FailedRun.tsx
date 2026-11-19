import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";

export function FailedRun({ id, message }: { id: string; message: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 text-body">
      <CircleAlert className="size-4 text-danger" aria-hidden />
      <p className="flex-1 text-ink-2">Your last tailoring run didn&rsquo;t finish{message ? `: ${message}` : "."}</p>
      <Link href={`/new?retry=${id}`} className={buttonVariants({ size: "sm" })}>
        <RefreshCw aria-hidden /> Retry
      </Link>
    </div>
  );
}
