import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";

const STEPS = [
  {
    number: "01",
    title: "Build your profile once",
    body: "Upload your existing resume. We parse it into a structured, editable profile — your master resume — that becomes the source of truth for every application.",
  },
  {
    number: "02",
    title: "Paste a job description",
    body: "Found a role? Paste the listing. Your master resume is already selected — no re-uploading, no starting from scratch.",
  },
  {
    number: "03",
    title: "Review your tailored resume",
    body: "See what changed and why, edit anything you like, then export a polished, print-ready PDF for that specific opportunity.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
      <header className="fixed top-0 z-50 w-full border-b border-outline-variant bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-margin-mobile md:px-margin-desktop">
          <span className="font-sans text-headline-md font-bold text-primary">ResumeArchitect</span>
          <nav className="hidden items-center gap-xl font-sans text-body-lg md:flex">
            <a href="#how-it-works" className="text-on-surface-variant transition-colors hover:text-secondary">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-md">
            <Link href="/sign-in" className="hidden font-sans text-button text-primary hover:text-secondary md:inline-flex">
              Sign in
            </Link>
            <Link href="/sign-up">
              <Button variant="primary">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24">
        <section className="mx-auto max-w-max-width-doc px-margin-mobile py-xxl text-center md:px-0">
          <h1 className="font-sans text-display-lg text-primary">
            Keep your experience.
            <br />
            Tailor how you present it.
          </h1>
          <p className="mx-auto mt-lg max-w-2xl font-doc text-body-doc text-on-surface-variant">
            You already have the experience. Build a resume once, then adapt it for every
            opportunity — without rewriting it from scratch each time.
          </p>
          <div className="mt-xl flex justify-center gap-md">
            <Link href="/sign-up">
              <Button variant="primary" size="lg">
                Get started
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg">
                See how it works
              </Button>
            </a>
          </div>

          <div className="relative mt-xxl overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-[var(--shadow-crisp)]">
            <div className="absolute left-0 top-0 h-1 w-full bg-secondary opacity-30" />
            <div className="grid grid-cols-1 gap-md text-left md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
                <p className="font-mono text-label-sm text-on-surface-variant">MASTER RESUME</p>
                <p className="mt-2 font-doc text-body-doc text-on-surface">
                  5 years of product design experience, React &amp; design systems, cross-functional
                  leadership&hellip;
                </p>
              </div>
              <Icon name="arrow-right" className="mx-auto hidden text-secondary md:block" size={28} />
              <div className="rounded-lg border border-secondary bg-secondary-container/20 p-md">
                <p className="font-mono text-label-sm text-on-secondary-container">
                  TAILORED — SENIOR PRODUCT DESIGNER @ TECHCORP
                </p>
                <p className="mt-2 font-doc text-body-doc text-on-surface">
                  Design-systems and React experience moved up front — directly relevant to this
                  role&rsquo;s requirements.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-outline-variant bg-surface-container-low py-xxl">
          <div className="mx-auto max-w-6xl px-margin-mobile md:px-margin-desktop">
            <div className="mb-xl text-center">
              <span className="font-mono text-label-sm uppercase tracking-widest text-secondary">
                Process
              </span>
              <h2 className="mt-sm font-sans text-headline-lg text-primary">
                One profile. Many job-specific resumes.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg transition-colors hover:border-secondary"
                >
                  <div className="mb-md flex h-12 w-12 items-center justify-center rounded bg-surface-container font-mono text-label-sm text-primary">
                    {step.number}
                  </div>
                  <h3 className="mb-sm font-sans text-headline-md text-primary">{step.title}</h3>
                  <p className="font-sans text-body-lg text-on-surface-variant">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-max-width-doc px-margin-mobile py-xxl text-center md:px-0">
          <h2 className="font-sans text-headline-lg text-primary">Your Gemini key. Your data.</h2>
          <p className="mx-auto mt-md max-w-2xl font-sans text-body-lg text-on-surface-variant">
            ResumeArchitect uses your own Google Gemini API key to tailor resumes — we never run AI
            generation on our own account, and your key is encrypted and never shown again after you
            save it.
          </p>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-low">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-md px-margin-mobile py-lg md:flex-row md:px-margin-desktop">
          <span className="font-sans text-headline-md font-bold text-primary">ResumeArchitect</span>
          <p className="font-mono text-label-sm text-on-surface-variant">
            &copy; {new Date().getFullYear()} ResumeArchitect
          </p>
        </div>
      </footer>
    </div>
  );
}
