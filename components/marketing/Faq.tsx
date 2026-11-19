import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { RUNS_PER_HOUR, SCANS_PER_HOUR } from "@/lib/server/limits";
import { Container, DisplayHeading } from "./Section";

const QUESTIONS: { q: string; a: ReactNode }[] = [
  {
    q: "What does it cost? Is there a catch?",
    a: "It is free, with no pricing tiers. You host it yourself and bring your own Gemini key, so the only money involved is what Google charges for your key, and its free tier works. If you choose a paid Gemini plan, Google bills you directly.",
  },
  {
    q: "Is there a limit on scans?",
    a: <>There is no monthly or lifetime cap. To stop a runaway client from hammering your server, each account is rate-limited to {SCANS_PER_HOUR} scans an hour, and to {RUNS_PER_HOUR} tailoring runs an hour.</>,
  },
  {
    q: "Where is my data stored?",
    a: "On the server that runs this app. Resumes, job posts, scans and applications are rows in its Postgres database, and uploaded files sit in its S3-compatible storage bucket. Your records are private to your account. The text sent to Gemini when an AI step runs is the only thing that leaves.",
  },
  {
    q: "How is my Gemini key stored?",
    a: "It is tested against Google when you save it, then encrypted with AES-256-GCM under a secret held in your server's environment. The browser only ever sees its last four characters. It is decrypted on the server to make your requests, and you can replace or remove it in Settings at any time.",
  },
  {
    q: "What does Gemini see?",
    a: "Only what an AI step needs: the job post when it is read, an uploaded file when it is rebuilt into a resume, the lines being rewritten, or the text you give a career tool. Scoring a resume against a job you have already read sends nothing to Google.",
  },
  {
    q: "How is the match rate calculated?",
    a: "Gemini reads the job post once into skills, a title, a level and an education requirement. Your resume is then scored against that list in code, using weights we estimated that you can see in the breakdown. The same resume and job give the same number. It is not any other scanner's number.",
  },
  {
    q: "Do I need a key to scan?",
    a: "You need one to read a new job post. After that, scanning or rescanning a resume against that job works without it, and so does Power Edit.",
  },
  {
    q: "Will the AI invent experience I don't have?",
    a: "It is instructed not to, and you don't have to take that on trust. Every tailoring change is shown as a redline with its reason, and a separate check flags any number, name or skill your original resume doesn't back up as Verify. A missing requirement is only added when you say you have it.",
  },
  {
    q: "Does a high score guarantee I'll get past an ATS?",
    a: "No, and no tool honestly can. The report checks structure that parsers commonly struggle with and compares your wording with the job. How a particular employer's system ranks you is outside anyone's control.",
  },
  {
    q: "Which model does it use, and what files can I use?",
    a: "Gemini 2.5 Flash by default, which a self-hoster can change with the GEMINI_MODEL setting. You can import PDF, Word (.docx) or plain text up to 10 MB. Download PDF or Word, and a Word file you upload comes back with only the wording changed.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-line py-24 lg:py-32">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div>
          <DisplayHeading id="faq-title">Questions, answered plainly.</DisplayHeading>
          <p className="mt-5 max-w-sm text-body text-ink-2">
            The short answers on cost, limits, where your data lives and how your key is kept.
          </p>
        </div>
        <div className="border-t border-line">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} name="faq" className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-5 text-lead font-semibold text-ink transition-colors duration-150 hover:text-brass-strong [&::-webkit-details-marker]:hidden">
                {q}
                <Plus
                  className="size-4 shrink-0 text-ink-3 transition-transform duration-200 ease-out-expo group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <div className="max-w-[40rem] pb-6 pr-10 text-body text-pretty text-ink-2">{a}</div>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
