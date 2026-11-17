"use client";

import { useState, type FormEvent } from "react";
import { ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import type { GeminiKeyStatusT } from "@/lib/schemas/profile";

/**
 * Connect, replace, re-test, or remove the user's Gemini key. The key goes
 * to the server once, is tested against Google, encrypted, and never comes
 * back: the browser only ever sees its last four characters.
 */
export function GeminiKeyCard({
  initialStatus,
  initialLast4,
  onConnected,
}: {
  initialStatus: GeminiKeyStatusT;
  initialLast4: string | null;
  onConnected?: () => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [last4, setLast4] = useState(initialLast4);
  const [editing, setEditing] = useState(initialStatus === "not_configured");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return setError("Paste your API key.");
    setBusy("save");
    setError(null);
    const res = await fetch("/api/settings/gemini-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: value.trim() }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError(data?.error ?? "Couldn't save the key. Check your connection and try again.");
    setStatus("valid");
    setLast4(data.last4);
    setValue("");
    setEditing(false);
    toast("Gemini key connected.", "success");
    onConnected?.();
  }

  async function test() {
    setBusy("test");
    const res = await fetch("/api/settings/gemini-key/test", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(null);
    if (data?.valid) {
      setStatus("valid");
      toast("Your key works.", "success");
    } else {
      if (res?.status === 200) setStatus("invalid");
      toast(data?.message ?? "Couldn't check the key right now.", "error");
    }
  }

  async function remove() {
    setBusy("remove");
    const res = await fetch("/api/settings/gemini-key", { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return toast("Couldn't remove the key. Try again.", "error");
    setStatus("not_configured");
    setLast4(null);
    setEditing(true);
    toast("Key removed.", "info");
  }

  return (
    <section className="rounded-lg border border-line bg-panel">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <KeyRound className="mt-0.5 size-4 text-brass" aria-hidden />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lead font-semibold text-ink">Gemini API key</h2>
            {status === "valid" && <Badge tone="add">Connected</Badge>}
            {status === "invalid" && <Badge tone="del">Rejected by Google</Badge>}
            {status === "not_configured" && <Badge>Not connected</Badge>}
          </div>
          <p className="mt-1 text-small text-ink-2">
            Every AI step runs on your key with Gemini 2.5 Flash. It&rsquo;s encrypted at rest and never shown again.
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        {!editing && last4 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-body text-ink-2 tabular" aria-label={`Key ending in ${last4}`}>
              ••••&thinsp;••••&thinsp;••••&thinsp;<span className="text-ink">{last4}</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={test} loading={busy === "test"}>
                Test
              </Button>
              <Button size="sm" onClick={() => setEditing(true)}>
                Replace
              </Button>
              <Button size="sm" variant="ghost" onClick={remove} loading={busy === "remove"}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-3">
            <Field
              label="API key"
              error={error}
              hint={
                <>
                  Create one free at{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brass hover:underline"
                  >
                    Google AI Studio <ExternalLink className="size-3" aria-hidden />
                  </a>
                  . It starts with &ldquo;AIza&rdquo;.
                </>
              }
            >
              {(p) => (
                <Input
                  {...p}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="AIza…"
                  className="font-mono"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              )}
            </Field>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" loading={busy === "save"}>
                {busy === "save" ? "Checking with Google…" : "Connect key"}
              </Button>
              {last4 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-label text-ink-3">
              <ShieldCheck className="size-3.5" aria-hidden /> Sent once over HTTPS, stored with AES-256-GCM.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
