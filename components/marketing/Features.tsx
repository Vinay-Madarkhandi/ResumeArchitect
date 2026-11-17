import { FileDown, PenLine } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { Container, DisplayHeading, Lede } from "./Section";

function Feature({
  title,
  body,
  isNew,
  className,
  children,
}: {
  title: string;
  body: ReactNode;
  isNew?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <article className={cn("flex min-w-0 flex-col bg-ground p-6 sm:p-8", className)}>
      <h3 className="flex flex-wrap items-center gap-2 text-title font-semibold text-ink">
        {title}
        {isNew && <Badge tone="brass">New</Badge>}
      </h3>
      <p className="mt-2 max-w-[34rem] text-body text-pretty text-ink-2">{body}</p>
      {children && <div className="mt-7 flex-1">{children}</div>}
    </article>
  );
}

function CompareMock() {
  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden>
      {(["Original", "Tailored"] as const).map((side) => (
        <div key={side}>
          <p className="mb-2 text-label text-ink-3">{side}</p>
          <div className="paper px-4 py-4 text-[11.5px]" data-template="classic">
            <div className="paper-flow" data-compare={side === "Tailored"}>
              <h2 style={{ marginTop: 0, fontSize: 10.5 }}>Experience</h2>
              <div className="rl-bullet" data-changed={side === "Tailored"}>
                {side === "Original" ? "Worked on the billing migration" : "Led the billing migration to Kafka"}
              </div>
              <div className="rl-bullet">Mentored four engineers</div>
              <div className="rl-bullet" data-changed={side === "Tailored"}>
                {side === "Original" ? "Built Kafka-driven alerts" : "Built event-driven Kafka alerts"}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AskAiMock() {
  return (
    <div className="relative" aria-hidden>
      <div className="paper px-5 py-5 text-[12.5px]" data-template="classic">
        <div className="paper-flow">
          <div className="rl-bullet">
            Wrote <span className="ai-pending">documentation and runbooks that the support team used daily</span>
          </div>
        </div>
      </div>
      <div className="relative -mt-3 ml-6 w-[min(17rem,calc(100%-1.5rem))] rounded-lg border border-line bg-raised p-2.5 shadow-pop">
        <div className="flex h-8 items-center gap-2 rounded-md border border-brass bg-sunken px-2.5 text-small text-ink">
          <PenLine className="size-3.5 text-ink-3" />
          Make it specific to API support
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Shorter", "Stronger verb", "Use the job’s terms"].map((s) => (
            <span key={s} className="rounded-sm bg-hover px-1.5 py-px text-label text-ink-2">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function KeywordMock() {
  const words = [
    { w: "Kafka", hit: true },
    { w: "incident response", hit: true },
    { w: "Go", hit: true },
    { w: "event-driven", hit: true },
    { w: "Terraform", hit: false },
    { w: "SLOs", hit: true },
    { w: "on-call", hit: true },
    { w: "gRPC", hit: false },
  ];
  return (
    <div>
      <ul className="flex flex-wrap gap-2" aria-label="Example keywords from a job post">
        {words.map((k) => (
          <li
            key={k.w}
            className={cn(
              "rounded-sm border px-2 py-0.5 text-small",
              k.hit ? "border-add/40 text-add" : "border-dashed border-line-strong text-ink-3",
            )}
          >
            {!k.hit && <span className="sr-only">Missing: </span>}
            {k.w}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-label text-ink-3">
        Solid border: in your resume. Dashed: in the post, not in your resume.
      </p>
    </div>
  );
}

const STAGES = [
  { name: "Saved", items: ["Data Engineer"] },
  { name: "Applied", items: ["Platform Engineer", "SRE II"] },
  { name: "Interviewing", items: ["Backend Engineer"] },
  { name: "Offer", items: [] },
  { name: "Rejected", items: ["Staff Engineer"] },
];

function TrackerMock() {
  return (
    <div className="overflow-hidden rounded-lg border border-line" aria-hidden>
      <div className="grid grid-cols-5 divide-x divide-line">
        {STAGES.map((s) => (
          <div key={s.name} className="min-w-0">
            <p className="flex items-center justify-between gap-1 border-b border-line bg-sunken px-2.5 py-2 text-label text-ink-2">
              <span className="truncate">{s.name}</span>
              <span className="font-mono text-ink-3 tabular">{s.items.length}</span>
            </p>
            <div className="min-h-24 space-y-1.5 p-1.5">
              {s.items.map((it) => (
                <p key={it} className="rounded-md border border-line bg-panel px-2 py-1.5 text-label break-words text-ink">
                  {it}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportMock() {
  return (
    <div className="flex items-end gap-4" aria-hidden>
      {(["classic", "modern"] as const).map((t) => (
        <div key={t} className="w-[7.5rem]">
          <div className="paper aspect-[1/1.32] px-3 py-3" data-template={t}>
            <div className="h-2 w-14 rounded-[1px] bg-paper-ink/80" />
            <div className="mt-2 h-1 w-20 rounded-[1px] bg-paper-muted/50" />
            <div
              className={cn("mt-3 h-1 w-10 rounded-[1px]", t === "modern" ? "bg-[oklch(48%_0.1_72)]" : "bg-paper-ink/70")}
            />
            {t === "classic" && <div className="mt-1 h-px w-full bg-paper-rule" />}
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mt-1.5 h-1 rounded-[1px] bg-paper-muted/35" style={{ width: `${92 - i * 9}%` }} />
            ))}
            <div className={cn("mt-3 h-1 w-8 rounded-[1px]", t === "modern" ? "bg-[oklch(48%_0.1_72)]" : "bg-paper-ink/70")} />
            {t === "classic" && <div className="mt-1 h-px w-full bg-paper-rule" />}
            {[0, 1].map((i) => (
              <div key={i} className="mt-1.5 h-1 rounded-[1px] bg-paper-muted/35" style={{ width: `${86 - i * 12}%` }} />
            ))}
          </div>
          <p className="mt-2 text-label capitalize text-ink-2">{t}</p>
        </div>
      ))}
      <div className="ml-auto hidden flex-col gap-1.5 sm:flex">
        {["PDF", "Word"].map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-small text-ink-2">
            <FileDown className="size-3.5 text-ink-3" />
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section aria-labelledby="features-title" className="py-24 lg:py-32">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <DisplayHeading id="features-title">The rest of the workbench.</DisplayHeading>
          <Lede className="lg:pb-1.5">
            Review is where it starts. From there you edit, compare, check the post&rsquo;s language, write the cover
            letter and track where each application stands.
          </Lede>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-12">
          <Feature
            className="lg:col-span-7"
            title="Compare against your original"
            body="Your original and the tailored page side by side, at print scale, with every changed line washed and marked in the margin."
          >
            <CompareMock />
          </Feature>
          <Feature
            className="lg:col-span-5"
            title="Ask AI on a selection"
            body="Edit the page directly like a document. Select a phrase and ask for a rewrite of just that part. It comes back as a change you review."
          >
            <AskAiMock />
          </Feature>
          <Feature
            className="lg:col-span-5"
            isNew
            title="Job-post keyword panel"
            body="The terms the role is searched by, marked as present or missing in your resume. Missing ones are a prompt, not an instruction to stuff them in."
          >
            <KeywordMock />
          </Feature>
          <Feature
            className="lg:col-span-7"
            isNew
            title="Application tracker"
            body="Every tailored resume is its own application. Move each one through Saved, Applied, Interviewing, Offer or Rejected, and keep the job post with it."
          >
            <TrackerMock />
          </Feature>
          <Feature
            className="lg:col-span-6"
            isNew
            title="A cover letter per application"
            body="Drafted from the same job post and your tailored resume, and kept with that application. Edit it in place before you send it."
          >
            <div className="paper px-5 py-5 text-[12.5px] leading-relaxed" data-template="classic" aria-hidden>
              <p style={{ color: "var(--paper-muted)", margin: 0 }}>Dear hiring team,</p>
              <p style={{ margin: "6px 0 0" }}>
                The posting asks for someone who has owned a migration end to end. At Tidewater Labs I led the move of
                our billing service to Kafka…
              </p>
            </div>
          </Feature>
          <Feature
            className="lg:col-span-6"
            title="PDF and Word, exactly as shown"
            body="Downloads are built from what’s on screen, nothing re-generated behind your back. Choose the Classic or Modern template, both set in a plain single-column structure."
          >
            <ExportMock />
          </Feature>
        </div>
        <p className="mt-4 text-label text-ink-3">Illustrations use example data.</p>
      </Container>
    </section>
  );
}
