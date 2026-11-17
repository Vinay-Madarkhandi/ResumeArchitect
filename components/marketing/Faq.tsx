import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Container, DisplayHeading } from "./Section";

const QUESTIONS: { q: string; a: ReactNode }[] = [
  {
    q: "How do I get a Gemini API key?",
    a: (
      <>
        Sign in to Google AI Studio with a Google account, choose <em>Get API key</em>, create one and copy it. Paste it
        into ResumeArchitect once during setup. It takes about a minute, and the free tier is enough to tailor resumes.
      </>
    ),
  },
  {
    q: "What does it cost?",
    a: "ResumeArchitect is free to use with your own key. There’s no subscription and no AI credits to buy: requests run on your Gemini quota, and Google’s free tier works. If you use a paid Gemini plan, Google bills you directly.",
  },
  {
    q: "Who can see my key and my resumes?",
    a: "Your key is encrypted at rest with AES-256-GCM and never sent back to the browser after you save it. Your resumes, job posts and applications are private to your account. Text you tailor is sent to Gemini under your own key to do the work.",
  },
  {
    q: "Will it invent experience I don’t have?",
    a: "It’s instructed not to, and you don’t have to take that on trust. Every change is shown as a redline with its reason, and any number, name or skill the original resume doesn’t back up is flagged Verify. Missing requirements are only added when you say “I have this”.",
  },
  {
    q: "Which AI model does it use?",
    a: "Google’s Gemini 2.5 Flash, called with your key. The match score is not produced by the model: it’s computed in code, so the same resume and job always give the same score.",
  },
  {
    q: "What can I download?",
    a: "PDF or Word (.docx), in the Classic or Modern template. Both are built from exactly what’s on screen, including any edits you made, so there are no surprises in the file. You can also copy the resume as plain text.",
  },
  {
    q: "Does it guarantee I’ll get past an ATS?",
    a: "No, and no tool honestly can. The ATS readability part of the score checks structure that parsers commonly struggle with, such as headings, dates and contact details. How a particular employer’s system ranks you is outside anyone’s control.",
  },
  {
    q: "Does tailoring change my original resume?",
    a: "Never. Each tailoring run creates its own application with a snapshot of the original, so your master resume stays as you uploaded it and you can tailor it again for the next job.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-line py-24 lg:py-32">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div>
          <DisplayHeading id="faq-title">Questions, answered plainly.</DisplayHeading>
          <p className="mt-5 max-w-sm text-body text-ink-2">
            Setting up takes a Gemini key and a resume. Everything else is below.
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
