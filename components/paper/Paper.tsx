import type { ReactNode } from "react";
import type { BlockNode, DocumentContent, InlineNode } from "@/lib/schemas/document";
import { TEMPLATES, templateStyle, type TemplateId } from "@/lib/resume/templates";
import { cn } from "@/lib/cn";

/** The proof sheet: an A4 page at 96 dpi, set in the chosen template's measurements. */
export function Paper({
  template,
  children,
  className,
  compact,
}: {
  template: TemplateId;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      data-template={template}
      style={templateStyle(TEMPLATES[template])}
      className={cn(
        "paper mx-auto w-full",
        compact ? "max-w-[640px] px-8 py-8" : "max-w-[794px] px-6 py-8 sm:px-(--paper-pad-x) sm:py-(--paper-pad-y)",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === "hardBreak") return <br key={i} />;
        let el: ReactNode = n.text;
        const marks = n.marks ?? [];
        if (marks.some((m) => m.type === "italic")) el = <em>{el}</em>;
        if (marks.some((m) => m.type === "bold")) el = <strong>{el}</strong>;
        const link = marks.find((m) => m.type === "link");
        if (link && link.type === "link") {
          el = (
            <a href={link.attrs.href} target="_blank" rel="noreferrer">
              {el}
            </a>
          );
        }
        return <span key={i}>{el}</span>;
      })}
    </>
  );
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function textOf(nodes: InlineNode[]): string {
  return nodes.map((n) => (n.type === "text" ? n.text : " ")).join("");
}

function itemText(blocks: BlockNode[]): string {
  return blocks.map((b) => (b.type === "heading" || b.type === "paragraph" ? textOf(b.content) : b.content.map((i) => itemText(i.content)).join(" "))).join(" ");
}

function Block({ block, original }: { block: BlockNode; original?: Set<string> }) {
  const changed = (text: string) => (original && norm(text) && !original.has(norm(text)) ? "true" : undefined);
  switch (block.type) {
    case "heading": {
      const H = (`h${block.attrs.level}` as "h1" | "h2" | "h3");
      return (
        <H data-changed={changed(textOf(block.content))}>
          <Inline nodes={block.content} />
        </H>
      );
    }
    case "paragraph":
      return (
        <p data-changed={changed(textOf(block.content))}>
          <Inline nodes={block.content} />
        </p>
      );
    case "bulletList":
    case "orderedList": {
      const L = block.type === "bulletList" ? "ul" : "ol";
      return (
        <L start={block.type === "orderedList" ? block.attrs?.start : undefined}>
          {block.content.map((item, i) => (
            <li key={i} data-changed={changed(itemText(item.content))}>
              {item.content.map((b, j) => (
                <Block key={j} block={b} />
              ))}
            </li>
          ))}
        </L>
      );
    }
  }
}

/**
 * Read-only render of a document, for the original and compare views. With
 * `originalLines`, lines not present in the original are marked as changed.
 */
export function DocumentView({ doc, originalLines }: { doc: DocumentContent; originalLines?: string[] }) {
  const original = originalLines ? new Set(originalLines.map(norm)) : undefined;
  return (
    <div className="paper-flow" data-compare={original ? "true" : undefined}>
      {doc.content.map((b, i) => (
        <Block key={i} block={b} original={original} />
      ))}
    </div>
  );
}
