import { Check, FileDown, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { atsRegistry } from "@/lib/ats/registry";
import { TEMPLATE_IDS } from "@/lib/resume/templates";
import { stageLabels, stages } from "@/lib/tracker/stages";
import { cn } from "@/lib/cn";
import { Container, DisplayHeading, Lede } from "./Section";

function Tag({ children, on }: { children: ReactNode; on?: boolean }) {
  return (
    <li className={cn("rounded-sm border px-2 py-0.5 text-small", on ? "border-add/40 text-add" : "border-line-strong text-ink-2")}>{children}</li>
  );
}

function AtsMock() {
  const names = ["Workday", "Greenhouse", "Lever", "iCIMS", "Taleo", "SuccessFactors", "SmartRecruiters", "Ashby", "Workable", "Jobvite"];
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-small text-ink-2">
        Job link: <span className="font-mono text-label text-ink-3">boards.greenhouse.io/northwind/jobs/123</span>
      </p>
      <p className="mt-3 text-body font-semibold text-ink">This posting runs on Greenhouse</p>
      <p className="mt-1 text-small text-ink-2">Guidance for it is quoted from the vendor&rsquo;s own documentation and cites its source.</p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Some of the systems recognized">
        {names.map((n) => <Tag key={n}>{n}</Tag>)}
        <li className="px-1 py-0.5 text-small text-ink-3">and more</li>
      </ul>
    </div>
  );
}

function PowerEditMock() {
  return (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="paper px-5 py-5 text-[12.5px]" data-template="classic" aria-hidden>
        <div className="paper-flow">
          <h2 style={{ marginTop: 0, fontSize: 11 }}>Skills</h2>
          <div className="rl-bullet">
            Go, PostgreSQL, Kafka, Docker, <ins className="mark-add">Kubernetes</ins>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-panel p-4">
        <p className="text-small text-ink-2">Match rate</p>
        <p className="mt-2 flex items-baseline gap-2 font-mono tabular">
          <span className="text-ink-3 line-through decoration-del/70 decoration-[1.5px]">72</span>
          <span className="inline-block border-b-2 border-brass pb-1 text-[26px] font-medium leading-none text-ink">76</span>
        </p>
        <p className="mt-3 text-label text-ink-3">Kubernetes moved from missing to found. Example data.</p>
      </div>
    </div>
  );
}

