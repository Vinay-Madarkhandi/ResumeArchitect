"use client";

import { useState } from "react";
import { ClipboardCopy, HelpCircle, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { LinkedInSuggestions as Suggestions } from "@/lib/schemas/career";
import type { ChangeFlag } from "@/lib/schemas/tailoring";
import { hasUnverifiedClaim } from "@/lib/grounding/placeholder";
import { useCareerPost } from "./useCareerPost";

function Flags({ flags }: { flags: ChangeFlag[] }) {
  if (!flags.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-md bg-query-soft px-3 py-2">
      {flags.map((f) => (
        <p key={f.value} className="flex gap-2 text-label text-ink">
          <HelpCircle className="mt-px size-3.5 shrink-0 text-query" aria-hidden /> {f.message}
        </p>
      ))}
    </div>
  );
}

function Copy({ text, what }: { text: string; what: string }) {
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Copy ${what}`}
      onClick={() =>
        void navigator.clipboard.writeText(text).then(
          () => toast(`${what[0].toUpperCase()}${what.slice(1)} copied.`, "success"),
          () => toast("Your browser blocked the clipboard.", "error"),
        )
      }
    >
      <ClipboardCopy aria-hidden /> Copy
    </Button>
  );
}

function ReviewDraft({ text, what, maxLength }: { text: string; what: string; maxLength: number }) {
  const [edited, setEdited] = useState(text);
  const [confirmed, setConfirmed] = useState(false);
  const ready = edited.trim() && !hasUnverifiedClaim(edited) && confirmed;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-small text-brass">Review and edit {what}</summary>
      <div className="mt-2 grid gap-2">
        <Field label={`Edit ${what}`}>
          {(props) => (
            <Textarea {...props} value={edited} maxLength={maxLength}
              onChange={(event) => { setEdited(event.target.value); setConfirmed(false); }} />
          )}
        </Field>
        <label className="flex items-center gap-2 text-small">
          <input type="checkbox" className="accent-brass" checked={confirmed}
            disabled={!edited.trim() || hasUnverifiedClaim(edited)} onChange={(event) => setConfirmed(event.target.checked)} />
          I verified the details in this draft
        </label>
        {ready && <Copy text={edited.trim()} what={what} />}
      </div>
    </details>
  );
}

/** Headline and About drafts from Gemini, each proofed against the resume. */
export function LinkedInSuggestions({ reviewId, initial, hasKey }: { reviewId: string; initial: Suggestions | null; hasKey: boolean }) {
  const [suggestions, setSuggestions] = useState(initial);
  const [draftVersion, setDraftVersion] = useState(0);
  const { post, busy, error } = useCareerPost<{ suggestions: Suggestions }>();

  async function suggest() {
    const data = await post(`/api/career/linkedin/${reviewId}/suggestions`, {});
    if (data) {
      setSuggestions(data.suggestions);
      setDraftVersion((version) => version + 1);
    }
  }

  const verify = (flags: ChangeFlag[]) =>
    flags.length > 0 && (
      <Badge tone="query">
        <HelpCircle aria-hidden /> Verify
      </Badge>
    );

  return (
    <section aria-labelledby="suggestions-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="suggestions-heading" className="text-title font-semibold">Suggested rewrites</h2>
        <Button size="sm" variant={suggestions ? "secondary" : "primary"} onClick={suggest} loading={busy} disabled={!hasKey}>
          <PenLine aria-hidden /> {busy ? "Writing…" : suggestions ? "Write new drafts" : "Suggest headline and About"}
        </Button>
      </div>
      <p className="text-small text-ink-3">
        Drafted from your resume. Replace verification placeholders with details you can confirm.
      </p>
      {error && <p role="alert" className="text-small text-danger">{error}</p>}
      {suggestions && (
        <>
          <div>
            <h3 className="text-small font-medium text-ink-2">Headlines</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {suggestions.headlines.map((h, index) => (
                <li key={`${draftVersion}-${index}`} className="rounded-lg border border-line bg-panel px-4 py-3">
                  <div className="flex items-start gap-3">
                    <p className="flex-1 text-body text-ink">{h.text}</p>
                    {verify(h.flags)}
                    {!h.flags.length && !hasUnverifiedClaim(h.text) && <Copy text={h.text} what="headline" />}
                  </div>
                  <p className="mt-1 font-mono text-label text-ink-3 tabular">{h.text.length} chars</p>
                  <Flags flags={h.flags} />
                  {(h.flags.length > 0 || hasUnverifiedClaim(h.text)) && <ReviewDraft text={h.text} what="headline" maxLength={220} />}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-small font-medium text-ink-2">About</h3>
              <div className="flex items-center gap-2">
                {verify(suggestions.about.flags)}
                {!suggestions.about.flags.length && !hasUnverifiedClaim(suggestions.about.text) && <Copy text={suggestions.about.text} what="About section" />}
              </div>
            </div>
            <div className="mt-2 rounded-lg border border-line bg-panel px-4 py-3">
              <p className="whitespace-pre-line text-body text-ink">{suggestions.about.text}</p>
              <Flags flags={suggestions.about.flags} />
              {(suggestions.about.flags.length > 0 || hasUnverifiedClaim(suggestions.about.text)) && (
                <ReviewDraft key={draftVersion} text={suggestions.about.text} what="About section" maxLength={2600} />
              )}
            </div>
          </div>
          {suggestions.notes.length > 0 && (
            <div>
              <h3 className="text-small font-medium text-ink-2">Also worth doing</h3>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-small text-ink-2">
                {suggestions.notes.map((n, index) => typeof n === "string" ? null : (
                  <li key={index}>{n.text}<Flags flags={n.flags} /></li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
