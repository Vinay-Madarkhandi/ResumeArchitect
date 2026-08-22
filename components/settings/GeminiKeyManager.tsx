"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icon/Icon";
import type { GeminiKeyStatusT } from "@/lib/schemas/profile";

export function GeminiKeyManager({
  initialStatus,
  initialLast4,
  onSaved,
}: {
  initialStatus: GeminiKeyStatusT;
  initialLast4: string | null;
  onSaved?: () => void;
}) {
  const [status, setStatus] = useState<GeminiKeyStatusT>(initialStatus);
  const [last4, setLast4] = useState<string | null>(initialLast4);
  const [apiKey, setApiKey] = useState("");
  const [isEditing, setIsEditing] = useState(status === "not_configured");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  async function handleSave() {
    setMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/settings/gemini-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("invalid");
        setMessage({ text: body.error ?? "Something went wrong.", tone: "error" });
        return;
      }
      setStatus("valid");
      setLast4(body.last4);
      setApiKey("");
      setIsEditing(false);
      setMessage({ text: "Connected.", tone: "success" });
      onSaved?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTest() {
    setMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/settings/gemini-key/test", { method: "POST" });
      const body = await res.json();
      setStatus(body.valid ? "valid" : "invalid");
      setMessage({ text: body.message, tone: body.valid ? "success" : "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    setMessage(null);
    setIsSubmitting(true);
    try {
      await fetch("/api/settings/gemini-key", { method: "DELETE" });
      setStatus("not_configured");
      setLast4(null);
      setIsEditing(true);
      setMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="mb-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="api-key" size={18} className="text-secondary" />
          <h3 className="font-sans text-headline-md text-on-surface">Gemini API key</h3>
        </div>
        {status === "valid" && (
          <Badge variant="accent">
            <Icon name="verified" size={12} />
            Connected
          </Badge>
        )}
        {status === "invalid" && <Badge variant="error">Invalid</Badge>}
        {status === "not_configured" && <Badge variant="outline">Not configured</Badge>}
      </div>

      {!isEditing ? (
        <div className="flex items-center justify-between">
          <p className="font-mono text-label-sm text-on-surface-variant">•••• {last4}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handleTest} disabled={isSubmitting}>
              <Icon name="retry" size={14} />
              Test connection
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              Update
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={isSubmitting}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-sm font-sans text-body-lg text-on-surface-variant">
            Get a free key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:underline"
            >
              Google AI Studio
            </a>
            . This is used only for your own resume tailoring — we never see or store it in plain text.
          </p>
          <Label htmlFor="gemini-key">API key</Label>
          <Input
            id="gemini-key"
            type="password"
            placeholder="AIzaSy…"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="mt-sm flex gap-2">
            <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={isSubmitting || !apiKey}>
              {isSubmitting ? "Checking…" : "Save & test"}
            </Button>
            {status !== "not_configured" && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className="mt-sm">
          {message.tone === "error" ? (
            <FieldError>{message.text}</FieldError>
          ) : (
            <p className="font-sans text-xs text-secondary">{message.text}</p>
          )}
        </div>
      )}
    </div>
  );
}
