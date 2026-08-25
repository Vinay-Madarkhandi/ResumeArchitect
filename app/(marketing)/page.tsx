import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/icon/Icon";

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
    title: "Edit live, right on the page",
    body: "Tailoring lands directly in a live document, not a form. Select any line and tell AI what to change, in place, then export a polished, print-ready PDF.",
  },
] as const;

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "editor",
    title: "A document, not a form",
    body: "No fixed Experience/Education fields to fight with. Write and structure your resume freely — headings, lists, emphasis — exactly like the page that gets exported.",
  },
  {
    icon: "ai-suggestion",
    title: "Select text, ask AI",
    body: "Highlight any line, describe the change, and preview the rewrite in place before accepting it. Nothing is ever applied silently.",
  },
  {
    icon: "verified",
    title: "Flagged, never fabricated",
    body: "Tailoring never invents employers or credentials. Anything that looks new gets visibly flagged for your review — you always have the final say.",
  },
  {
    icon: "api-key",
    title: "Your Gemini key, your data",
    body: "AI tailoring runs on your own Google Gemini API key. We never generate on our own account, and your key is encrypted and never shown again.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
      <header className="fixed top-0 z-50 w-full border-b border-outline-variant bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-margin-mobile md:px-margin-desktop">
          <span className="font-sans text-headline-md font-bold tracking-tight text-primary">
            ResumeArchitect
          </span>
          <nav className="hidden items-center gap-xl font-sans text-body-lg md:flex">
            <a href="#how-it-works" className="text-on-surface-variant transition-colors hover:text-secondary">
              How it works
            </a>
            <a href="#features" className="text-on-surface-variant transition-colors hover:text-secondary">
              Features
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

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <div className="bg-dot-grid -z-10" aria-hidden />
          <div className="relative mx-auto max-w-max-width-doc px-margin-mobile py-xxl text-center md:px-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 font-mono text-label-sm text-on-surface-variant shadow-[var(--shadow-soft)]">
              <Icon name="ai-suggestion" size={12} className="text-secondary" />
              LIVE, AI-ASSISTED RESUME EDITING
            </span>
            <h1 className="mt-lg font-sans text-display-lg text-primary">
              Keep your experience.
              <br />
              Tailor how you present it.
            </h1>
            <p className="mx-auto mt-lg max-w-2xl font-doc text-body-doc text-on-surface-variant">
              You already have the experience. Build a resume once, then adapt it for every
              opportunity — editing live, directly on the page, not in a form buried behind it.
            </p>
            <div className="mt-xl flex flex-col items-center justify-center gap-md sm:flex-row">
              <Link href="/sign-up">
                <Button variant="primary" size="lg">
                  Get started
                  <Icon name="arrow-right" size={16} />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="secondary" size="lg">
                  See how it works
                </Button>
              </a>
            </div>

            <div className="relative mt-xxl overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-left shadow-[var(--shadow-lifted)]">
              <div className="absolute left-0 top-0 h-1 w-full bg-secondary" />
              <div className="grid grid-cols-1 gap-md md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md">
                  <p className="font-mono text-label-sm text-on-surface-variant">MASTER RESUME</p>
                  <p className="mt-2 font-doc text-body-doc text-on-surface">
                    5 years of product design experience, React &amp; design systems, cross-functional
                    leadership&hellip;
                  </p>
                </div>
                <Icon name="arrow-right" className="mx-auto hidden text-secondary md:block" size={28} />
                <div className="relative rounded-lg border border-secondary bg-secondary-container/20 p-md">
                  <span className="ai-highlight absolute -left-1 top-3 h-4 w-1 rounded-full" aria-hidden />
                  <p className="font-mono text-label-sm text-on-secondary-container">
                    TAILORED — SENIOR PRODUCT DESIGNER @ TECHCORP
                  </p>
                  <p className="mt-2 font-doc text-body-doc text-on-surface">
                    <span className="ai-highlight">Design-systems and React experience</span> moved up
                    front — directly relevant to this role&rsquo;s requirements.
                  </p>
                </div>
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
            <div className="relative grid grid-cols-1 gap-lg md:grid-cols-3">
              <div
                className="absolute top-6 hidden h-px w-full bg-outline-variant md:block"
                aria-hidden
                style={{ left: 0 }}
              />
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className="relative rounded-lg border border-outline-variant bg-surface-container-lowest p-lg shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:border-secondary hover:shadow-[var(--shadow-lifted)]"
                >
                  <div className="mb-md flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest font-mono text-label-sm text-primary shadow-[var(--shadow-soft)]">
                    {step.number}
                  </div>
                  <h3 className="mb-sm font-sans text-headline-md text-primary">{step.title}</h3>
                  <p className="font-sans text-body-lg text-on-surface-variant">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-margin-mobile py-xxl md:px-margin-desktop">
          <div className="mb-xl text-center">
            <span className="font-mono text-label-sm uppercase tracking-widest text-secondary">
              Why it&rsquo;s different
            </span>
            <h2 className="mt-sm font-sans text-headline-lg text-primary">
              Built to feel like editing the resume, not a spreadsheet of it.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-md rounded-lg border border-outline-variant bg-surface-container-lowest p-lg shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lifted)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                  <Icon name={feature.icon} size={18} />
                </div>
                <div>
                  <h3 className="mb-1 font-sans text-headline-md text-primary">{feature.title}</h3>
                  <p className="font-sans text-body-lg text-on-surface-variant">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-outline-variant bg-surface-container-low py-xxl">
          <div className="mx-auto max-w-max-width-doc px-margin-mobile text-center md:px-0">
            <Icon name="api-key" size={28} className="mx-auto mb-md text-secondary" />
            <h2 className="font-sans text-headline-lg text-primary">Your Gemini key. Your data.</h2>
            <p className="mx-auto mt-md max-w-2xl font-sans text-body-lg text-on-surface-variant">
              ResumeArchitect uses your own Google Gemini API key to tailor resumes — we never run AI
              generation on our own account, and your key is encrypted and never shown again after you
              save it.
            </p>
            <div className="mt-xl">
              <Link href="/sign-up">
                <Button variant="primary" size="lg">
                  Get started
                  <Icon name="arrow-right" size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-low">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-md px-margin-mobile py-lg md:flex-row md:px-margin-desktop">
          <span className="font-sans text-headline-md font-bold tracking-tight text-primary">
            ResumeArchitect
          </span>
          <p className="font-mono text-label-sm text-on-surface-variant">
            &copy; {new Date().getFullYear()} ResumeArchitect
          </p>
        </div>
      </footer>
    </div>
  );
}
