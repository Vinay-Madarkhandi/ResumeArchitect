import { Check, CircleHelp, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { Container, DisplayHeading, Lede } from "./Section";

const CALLOUTS = [
  { n: 1, title: "A written reason", body: "Why the line changed, in plain words, pointing back at the posting." },
  { n: 2, title: "The requirement it serves", body: "The must-have or nice-to-have from the job that this change answers." },
  { n: 3, title: "A Verify flag", body: "Any new number, name or skill your original doesn’t back up is marked for you to confirm." },
  { n: 4, title: "Its score impact", body: "How many points this one change is worth, computed the same way every time." },
  { n: 5, title: "Keep or revert", body: "Your call, one change at a time. Reverting puts your original words back." },
];

function Marker({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-brass bg-ground font-mono text-[11px] leading-none text-brass tabular",
        className,
      )}
    >
      {n}
    </span>
  );
}

function Callout({ n, title, body, side }: (typeof CALLOUTS)[number] & { side?: "left" | "right" }) {
  return (
    <li className={cn("relative flex gap-3", side === "left" && "lg:flex-row-reverse lg:text-right")}>
      <Marker n={n} className="mt-0.5" />
      <div className="min-w-0">
        <h3 className="text-body font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-small text-pretty text-ink-2">{body}</p>
      </div>
      <span
        aria-hidden
        className={cn(
          "absolute top-3 hidden h-px w-8 bg-line-strong lg:block",
          side === "left" ? "-right-10" : "-left-10",
        )}
      />
    </li>
  );
}

export function RedlineCloseUp() {
  return (
    <section id="redline" aria-labelledby="redline-title" className="scroll-mt-20 border-y border-line bg-panel/50 py-24 lg:py-32">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <DisplayHeading id="redline-title">One change, fully accounted for.</DisplayHeading>
          <Lede className="mx-auto mt-5">
            This is what every change looks like in review. Nothing reaches your download until you&rsquo;ve seen it,
            and nothing stays that you didn&rsquo;t choose to keep.
          </Lede>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)_minmax(0,1fr)] lg:items-center lg:gap-10">
          <ol className="hidden flex-col gap-14 lg:flex" aria-label="What each part shows, first three">
            {CALLOUTS.slice(0, 3).map((c) => (
              <Callout key={c.n} {...c} side="left" />
            ))}
          </ol>

          <figure className="min-w-0">
            <div className="paper px-6 py-5 sm:px-8" data-template="classic">
              <div className="paper-flow">
                <h3 style={{ marginTop: 0 }}>Support Engineer, Larkspur Software</h3>
                <div className="rl-hunk" data-focused="true">
                  <div className="rl-bullet">
                  <del className="mark-del">Handled customer</del> <ins className="mark-add">Resolved Tier 2</ins>{" "}
                  escalations for enterprise accounts <ins className="mark-add">in Zendesk</ins>
                  </div>
                </div>
              </div>
            </div>

            <div className="slug-card relative mx-auto -mt-2 w-[calc(100%-1.5rem)] rounded-lg border border-brass/60 bg-panel px-5 pb-4 pt-4 shadow-pop">
              <div className="flex items-center gap-2">
                <span className="text-small font-medium text-ink-2">Rewrite · Experience</span>
                <span className="ml-auto inline-flex items-center gap-2">
                  <span className="font-mono text-body text-add tabular">+4 pts</span>
                  <Marker n={4} />
                </span>
              </div>
              <div className="mt-3 flex items-start gap-2.5">
                <p className="flex-1 text-small text-ink-2">
                  The posting asks for Tier 2 support experience twice. Your line describes that work without using the
                  term.
                </p>
                <Marker n={1} />
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <p className="flex flex-1 flex-wrap items-center gap-1.5 text-label text-ink-3">
                  <Badge tone="brass">Must-have</Badge>
                  <span>2+ years of Tier 2 technical support</span>
                </p>
                <Marker n={2} />
              </div>
              <div className="mt-3 flex items-start gap-2.5">
                <p className="flex flex-1 items-start gap-1.5 rounded-md bg-query-soft px-2.5 py-2 text-label text-ink">
                  <Badge tone="query" className="-ml-0.5">
                    <CircleHelp aria-hidden /> Verify
                  </Badge>
                  <span className="pt-px">&ldquo;Zendesk&rdquo; isn&rsquo;t in your original resume. Keep it only if you used it.</span>
                </p>
                <Marker n={3} className="mt-1.5" />
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                <span className="inline-flex h-8 items-center gap-2 rounded-md bg-brass px-3 text-small font-medium text-on-brass">
                  <Check className="size-3.5" aria-hidden /> Keep
                </span>
                <span className="inline-flex h-8 items-center gap-2 rounded-md border border-line-strong bg-panel px-3 text-small font-medium text-ink">
                  <Undo2 className="size-3.5" aria-hidden /> Revert
                </span>
                <Marker n={5} className="ml-auto" />
              </div>
            </div>
            <figcaption className="mt-5 text-center text-label text-ink-3">
              Example resume and job. In the app, the change list holds one card like this per change.
            </figcaption>
          </figure>

          <div>
            <ol className="hidden flex-col gap-14 lg:flex" aria-label="What each part shows, last two">
              {CALLOUTS.slice(3).map((c) => (
                <Callout key={c.n} {...c} side="right" />
              ))}
            </ol>
            <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:hidden" aria-label="What each part shows">
              {CALLOUTS.map((c) => (
                <Callout key={c.n} {...c} />
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}
