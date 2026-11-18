"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Inline } from "@/components/paper/Paper";
import { loadBulletBank, removeFromBank, saveToBank } from "@/app/actions/bullets";
import type { SavedBullet } from "@/lib/data/bullets";
import { includedKeys, insertBullet, mergeBank, removeBullet, type BankBullet } from "@/lib/resume/bulletBank";
import { parseInline } from "@/lib/documentMarkdown";
import { inlineText } from "@/lib/resume/units";
import type { DocumentContent } from "@/lib/schemas/document";

type Entry = BankBullet & { id?: string };

const plain = (markdown: string) => inlineText(parseInline(markdown));

function groupByRole(entries: Entry[]): [string, Entry[]][] {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const label = e.role ?? e.section ?? "Other bullets";
    groups.set(label, [...(groups.get(label) ?? []), e]);
  }
  return [...groups];
}

/**
 * Career history for one resume: every bullet the user has written anywhere,
 * checked when this resume uses it. Unchecking keeps the bullet in history
 * so it can come back here or go into another resume.
 */
export function BulletBank({
  doc,
  resumeId,
  onChange,
}: {
  doc: DocumentContent;
  resumeId: string;
  onChange: (doc: DocumentContent) => void;
}) {
  const toast = useToast();
  const [bank, setBank] = useState<SavedBullet[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void loadBulletBank().then((result) => {
      if (!live) return;
      if (result.ok) setBank(result.data);
      else {
        setBank([]);
        toast(result.error, "error");
      }
    });
    return () => {
      live = false;
    };
  }, [toast]);

  const entries: Entry[] = useMemo(() => mergeBank(bank ?? [], doc), [bank, doc]);
  const included = useMemo(() => includedKeys(doc), [doc]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => e.key.includes(q) || (e.role ?? "").toLowerCase().includes(q)) : entries;
  }, [entries, query]);

  async function toggle(entry: Entry) {
    if (!included.has(entry.key)) return onChange(insertBullet(doc, entry));
    setBusy(entry.key);
    const saved = entry.id ? null : await saveToBank([entry], resumeId);
    setBusy(null);
    if (saved && !saved.ok) return toast(saved.error, "error");
    if (saved?.ok) setBank(saved.data);
    onChange(removeBullet(doc, entry.key));
  }

  async function forget(entry: SavedBullet) {
    setBusy(entry.key);
    const result = await removeFromBank(entry.id);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    setBank((b) => b?.filter((x) => x.id !== entry.id) ?? null);
  }

  if (!bank) {
    return (
      <p className="flex items-center gap-2 text-small text-ink-3" role="status">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Gathering bullets from your resumes
      </p>
    );
  }

  return (
    <section aria-label="Career history" className="flex flex-col gap-4">
      <p className="text-small text-ink-2">
        Every bullet from all your resumes. Tick one to use it here; untick to drop it from this resume only. It stays in your history.
      </p>
      {entries.length > 8 && (
        <label className="relative block">
          <span className="sr-only">Filter bullets</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by word or role" className="h-8 pl-8 text-small" />
        </label>
      )}
      {entries.length === 0 && <p className="text-small text-ink-3">No bullet points yet. Bullets you write in any resume collect here.</p>}
      {groupByRole(shown).map(([label, group]) => (
        <div key={label} className="flex flex-col gap-1.5">
          <h3 className="text-label font-medium text-ink-3">{label}</h3>
          <ul className="flex flex-col gap-1">
            {group.map((entry) => {
              const on = included.has(entry.key);
              return (
                <li key={entry.key} className="group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-hover">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={busy === entry.key}
                    onChange={() => void toggle(entry)}
                    aria-label={`Use in this resume: ${plain(entry.markdown)}`}
                    className="mt-[3px] size-3.5 shrink-0 accent-brass"
                  />
                  <span className={on ? "text-small text-ink" : "text-small text-ink-3"}>
                    <Inline nodes={parseInline(entry.markdown)} />
                  </span>
                  {!on && entry.id && (
                    <button
                      type="button"
                      onClick={() => void forget(entry as SavedBullet)}
                      className="ml-auto shrink-0 rounded p-0.5 text-ink-3 opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={`Remove from history: ${plain(entry.markdown)}`}
                      title="Remove from history"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
