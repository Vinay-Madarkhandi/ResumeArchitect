import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { Container } from "./Section";
import { SECTION_LINKS } from "./SiteHeader";

export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="pb-20 lg:pb-28">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/60 p-8 sm:p-12 lg:p-16">
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-brass" />
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 font-mono text-label uppercase tracking-widest text-brass">
                Production-ready workbench
              </div>
              <h2
                id="closing-title"
                className="font-display text-[clamp(2.2rem,4.2vw,3.5rem)] font-normal leading-[1.04] tracking-[-0.025em] text-balance text-ink"
              >
                Engineered for the recruiter&rsquo;s eye.
                <br />
                <span className="font-serif italic text-brass">Structured for the ATS parser.</span>
              </h2>
              <p className="mt-4 max-w-[32rem] text-lead text-pretty text-ink-2">
                No subscription tiers, no monthly scan caps, and no black-box scoring. Deploy ResumeArchitect in Docker with full data sovereignty.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <Link href="/sign-up" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                Start building free <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link href="/sign-in" className="font-mono text-label text-ink-3 transition-colors hover:text-ink">
                Existing account? Sign in
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-sunken/40">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-small leading-relaxed text-ink-2">
            Free, self-hosted resume studio and job search workbench. Single-stream document canvas with deterministic ATS scoring.
          </p>
          <p className="mt-4 flex items-center gap-2 font-mono text-[11px] text-ink-3">
            <KeyRound className="size-3.5 text-brass" aria-hidden /> Powered by your private Gemini API key
          </p>
        </div>
        <nav aria-label="Product navigation">
          <h2 className="font-mono text-label uppercase tracking-wider text-ink font-semibold">Product</h2>
          <ul className="mt-3 space-y-2">
            {SECTION_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-small text-ink-3 transition-colors hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Account navigation">
          <h2 className="font-mono text-label uppercase tracking-wider text-ink font-semibold">Account</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/sign-up" className="text-small text-ink-3 transition-colors hover:text-ink">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/sign-in" className="text-small text-ink-3 transition-colors hover:text-ink">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/scan" className="text-small text-ink-3 transition-colors hover:text-ink">
                Scanner workbench
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
      <div className="border-t border-line/60">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4 font-mono text-[11px] text-ink-3">
          <span>
            © <span className="tabular">{new Date().getFullYear()}</span> ResumeArchitect · MIT Licensed
          </span>
          <span>AES-256-GCM envelope encryption · Zero third-party telemetry</span>
        </Container>
      </div>
    </footer>
  );
}
