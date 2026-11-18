"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DialogContent } from "@/components/ui/Dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import type { TrackerJob } from "@/lib/data/jobs";
import type { Contact } from "@/lib/tracker/schema";
import { stageLabels, stages } from "@/lib/tracker/stages";

type Submit = (body: object, notice: string) => Promise<boolean>;

const textFields = [
  { name: "title", label: "Job title", limit: 250 },
  { name: "company", label: "Company", limit: 250 },
  { name: "location", label: "Location", limit: 250 },
  { name: "salary", label: "Salary range", limit: 250 },
  { name: "url", label: "Posting URL", limit: 2048, type: "url" },
] as const;

const contactFields = [
  { name: "name", label: "Name", type: "text", limit: 160 },
  { name: "role", label: "Role", type: "text", limit: 160 },
  { name: "email", label: "Email", type: "email", limit: 254 },
  { name: "linkedin", label: "LinkedIn", type: "url", limit: 2048 },
] as const;

export function JobDetails({ job, submit, pending, error, restoreFocus }: {
  job: TrackerJob | undefined; submit: Submit; pending: boolean; error?: string; restoreFocus: () => void;
}) {
  const [contacts, setContacts] = useState(() => (job?.contacts ?? []).map((contact, id) => ({ contact, id })));
  const [interviews, setInterviews] = useState(() => (job?.interviews ?? []).map((date, id) => ({ date, id })));
  const [nextContact, setNextContact] = useState(contacts.length);
  const [nextInterview, setNextInterview] = useState(interviews.length);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const details = {
      title: values.title, company: values.company, location: values.location, salary: values.salary,
      url: values.url, description: values.description, notes: values.notes,
      followUp: values.followUp || null,
      excitement: values.excitement ? Number(values.excitement) : null,
      contacts: contacts.map(({ contact }) => contact),
      interviews: interviews.map(({ date }) => date).filter(Boolean),
    };
    await submit(job ? { action: "edit", id: job.id, job: details }
      : { action: "create", job: { ...details, stage: values.stage } }, job ? "Job updated." : "Job added.");
  }

  return (
    <DialogContent title={job ? job.title : "Add job"} onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus(); }} className="max-h-[90dvh] max-w-2xl overflow-y-auto break-words">
      {job && (
        <nav aria-label="Job links" className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-small text-brass [&_a]:hover:underline">
          {/^https?:\/\//i.test(job.url) && <a href={job.url} target="_blank" rel="noreferrer">View posting</a>}
          {job.reportId && <Link href={`/scan/${job.reportId}`}>Match report{job.matchRate !== null && <> · <span className="font-mono tabular">{job.matchRate}%</span></>}</Link>}
          {job.description && <Link href={`/scan?job=${job.id}`}>Scan</Link>}
          {job.resumeId && <Link href={`/resumes/${job.resumeId}?view=review`}>Tailored resume</Link>}
          {job.description && <Link href={`/new?job=${job.id}`}>Tailor a resume</Link>}
        </nav>
      )}
      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={pending} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {textFields.map((field) => (
              <Field key={field.name} label={field.label}>
                {(props) => <Input {...props} name={field.name} type={"type" in field ? field.type : "text"}
                  defaultValue={job?.[field.name]} maxLength={field.limit} required={field.name === "title"} />}
              </Field>
            ))}
            <Field label="Excitement">
              {(props) => <Select {...props} name="excitement" defaultValue={job?.excitement ?? ""}>
                <option value="">Unrated</option>
                {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
              </Select>}
            </Field>
            <Field label="Follow-up date">
              {(props) => <Input {...props} name="followUp" type="date" defaultValue={job?.followUp ?? ""} />}
            </Field>
            {!job && <Field label="Stage">
              {(props) => <Select {...props} name="stage">{stages.map((stage) => (
                <option key={stage} value={stage}>{stageLabels[stage]}</option>
              ))}</Select>}
            </Field>}
          </div>
          <Field label="Job description">
            {(props) => <Textarea {...props} name="description" defaultValue={job?.description} maxLength={50_000} />}
          </Field>
          <Field label="Notes">
            {(props) => <Textarea {...props} name="notes" defaultValue={job?.notes} maxLength={20_000} />}
          </Field>
          <fieldset className="space-y-3 border-t border-line pt-3">
            <legend className="pr-2 text-body font-semibold">Contacts</legend>
            {contacts.map(({ contact, id }, index) => (
              <div key={id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2">
                {contactFields.map((field) => <Field key={field.name} label={`Contact ${index + 1} ${field.label.toLowerCase()}`}>
                  {(props) => <Input {...props} type={field.type} value={contact[field.name]} maxLength={field.limit}
                    required={field.name === "name"} onChange={(event) => {
                      const value = event.target.value;
                      setContacts((entries) => entries.map((entry) => entry.id === id
                        ? { ...entry, contact: { ...entry.contact, [field.name]: value } } : entry));
                    }} />}
                </Field>)}
                <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => setContacts(contacts.filter((item) => item.id !== id))}>
                  Remove contact {index + 1}
                </Button>
              </div>
            ))}
            <Button size="sm" disabled={contacts.length >= 25} onClick={() => {
              const contact: Contact = { name: "", role: "", email: "", linkedin: "" };
              setContacts([...contacts, { contact, id: nextContact }]);
              setNextContact(nextContact + 1);
            }}>Add contact</Button>
          </fieldset>
          <fieldset className="space-y-3 border-t border-line pt-3">
            <legend className="pr-2 text-body font-semibold">Interviews</legend>
            {interviews.map(({ date, id }, index) => (
              <div key={id} className="flex items-end gap-3">
                <Field label={`Interview date ${index + 1}`}>
                  {(props) => <Input {...props} value={date} type="date" required onChange={(event) => {
                    const value = event.target.value;
                    setInterviews((entries) => entries.map((entry) => entry.id === id ? { ...entry, date: value } : entry));
                  }} />}
                </Field>
                <Button variant="ghost" onClick={() => setInterviews(interviews.filter((item) => item.id !== id))}>
                  Remove interview {index + 1}
                </Button>
              </div>
            ))}
            <Button size="sm" disabled={interviews.length >= 50} onClick={() => {
              setInterviews([...interviews, { date: "", id: nextInterview }]);
              setNextInterview(nextInterview + 1);
            }}>Add interview date</Button>
          </fieldset>
        </fieldset>
        {job && <section className="border-t border-line pt-3">
          <h3 className="mb-2 text-body font-semibold">Stage history</h3>
          <ol className="space-y-1 text-small text-ink-2">
            {[...job.history].reverse().map(({ stage, at }, index) => (
              <li key={`${at}-${index}`}>
                {stageLabels[stage]} <span aria-hidden>·</span> <time dateTime={at}>{at.slice(0, 10)} UTC</time>
              </li>
            ))}
          </ol>
        </section>}
        {error && <p role="alert" className="text-small text-danger">{error}</p>}
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="submit" variant="primary" loading={pending}>{job ? "Save changes" : "Add job"}</Button>
          {job && <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => void submit(
              { action: "archive", id: job.id, archived: !job.archived }, job.archived ? "Job restored." : "Job archived.",
            )}>{job.archived ? "Restore to tracker" : "Archive job"}</Button>
            {!confirmingDelete && <Button variant="danger" disabled={pending} onClick={() => setConfirmingDelete(true)}>Delete job</Button>}
          </div>}
        </div>
        {job && confirmingDelete && (
          <div role="group" aria-label="Confirm delete" className="flex flex-wrap items-center gap-3 rounded-lg border border-danger/50 px-3 py-2.5">
            <p className="flex-1 text-small text-ink-2">Delete this job, its notes, and its match reports? This can&rsquo;t be undone.</p>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
            <Button size="sm" variant="danger" loading={pending}
              onClick={() => void submit({ action: "delete", id: job.id }, `${job.title} deleted.`)}>Delete permanently</Button>
          </div>
        )}
      </form>
    </DialogContent>
  );
}
