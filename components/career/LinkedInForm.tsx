"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { LINKEDIN } from "@/lib/career/linkedin";
import { initialTarget, TargetPicker, toTargetInput, type ApplicationOption, type TargetKind } from "./TargetPicker";
import { useCareerPost } from "./useCareerPost";

const KINDS: TargetKind[] = ["none", "application", "posting", "role"];

const counter = (n: number, max: number) => (
  <span className={n > max ? "text-del" : undefined}>
    <span className="font-mono tabular">{n.toLocaleString("en-US")}</span> / <span className="font-mono tabular">{max.toLocaleString("en-US")}</span> characters
  </span>
);

export function LinkedInForm({ applications, hasKey }: { applications: ApplicationOption[]; hasKey: boolean }) {
  const router = useRouter();
  const [profile, setProfile] = useState({ headline: "", about: "", experience: "", skills: "", url: "" });
  const [target, setTarget] = useState(() => initialTarget(KINDS, applications));
  const { post, busy, error } = useCareerPost<{ id: string }>();
  const set = (key: keyof typeof profile) => (e: { target: { value: string } }) => setProfile((p) => ({ ...p, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const data = await post("/api/career/linkedin", { profile, target: toTargetInput(target) });
    if (data) router.push(`/linkedin/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_19rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <Field label="Headline" hint={counter(profile.headline.length, LINKEDIN.headlineMax)}>
          {(props) => <Input {...props} value={profile.headline} onChange={set("headline")} />}
        </Field>
        <Field label="About" hint={counter(profile.about.length, LINKEDIN.aboutMax)}>
          {(props) => <Textarea {...props} rows={7} value={profile.about} onChange={set("about")} />}
        </Field>
        <Field label="Experience" hint="Paste every role: title, company, dates and the lines under it.">
          {(props) => <Textarea {...props} rows={9} value={profile.experience} onChange={set("experience")} />}
        </Field>
        <Field label="Skills" hint="One per line, or separated by commas.">
          {(props) => <Textarea {...props} rows={3} value={profile.skills} onChange={set("skills")} />}
        </Field>
        <Field label="Profile URL" optional>
          {(props) => <Input {...props} inputMode="url" placeholder="linkedin.com/in/your-name" value={profile.url} onChange={set("url")} />}
        </Field>
      </div>
      <div className="flex flex-col gap-5">
        <TargetPicker kinds={KINDS} applications={applications} hasKey={hasKey} value={target} onChange={setTarget} />
        {error && (
          <p role="alert" className="flex gap-2 text-small text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={busy}>
          {busy ? "Reviewing…" : "Review profile"}
        </Button>
      </div>
    </form>
  );
}
