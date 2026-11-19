import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { Container } from "./Section";
import { SECTION_LINKS } from "./SiteHeader";

export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="pb-24 lg:pb-32">
      <Container>
        <div className="relative overflow-hidden rounded-lg border border-line bg-panel px-6 py-14 sm:px-12 sm:py-16">
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-brass" />
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2
                id="closing-title"
                className="font-display text-[clamp(2.25rem,4.4vw,3.5rem)] font-normal leading-[1.02] tracking-[-0.02em] text-balance text-ink"
              >
                Run your first scan
                <br />
                <em className="text-brass">in a couple of minutes.</em>
              </h2>
              <p className="mt-5 max-w-[32rem] text-lead text-ink-2">
                Free to use with your own Gemini key, with no pricing tiers and no monthly scan cap. Your master resume
                is never changed by a scan or a tailoring run.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
              <Link href="/sign-up" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                Scan a resume <ArrowRight aria-hidden />
              </Link>
              <Link href="/sign-in" className="text-small text-ink-3 underline decoration-line-strong hover:text-ink">
                Already have one? Sign in
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
    <footer className="border-t border-line bg-sunken/60">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-small text-ink-2">
            A free, self-hosted resume scanner and job-search workbench. Bring your own Gemini key.
          </p>
          <p className="mt-5 flex items-center gap-2 text-small text-ink-3">
            <KeyRound className="size-4 text-brass" aria-hidden /> Built with your own Gemini key
          </p>
        </div>
        <nav aria-label="Product">
          <h2 className="text-small font-semibold text-ink">Product</h2>
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
        <nav aria-label="Account">
          <h2 className="text-small font-semibold text-ink">Account</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/sign-up" className="text-small text-ink-3 transition-colors hover:text-ink">
                Get started
              </Link>
            </li>
            <li>
              <Link href="/sign-in" className="text-small text-ink-3 transition-colors hover:text-ink">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-5 text-label text-ink-3">
          <span>
            © <span className="font-mono tabular">{new Date().getFullYear()}</span> ResumeArchitect
          </span>
          <span>Your Gemini key is encrypted at rest and never shown again.</span>
        </Container>
      </div>
    </footer>
  );
}
