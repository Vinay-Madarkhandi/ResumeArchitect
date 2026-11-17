"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { deleteAllMyData } from "@/app/actions/account";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 md:grid-cols-[16rem_1fr] md:gap-10">
      <div>
        <h2 className="text-lead font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-small text-ink-3">{description}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function AccountSection({ email }: { email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    setPending(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (updateError) return setError(updateError.message);
    setPassword("");
    toast("Password updated.", "success");
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Section title="Appearance" description="Dark is easier on the eyes at night; light suits bright rooms.">
        <ThemeToggle withLabel className="border border-line-strong px-3" />
      </Section>

      <Section title="Account" description={email}>
        <form onSubmit={changePassword} className="flex max-w-sm flex-col gap-3">
          <Field label="New password" error={error} hint="At least 8 characters.">
            {(p) => (
              <Input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={pending}>
              Change password
            </Button>
            <Button variant="ghost" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </form>
      </Section>

      <Section title="Delete data" description="Removes every resume, application, and your Gemini key. Your login stays.">
        <DeleteAll />
      </Section>
    </>
  );
}

function DeleteAll() {
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function run() {
    setPending(true);
    const result = await deleteAllMyData();
    // On success the action redirects; we only get here on failure.
    setPending(false);
    if (result && !result.ok) toast(result.error, "error");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="danger">Delete all my data</Button>
      </DialogTrigger>
      <DialogContent
        title="Delete all your data?"
        description="Every resume, application, and score history is permanently deleted, and your key is removed. You'll start setup again."
      >
        <Field label='Type "delete" to confirm'>
          {(p) => <Input {...p} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />}
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="danger" disabled={confirm.trim().toLowerCase() !== "delete"} loading={pending} onClick={run}>
            Delete everything
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
