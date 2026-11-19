import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ScanHistory } from "@/components/scan/ScanHistory";
import { buttonVariants } from "@/components/ui/Button";
import { requireOnboardedUser } from "@/lib/auth/onboarding";
import { listScans } from "@/lib/data/scans";

export const metadata: Metadata = { title: "Scan history" };

export default async function ScansPage() {
  const user = await requireOnboardedUser();
  const scans = await listScans(user.id);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-page font-semibold">Scan history</h1>
        <Link href="/scan" className={buttonVariants({ variant: "primary" })}><Plus aria-hidden /> New scan</Link>
      </div>
      <ScanHistory scans={scans} />
    </div>
  );
}
