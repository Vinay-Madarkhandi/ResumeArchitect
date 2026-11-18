"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { deleteAllMyData, deleteMyAccount } from "@/app/actions/account";
import { beginTwoFactor, changeEmail, changePassword, disableTwoFactor, enableTwoFactor, signOut, signOutEverywhere } from "@/app/actions/auth";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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

function inputValue(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}

function Credentials({ twoFactor, passwordLabel = "Current password" }: { twoFactor: boolean; passwordLabel?: string }) {
  return (
    <>
      <Field label={passwordLabel}>
        {(p) => <Input {...p} type="password" name="password" autoComplete="current-password" required />}
      </Field>
      {twoFactor && <CodeField />}
    </>
  );
}

function CodeField() {
  return (
    <Field label="Authenticator or recovery code">
      {(p) => <Input {...p} name="code" autoComplete="one-time-code" required />}
    </Field>
  );
}

function SettingsForm({
  children, label, success, submit,
}: {
  children: ReactNode;
  label: string;
  success: string;
  submit: (form: FormData) => Promise<{ error?: string }>;
}) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    try {
      const result = await submit(new FormData(form));
      if (result.error) return toast(result.error, "error");
      form.reset();
      toast(success, "success");
    } catch {
      toast("Couldn't update your account. Try again.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={run} className="flex max-w-sm flex-col gap-3">
      {children}
      <Button type="submit" loading={pending} className="self-start">{label}</Button>
    </form>
  );
}

export function AccountSection({ email, twoFactor }: { email: string; twoFactor: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);

  async function leave(everywhere: boolean) {
    setLeaving(true);
    try {
      await (everywhere ? signOutEverywhere() : signOut());
      router.push("/");
      router.refresh();
    } catch {
      toast("Couldn't sign out. Try again.", "error");
      setLeaving(false);
    }
  }

  return (
    <>
      <Section title="Appearance" description="Dark is easier on the eyes at night; light suits bright rooms.">
        <ThemeToggle withLabel className="border border-line-strong px-3" />
      </Section>
      <Section title="Account" description={email}>
        <div className="space-y-6">
          <SettingsForm label="Change password" success="Password updated."
            submit={(form) => changePassword(inputValue(form, "password"), inputValue(form, "next"), inputValue(form, "code"))}>
            <Credentials twoFactor={twoFactor} />
            <Field label="New password" hint="At least 10 characters.">
              {(p) => <Input {...p} type="password" name="next" autoComplete="new-password" minLength={10} required />}
            </Field>
          </SettingsForm>
          <SettingsForm label="Change email" success="Check your new inbox for a verification link."
            submit={(form) => changeEmail(inputValue(form, "email"), inputValue(form, "password"), inputValue(form, "code"))}>
            <Field label="New email">
              {(p) => <Input {...p} type="email" name="email" autoComplete="email" required />}
            </Field>
            <Credentials twoFactor={twoFactor} />
          </SettingsForm>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" disabled={leaving} onClick={() => leave(false)}>Sign out</Button>
            <Button disabled={leaving} onClick={() => leave(true)}>Sign out everywhere</Button>
          </div>
        </div>
      </Section>
      <Section title="Two-factor authentication" description={twoFactor ? "Enabled" : "Protect sign-in with an authenticator app."}>
        <TwoFactor enabled={twoFactor} />
      </Section>
      <Section title="Your data">
        <a href="/api/account/export" className="text-small text-brass hover:underline">Download my data</a>
      </Section>
      <Section title="Delete data" description="Removes every resume, application, and your Gemini key. Your login stays.">
        <DeleteAll />
      </Section>
      <Section title="Delete account" description="Permanently removes your login and saved data.">
        <Dialog>
          <DialogTrigger asChild><Button variant="danger">Delete my account</Button></DialogTrigger>
          <DialogContent title="Delete your account?" description="Your resumes, applications and login will be permanently deleted.">
            <SettingsForm label="Permanently delete account" success="Account deleted." submit={async (form) => {
              const result = await deleteMyAccount(inputValue(form, "password"), inputValue(form, "code"));
              return result.ok ? {} : result;
            }}>
              <Credentials twoFactor={twoFactor} />
            </SettingsForm>
          </DialogContent>
        </Dialog>
      </Section>
    </>
  );
}

function TwoFactor({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [secret, setSecret] = useState<string>();
  const [codes, setCodes] = useState<string[]>();
  if (codes) {
    return (
      <div>
        <p className="text-body">Save these recovery codes somewhere safe. Each works once.</p>
        <ul className="my-3 grid gap-1 font-mono text-small sm:grid-cols-2">
          {codes.map((code) => <li key={code}>{code}</li>)}
        </ul>
        <Button onClick={() => { setCodes(undefined); setSecret(undefined); router.refresh(); }}>Done</Button>
      </div>
    );
  }
  if (enabled) {
    return (
      <SettingsForm label="Disable two-factor authentication" success="Two-factor authentication disabled." submit={async (form) => {
        const result = await disableTwoFactor(inputValue(form, "password"), inputValue(form, "code"));
        if (!result.error) router.refresh();
        return result;
      }}>
        <Credentials twoFactor />
      </SettingsForm>
    );
  }
  if (secret) {
    return (
      <div>
        <p className="mb-3 text-small">Add a time-based account to your authenticator with this setup key.</p>
        <code className="mb-4 block break-all font-mono text-body">{secret}</code>
        <SettingsForm label="Enable two-factor authentication" success="Two-factor authentication enabled." submit={async (form) => {
          const result = await enableTwoFactor(inputValue(form, "code"));
          if (result.codes) setCodes(result.codes);
          return result;
        }}>
          <Field label="Authenticator code">
            {(p) => <Input {...p} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required />}
          </Field>
        </SettingsForm>
      </div>
    );
  }
  return (
    <SettingsForm label="Set up two-factor authentication" success="Setup key generated." submit={async (form) => {
      const result = await beginTwoFactor(inputValue(form, "password"));
      if (result.secret) setSecret(result.secret);
      return result;
    }}>
      <Credentials twoFactor={false} />
    </SettingsForm>
  );
}

function DeleteAll() {
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function run() {
    setPending(true);
    try {
      const result = await deleteAllMyData();
      if (!result.ok) toast(result.error, "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="danger">Delete all my data</Button></DialogTrigger>
      <DialogContent title="Delete all your data?"
        description="Every resume, application, and score history is permanently deleted, and your key is removed. You'll start setup again.">
        <Field label='Type "delete" to confirm'>
          {(p) => <Input {...p} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />}
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button variant="danger" disabled={confirm.trim().toLowerCase() !== "delete"} loading={pending} onClick={run}>
            Delete everything
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
