"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { issueClipperToken, revokeClipperToken, type TokenActionState } from "@/app/actions/personal-tokens";

type TokenSummary = { id: string; name: string; createdAt: string; lastUsedAt: string | null };

export function PersonalTokens({ tokens }: { tokens: TokenSummary[] }) {
  const [result, action, pending] = useActionState<TokenActionState, FormData>(issueClipperToken, {});
  const [dismissed, setDismissed] = useState<string>();
  const [copyNotice, setCopyNotice] = useState("");
  const token = result.token === dismissed ? undefined : result.token;

  return (
    <section className="max-w-2xl space-y-4 rounded-lg border border-line bg-panel p-5">
      <div>
        <h2 className="text-lead font-semibold">Personal API tokens</h2>
        <p className="mt-1 text-small text-ink-2">Connect the browser clipper to save postings to your tracker.</p>
      </div>
      <form action={action} className="space-y-2" onSubmit={() => {
        setDismissed(result.token);
        setCopyNotice("");
      }}>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Token name" error={result.error}>
            {(props) => <Input {...props} name="name" placeholder="My browser clipper" required maxLength={80} />}
          </Field>
          <Button type="submit" loading={pending}>Create token</Button>
        </div>
      </form>
      {token && <div className="space-y-2 rounded-md border border-brass p-3">
        <p className="text-small text-ink-2">Copy the token now. This is the only time it’s shown.</p>
        <Field label="New personal API token">
          {(props) => <Input {...props} readOnly className="font-mono" value={token} onFocus={(event) => event.target.select()} />}
        </Field>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={async () => {
            try {
              await navigator.clipboard.writeText(token);
              setCopyNotice("Copied.");
            } catch {
              setCopyNotice("Select and copy the token from the field.");
            }
          }}>Copy token</Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(token)}>Dismiss</Button>
          <span role="status" className="text-small text-ink-2">{copyNotice}</span>
        </div>
      </div>}
      {tokens.length > 0 && <ul className="divide-y divide-line border-t border-line">
        {tokens.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 break-words">
            <p className="text-body font-medium">{entry.name}</p>
            <p className="text-small text-ink-3">
              Created {new Date(entry.createdAt).toISOString().slice(0, 10)} · {entry.lastUsedAt
                ? `Last used ${new Date(entry.lastUsedAt).toISOString().slice(0, 16).replace("T", " ")} UTC` : "Never used"}
            </p>
          </div>
          <form action={revokeClipperToken.bind(null, entry.id)} onSubmit={(event) => {
            if (!window.confirm(`Revoke “${entry.name}”?`)) event.preventDefault();
            else setDismissed(result.token);
          }}>
            <Button type="submit" size="sm" variant="danger" aria-label={`Revoke ${entry.name}`}>Revoke</Button>
          </form>
        </li>)}
      </ul>}
    </section>
  );
}
