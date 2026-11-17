import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-page font-semibold">That page isn&rsquo;t here</h1>
        <p className="mt-2 text-body text-ink-2">The link may be old, or the resume was deleted.</p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: "primary" })}>
        Go to your applications
      </Link>
    </div>
  );
}
