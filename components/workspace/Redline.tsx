"use client";

import { Fragment, type ReactNode } from "react";
import type { Hunk, WordOp } from "@/lib/resume/diff";
import type { RedlineItem } from "@/lib/resume/review";
import type { Unit } from "@/lib/resume/units";
import type { HeadingNode, ListItemNode, ParagraphNode } from "@/lib/schemas/document";
import { Inline } from "@/components/paper/Paper";

function Line({ unit, children, className, ...rest }: { unit: Unit; children: ReactNode; className?: string } & Record<string, unknown>) {
  const props = { className, ...rest };
  if (unit.kind === "heading") {
    const H = `h${unit.level ?? 2}` as "h1" | "h2" | "h3";
    return <H {...props}>{children}</H>;
  }
  if (unit.kind === "bullet" || unit.kind === "numbered") {
    return (
      <div {...props} className={`rl-bullet ${className ?? ""}`}>
        {children}
      </div>
    );
  }
  return <p {...props}>{children}</p>;
}

function unitInline(unit: Unit) {
  if (unit.kind === "bullet" || unit.kind === "numbered") {
    const first = (unit.node as ListItemNode).content[0];
    return first && (first.type === "paragraph" || first.type === "heading") ? first.content : [];
  }
  return (unit.node as HeadingNode | ParagraphNode).content;
}

export function Words({ ops }: { ops: WordOp[] }) {
  return (
    <>
      {ops.map((op, i) =>
        op.type === "equal" ? (
          <Fragment key={i}>{op.text}</Fragment>
        ) : op.type === "insert" ? (
          <ins key={i} className="mark-add">
            {op.text}
          </ins>
        ) : (
          <del key={i} className="mark-del">
            {op.text}
          </del>
        ),
      )}
    </>
  );
}

function HunkLines({ hunk }: { hunk: Hunk }) {
  if (hunk.kind === "modified" && hunk.words) {
    return (
      <Line unit={hunk.after[0]}>
        <Words ops={hunk.words} />
      </Line>
    );
  }
  return (
    <>
      {hunk.before.map((u, i) => (
        <Line key={`b${i}`} unit={u}>
          <del className="mark-del">{u.text}</del>
        </Line>
      ))}
      {hunk.after.map((u, i) => (
        <Line key={`a${i}`} unit={u}>
          <ins className="mark-add">{u.text}</ins>
        </Line>
      ))}
    </>
  );
}

/** The tailored resume as a proof with every change marked in place. */
export function Redline({
  items,
  focusedId,
  reviewed,
  onFocus,
}: {
  items: RedlineItem[];
  focusedId: string | null;
  reviewed: Set<string>;
  onFocus: (id: string) => void;
}) {
  return (
    <div className="paper-flow" data-focusing={focusedId ? "true" : undefined}>
      {items.map((item) =>
        item.type === "equal" ? (
          <Line key={`e${item.index}`} unit={item.unit} className="rl-equal">
            <Inline nodes={unitInline(item.unit)} />
          </Line>
        ) : (
          <div
            key={item.hunk.id}
            id={`hunk-${item.hunk.id}`}
            className="rl-hunk"
            data-focused={focusedId === item.hunk.id ? "true" : undefined}
            data-reviewed={reviewed.has(item.hunk.id) ? "true" : undefined}
            onClick={() => onFocus(item.hunk.id)}
            role="button"
            tabIndex={-1}
            aria-label="Show this change"
          >
            <HunkLines hunk={item.hunk} />
          </div>
        ),
      )}
    </div>
  );
}

/** The slug: original line struck over the new one (word-level when it's a rewrite). */
export function Slug({ hunk, clamp }: { hunk: Hunk; clamp?: boolean }) {
  const cls = clamp ? "line-clamp-3" : undefined;
  if (hunk.kind === "modified" && hunk.words) {
    return (
      <p className={cls}>
        <Words ops={hunk.words} />
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {hunk.before.map((u, i) => (
        <p key={`b${i}`} className={cls}>
          <del className="mark-del">{u.text}</del>
        </p>
      ))}
      {hunk.after.map((u, i) => (
        <p key={`a${i}`} className={cls}>
          <ins className="mark-add">{u.text}</ins>
        </p>
      ))}
    </div>
  );
}
