import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const SECTION_LINKS = [
  { href: "#report", label: "Match report" },
  { href: "#features", label: "Features" },
  { href: "#self-hosted", label: "Your data" },
  { href: "#faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Logo />
        <nav aria-label="Page sections" className="ml-6 hidden items-center gap-1 md:flex">
          {SECTION_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-body text-ink-3 transition-colors duration-150 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
