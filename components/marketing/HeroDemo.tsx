"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleHelp, RotateCcw, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ScoreLockup } from "./ScoreLockup";

type Decision = "open" | "kept" | "reverted";

type Segment = { text: string } | { del: string; ins?: string } | { ins: string };

interface DemoChange {
  id: string;
  label: string;
  kind: "Rewrite" | "Added line";
  impact: number;
  segments: Segment[];
  reason: string;
  requirement: { tier: "Must-have" | "Nice-to-have"; text: string };
  verify?: string;
}

/** Example data, labeled on the page as an example resume and job. */
const BASE_SCORE = 52;
const FULL_SCORE = 81;
const CHANGES: DemoChange[] = [
  {
    id: "led",
    label: "Ownership",
    kind: "Rewrite",
    impact: 9,
    segments: [
      { del: "Worked on", ins: "Led" },
      { text: " the migration of the billing service to Kafka, cutting invoice latency 38%" },
    ],
    reason: "The post asks for someone who has owned a migration end to end. Your line describes leading it but says “worked on”.",
    requirement: { tier: "Must-have", text: "Led a large-scale platform migration" },
  },
  {
    id: "alerting",
    label: "Alerting",
    kind: "Rewrite",
    impact: 8,
    segments: [
      { text: "Built " },
      { del: "Kafka-driven", ins: "event-driven Kafka" },
      { text: " alerts for the payments team" },
    ],
    reason: "The role names event-driven systems. Your alerts already are, and the line now uses the posting’s own term.",
    requirement: { tier: "Nice-to-have", text: "Event-driven systems" },
  },
  {
    id: "oncall",
    label: "Incident response",
    kind: "Added line",
    impact: 12,
    segments: [{ ins: "Owned incident response for payments against a 99.95% uptime SLO" }],
    reason: "The post lists incident response twice. Your on-call bullet shows the work, and this line says so.",
    requirement: { tier: "Must-have", text: "Production incident response" },
    verify: "“99.95%” isn’t in your original resume. Confirm it before keeping.",
  },
];

function plainText(segments: Segment[], side: "before" | "after") {
  return segments
    .map((s) => ("text" in s ? s.text : side === "before" ? ("del" in s ? s.del : "") : (s.ins ?? "")))
    .join("");
}

function Marked({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) => {
        if ("text" in s) return <span key={i}>{s.text}</span>;
        return (
          <span key={i}>
            {"del" in s && <del className="mark-del">{s.del}</del>}
            {s.ins && <ins className="mark-add">{s.ins}</ins>}
          </span>
        );
      })}
    </>
  );
}