function TemplatesMock() {
  return (
    <div className="flex items-end gap-4" aria-hidden>
      {(["classic", "modern", "standard"] as const).map((t) => (
        <div key={t} className="w-[7rem]">
          <div className="paper aspect-[1/1.32] px-3 py-3" data-template={t === "standard" ? "classic" : t}>
            <div className="h-2 w-14 rounded-[1px] bg-paper-ink/80" />
            <div className="mt-2 h-1 w-20 rounded-[1px] bg-paper-muted/50" />
            <div className="mt-3 h-1 w-10 rounded-[1px] bg-paper-ink/70" />
            {[0, 1, 2, 3].map((i) => <div key={i} className="mt-1.5 h-1 rounded-[1px] bg-paper-muted/35" style={{ width: `${92 - i * 9}%` }} />)}
            <div className="mt-3 h-1 w-8 rounded-[1px] bg-paper-ink/70" />
            {[0, 1].map((i) => <div key={i} className="mt-1.5 h-1 rounded-[1px] bg-paper-muted/35" style={{ width: `${86 - i * 12}%` }} />)}
          </div>
          <p className="mt-2 text-label capitalize text-ink-2">{t}</p>
        </div>
      ))}
      <div className="ml-4 hidden flex-col gap-1.5 sm:flex">
        {["PDF", "Word"].map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-small text-ink-2">
            <FileDown className="size-3.5 text-ink-3" /> {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrackerMock() {
  const stages = [
    { name: "Saved", items: ["Data Engineer"] },
    { name: "Applied", items: ["Platform Engineer", "SRE II"] },
    { name: "Interviewing", items: ["Backend Engineer"] },
    { name: "Offer", items: [] as string[] },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-line" aria-hidden>
      <div className="grid grid-cols-4 divide-x divide-line">
        {stages.map((s) => (
          <div key={s.name} className="min-w-0">
            <p className="flex items-center justify-between gap-1 border-b border-line bg-sunken px-2.5 py-2 text-label text-ink-2">
              <span className="truncate">{s.name}</span>
              <span className="font-mono text-ink-3 tabular">{s.items.length}</span>
            </p>
            <div className="min-h-24 space-y-1.5 p-1.5">
              {s.items.map((it) => <p key={it} className="rounded-md border border-line bg-panel px-2 py-1.5 text-label break-words text-ink">{it}</p>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClipperMock() {
  const steps = ["Build the extension from the repository and load it in your browser", "Create a personal API token in Settings and paste it in", "Open a posting, review what it read, and save it"];
  return (
    <ol className="grid gap-3 rounded-lg border border-line bg-panel p-5">
      {steps.map((s, i) => (
        <li key={s} className="flex items-start gap-3 text-body text-ink-2">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-brass font-mono text-[11px] text-brass tabular">{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

function LinkedInMock() {
  const hits = [{ w: "Kafka", hit: true }, { w: "Go", hit: true }, { w: "incident response", hit: true }, { w: "Kubernetes", hit: false }];
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-small text-ink-2">Keywords from the role, in your profile text</p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Example keywords">
        {hits.map((k) => (
          <li key={k.w} className={cn("rounded-sm border px-2 py-0.5 text-small", k.hit ? "border-add/40 text-add" : "border-dashed border-line-strong text-ink-3")}>
            {!k.hit && <span className="sr-only">Missing: </span>}{k.w}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-label text-ink-3">Solid border: found. Dashed: missing. Example data.</p>
    </div>
  );
}

function RubricMock() {
  const rows = [["STAR structure", 30], ["Specificity", 25], ["Relevance", 25], ["Measurable result", 10], ["Length", 10]] as const;
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-small text-ink-2">The fixed rubric every answer is scored on</p>
      <dl className="mt-3 grid gap-2.5">
        {rows.map(([label, pts]) => (
          <div key={label} className="grid grid-cols-[8.5rem_minmax(0,1fr)_2rem] items-center gap-3">
            <dt className="text-small text-ink">{label}</dt>
            <dd className="h-1 rounded-full bg-sunken" aria-hidden><span className="block h-full rounded-full bg-brass" style={{ width: `${pts * 3}%` }} /></dd>
            <dd className="text-right font-mono text-label text-ink-3 tabular">{pts}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function LetterMock() {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <ul className="grid gap-2 text-small text-ink-2">
        <li className="flex items-center gap-2"><Check className="size-3.5 text-add" aria-hidden /> Names the company and the role</li>
        <li className="flex items-center gap-2"><Check className="size-3.5 text-add" aria-hidden /> Backs a claim with a number</li>
        <li className="flex items-center gap-2"><Minus className="size-3.5 text-ink-3" aria-hidden /> Mentions 3 of 5 requirements</li>
        <li className="flex items-center gap-2">Stock phrase found: <del className="mark-del">team player</del></li>
      </ul>
      <p className="mt-3 text-label text-ink-3">Example data.</p>
    </div>
  );
}

interface Feature { id: string; title: string; body: string; visual: ReactNode }

export const FEATURES: Record<string, Feature> = {
  ats: {
    id: "ats", title: "ATS identification",
    body: `Import a job from its link and the report tells you which applicant tracking system it runs on. ${atsRegistry.length} systems are recognized, and each one's tips are drawn from the vendor's documentation or marked as general best practice.`,
    visual: <AtsMock />,
  },
  powerEdit: {
    id: "power-edit", title: "Power Edit",
    body: "Edit your resume next to the report. Pick a job and the match rate and checklist recalculate as you type. Insert a missing skill or a saved bullet where your cursor is, and save the result as a new scan.",
    visual: <PowerEditMock />,
  },
  builder: {
    id: "builder", title: "Sejda-style PDF editor, templates and instant export",
    body: `Direct inline editing on an authentic A4 paper canvas with formatting ribbon, zoom controls, and instant section inserters. Guaranteed 100% ATS parser compatibility. Choose from ${TEMPLATE_IDS.length} executive typography templates, download pixel-perfect PDF or Word files, or share a read-only proof link.`,
    visual: <TemplatesMock />,
  },
  tracker: {
    id: "tracker", title: "Job tracker",
    body: `Move each posting through ${stages.map((stage) => stageLabels[stage]).join(", ").replace(/, ([^,]*)$/, " and $1")}, with notes, contacts, interview dates and a follow-up date. Import and export CSV, and opt in to a daily email digest.`,
    visual: <TrackerMock />,
  },
  clipper: {
    id: "clipper", title: "Browser clipper",
    body: "A Chrome and Firefox extension saves the posting you're reading to your tracker. It connects with a personal API token and only reads a page when you open its popup. You build it from the repository and load it unpacked.",
    visual: <ClipperMock />,
  },
  linkedin: {
    id: "linkedin", title: "LinkedIn review",
    body: "Paste the sections of your profile. See which of a role's keywords recruiters can find, what a complete profile still lacks, and get headline and About drafts built from your resume. Nothing connects to your LinkedIn account.",
    visual: <LinkedInMock />,
  },
  interview: {
    id: "interview", title: "Interview prep",
    body: "Behavioral, technical and role questions for one job, each with what the interviewer is listening for. Type an answer, or dictate it where your browser supports speech input, and get feedback against the rubric.",
    visual: <RubricMock />,
  },
  coverLetter: {
    id: "cover-letter", title: "Cover letter scanner",
    body: "Measure a letter against a job: which requirements it mentions, whether it names the company and role, whether a claim is backed by a number, and which stock phrases to cut. You can also draft one for an application and edit it in place.",
    visual: <LetterMock />,
  },
};

export function FeaturesIntro() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 pt-24 lg:pt-32">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <DisplayHeading id="features-title">Everything around the scanner.</DisplayHeading>
          <Lede className="lg:pb-1.5">
            Each of these is in the app today. They share one resume library and one saved job post, so a scan can lead
            straight into an edit, a tailored copy or a tracked application.
          </Lede>
        </div>
      </Container>
    </section>
  );
}

export function FeatureRows({ keys, last }: { keys: (keyof typeof FEATURES)[]; last?: boolean }) {
  return (
    <Container className={cn("pt-12", last ? "pb-24 lg:pb-32" : "pb-4")}>
      {keys.map((key) => {
        const f = FEATURES[key];
        return (
          <section key={f.id} id={f.id} aria-labelledby={`${f.id}-title`} className="grid scroll-mt-20 grid-cols-[minmax(0,1fr)] gap-8 border-t border-line py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
            <div>
              <h3 id={`${f.id}-title`} className="text-title font-semibold text-ink">{f.title}</h3>
              <p className="mt-3 max-w-[34rem] text-body text-pretty text-ink-2">{f.body}</p>
            </div>
            <div className="min-w-0">{f.visual}</div>
          </section>
        );
      })}
      {last && (
        <p className="border-t border-line pt-5 text-label text-ink-3">
          Illustrations use example data.
        </p>
      )}
    </Container>
  );
}
