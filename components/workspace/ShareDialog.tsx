"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { loadResumeShare, publishResumeShare, unpublishResumeShare } from "@/app/actions/shares";
import { DocumentView, Paper } from "@/components/paper/Paper";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import type { TemplateId } from "@/lib/resume/templates";
import type { DocumentContent } from "@/lib/schemas/document";
import { hasUnverifiedClaim, RESOLVE_CLAIMS } from "@/lib/grounding/placeholder";
import { documentText } from "@/lib/resume/units";
import { contactBlockOptions, sharedDocument } from "@/lib/sharing/document";

type Share = { slug: string; views: number; passwordProtected: boolean };

export function ShareDialog({ resumeId, doc, template }: { resumeId: string; doc: DocumentContent; template: TemplateId }) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<Share | null>();
  const [contactBlocks, setContactBlocks] = useState<number[]>([]);
  const [hideContact, setHideContact] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const needsReview = hasUnverifiedClaim(documentText(doc));
  const path = share ? `/r/${share.slug}` : null;

  async function load() {
    setShare(undefined);
    setCopied(false);
    setError(undefined);
    try {
      const result = await loadResumeShare(resumeId);
      setShare(result.share);
      setError(result.error);
    } catch {
      setError("Couldn't load the sharing settings. Try again.");
    }
  }

  async function publish() {
    setBusy(true);
    setError(undefined);
    try {
      const result = await publishResumeShare(resumeId, { content: doc, template, hideContact, contactBlocks, password });
      if (result.share) {
        setShare(result.share);
        setPassword("");
      } else setError(result.error);
    } catch {
      setError("Couldn't publish the resume. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    setError(undefined);
    try {
      const result = await unpublishResumeShare(resumeId);
      if (result.ok) setShare(null);
      else setError(result.error);
    } catch {
      setError("Couldn't unpublish the resume. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setCopied(true);
    } catch {
      setError("Couldn't copy the link. Open the shared resume and copy its address.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (busy) return;
      setOpen(next);
      if (next) {
        setContactBlocks([]);
        void load();
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="Share resume">
          <Link2 aria-hidden /><span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent title="Share resume" description="Publish a copy of the resume as it looks now." className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="grid gap-4">
          {error && <p role="alert" className="text-small text-danger">{error}</p>}
          {share === undefined && (error
            ? <Button className="justify-self-start" onClick={() => void load()}>Try again</Button>
            : <p role="status" className="text-small text-ink-2">Loading sharing settings…</p>)}
          {share === null && (
            <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void publish(); }}>
              <label className="flex items-center gap-2 text-body">
                <input type="checkbox" className="accent-brass" checked={hideContact} disabled={busy} onChange={(e) => setHideContact(e.target.checked)} />
                Hide contact details
              </label>
              {hideContact && (
                <fieldset className="grid gap-2 rounded-md border border-line p-3">
                  <legend className="px-1 text-small font-medium">Mark contact blocks to hide</legend>
                  <p className="text-small text-ink-2">Select any blocks that contain private details. The preview also removes detected contact details throughout the resume.</p>
                  <div className="grid max-h-36 gap-2 overflow-auto">
                    {contactBlockOptions(doc).map(({ index, label }) => (
                      <label key={index} className="flex items-start gap-2 text-small">
                        <input type="checkbox" className="mt-1 accent-brass" checked={contactBlocks.includes(index)} disabled={busy}
                          onChange={(e) => setContactBlocks(e.target.checked ? [...contactBlocks, index] : contactBlocks.filter((i) => i !== index))} />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <section aria-label="Public preview" className="grid gap-2">
                <h3 className="text-small font-medium">Public preview</h3>
                <div className="max-h-52 overflow-auto rounded-md border border-line">
                  <Paper template={template}><DocumentView doc={sharedDocument(doc, hideContact, contactBlocks)} /></Paper>
                </div>
              </section>
              <Field label="Link password" optional hint="Leave blank for anyone with the link. Use at least 10 characters to require a password.">
                {(props) => <Input {...props} type="password" value={password} disabled={busy} onChange={(e) => setPassword(e.target.value)} maxLength={1024} minLength={10} autoComplete="new-password" />}
              </Field>
              {needsReview && <p className="text-small text-query">{RESOLVE_CLAIMS}</p>}
              <Button type="submit" variant="primary" disabled={needsReview} loading={busy} className="justify-self-start">Publish resume</Button>
            </form>
          )}
          {share && path && (
            <>
              <p className="text-body text-ink-2">
                {share.views} {share.views === 1 ? "view" : "views"} · {share.passwordProtected ? "Password protected" : "Anyone with the link"}
              </p>
              <a className="text-body text-brass underline" href={path} target="_blank" rel="noreferrer">Open shared resume</a>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void copy()}>{copied ? "Copied" : "Copy link"}</Button>
                <Button variant="danger" loading={busy} onClick={() => void unpublish()}>Unpublish</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