/** Counts toward a target over ~300ms; jumps when reduced motion is on. */
function useTween(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = reduce ? 1 : Math.min(1, (t - t0) / 320);
      const eased = 1 - Math.pow(2, -10 * p);
      const v = Math.round(start + (target - start) * (p === 1 ? 1 : eased));
      from.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

export function HeroDemo() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [focusId, setFocusId] = useState(CHANGES[0].id);
  const [announcement, setAnnouncement] = useState("");

  const decisionOf = (id: string): Decision => decisions[id] ?? "open";
  const score = BASE_SCORE + CHANGES.reduce((sum, c) => sum + (decisionOf(c.id) === "reverted" ? 0 : c.impact), 0);
  const shown = useTween(score);
  const focused = CHANGES.find((c) => c.id === focusId) ?? CHANGES[0];
  const focusedDecision = decisionOf(focused.id);
  const openCount = CHANGES.filter((c) => decisionOf(c.id) === "open").length;

  function decide(id: string, d: Decision) {
    const next = { ...decisions, [id]: d };
    setDecisions(next);
    const nextScore = BASE_SCORE + CHANGES.reduce((s, c) => s + ((next[c.id] ?? "open") === "reverted" ? 0 : c.impact), 0);
    setAnnouncement(
      `${d === "kept" ? "Kept" : d === "reverted" ? "Reverted" : "Reopened"}. Match score ${nextScore}.`,
    );
    if (d !== "open") {
      const after = CHANGES.find((c) => c.id !== id && (next[c.id] ?? "open") === "open");
      if (after) setFocusId(after.id);
    }
  }

  return (
    <figure className="relative" aria-labelledby="hero-demo-caption">
      <div className="relative sm:pr-10">
        <div className="mb-4 flex items-center justify-end sm:absolute sm:-right-2 sm:-top-8 sm:z-10 sm:mb-0">
          <div className="w-[13.5rem] rounded-lg border border-line bg-raised px-4 pb-3 pt-3 shadow-pop">
            <ScoreLockup before={BASE_SCORE} now={shown} />
            <p className="mt-2 text-label text-ink-3">Match score for this job</p>
          </div>
        </div>

        <div className="paper px-7 pb-20 pt-8 sm:px-11 sm:pb-24 sm:pt-10" data-template="classic">
          <div className="paper-flow" data-focusing="true">
            <h2 style={{ marginTop: 0 }}>Experience</h2>
            <h3>Senior Engineer, Tidewater Labs</h3>
            <p style={{ color: "var(--paper-muted)" }}>2021 – Present · Lisbon</p>
            {CHANGES.slice(0, 2).map((c) => (
              <Hunk key={c.id} change={c} decision={decisionOf(c.id)} focused={c.id === focusId} onFocus={setFocusId} />
            ))}
            <div className="rl-bullet rl-equal">Mentored four engineers through on-call rotations</div>
            <Hunk
              change={CHANGES[2]}
              decision={decisionOf(CHANGES[2].id)}
              focused={CHANGES[2].id === focusId}
              onFocus={setFocusId}
            />
          </div>
        </div>
      </div>

      <div
        key={focused.id}
        className="slug-card slug-in relative -mt-16 ml-auto w-full max-w-[22rem] rounded-lg border border-brass/60 bg-panel px-4 pb-3 pt-3.5 shadow-pop sm:-mt-20 sm:mr-[-0.75rem]"
      >
        <div className="flex items-center gap-2">
          <span className="text-label font-medium text-ink-2">{focused.kind}</span>
          {focused.verify && focusedDecision === "open" && (
            <Badge tone="query">
              <CircleHelp aria-hidden /> Verify
            </Badge>
          )}
          {focusedDecision !== "open" && (
            <Badge tone={focusedDecision === "kept" ? "add" : "neutral"}>
              {focusedDecision === "kept" ? "Kept" : "Reverted"}
            </Badge>
          )}
          <span className="ml-auto font-mono text-small text-add tabular">+{focused.impact} pts</span>
        </div>
        <p className="mt-2 text-small text-ink">
          <Marked segments={focused.segments} />
        </p>
        <p className="mt-2 text-small text-ink-2">{focused.reason}</p>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-label text-ink-3">
          <Badge tone="brass">{focused.requirement.tier}</Badge>
          <span>{focused.requirement.text}</span>
        </p>
        {focused.verify && focusedDecision === "open" && (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-query-soft px-2 py-1.5 text-label text-ink">
            <CircleHelp className="mt-px size-3.5 shrink-0 text-query" aria-hidden />
            {focused.verify}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
          {focusedDecision === "open" ? (
            <>
              <Button size="sm" variant="primary" onClick={() => decide(focused.id, "kept")}>
                <Check aria-hidden /> Keep
              </Button>
              <Button size="sm" onClick={() => decide(focused.id, "reverted")}>
                <Undo2 aria-hidden /> Revert
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => decide(focused.id, "open")}>
              <RotateCcw aria-hidden /> Undo
            </Button>
          )}
          <span className="ml-auto text-label text-ink-3">
            {openCount === 0 ? (
              <button
                type="button"
                className="rounded-sm text-ink-2 underline decoration-line-strong hover:text-ink"
                onClick={() => {
                  setDecisions({});
                  setFocusId(CHANGES[0].id);
                  setAnnouncement(`Example reset. Match score ${FULL_SCORE}.`);
                }}
              >
                Reset example
              </button>
            ) : (
              <>
                <span className="font-mono tabular">{openCount}</span> to review
              </>
            )}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-label text-ink-3">Changes:</span>
        {CHANGES.map((c) => {
          const d = decisionOf(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === focusId}
              onClick={() => setFocusId(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-label transition-colors duration-150",
                c.id === focusId ? "bg-hover text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  d === "open" ? "bg-brass" : "border border-line-strong bg-transparent",
                )}
                aria-hidden
              />
              {c.label}
              <span className="sr-only">{d === "open" ? ", not reviewed yet" : `, ${d}`}</span>
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <figcaption id="hero-demo-caption" className="mt-3 text-label text-ink-3">
        Example resume and job. Click a marked line, then keep or revert it.
      </figcaption>
    </figure>
  );
}

function Hunk({
  change,
  decision,
  focused,
  onFocus,
}: {
  change: DemoChange;
  decision: Decision;
  focused: boolean;
  onFocus: (id: string) => void;
}) {
  if (decision === "reverted" && change.kind === "Added line") {
    return (
      <button
        type="button"
        onClick={() => onFocus(change.id)}
        className="rl-hunk block w-full py-0.5 text-left text-[11px] italic"
        style={{ color: "var(--paper-muted)" }}
        data-reviewed="true"
        data-focused={focused}
      >
        Added line reverted
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onFocus(change.id)}
      aria-label={`${change.kind}: ${plainText(change.segments, decision === "reverted" ? "before" : "after")}. ${
        decision === "open" ? "Not reviewed yet" : decision === "kept" ? "Kept" : "Reverted"
      }`}
      className="rl-hunk block w-full text-left"
      data-reviewed={decision !== "open"}
      data-focused={focused}
    >
      <span className="rl-bullet block">
        {decision === "open" ? (
          <Marked segments={change.segments} />
        ) : (
          plainText(change.segments, decision === "kept" ? "after" : "before")
        )}
      </span>
    </button>
  );
}
