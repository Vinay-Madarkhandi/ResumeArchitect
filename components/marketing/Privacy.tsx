import { Ban, Check, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Container, DisplayHeading, Lede } from "./Section";

const FACTS = [
  {
    icon: Lock,
    title: "Encrypted at rest",
    body: "Your Gemini key is stored with AES-256-GCM. It’s decrypted on the server only to make your requests.",
  },
  {
    icon: EyeOff,
    title: "Never shown again",
    body: "Once saved, the key is never sent back to the browser. You can replace or delete it; nobody can read it out.",
  },
  {
    icon: Ban,
    title: "No subscription, no credits",
    body: "AI runs on your own Gemini quota, and Google’s free tier works. There’s nothing to top up and no plan to cancel.",
  },
  {
    icon: ShieldCheck,
    title: "Private to your account",
    body: "Resumes, job posts and applications are visible only to you. Your master resume is never changed by a tailoring run.",
  },
];

export function Privacy() {
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-20 border-y border-line bg-sunken/60 py-24 lg:py-32">
      <Container className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <DisplayHeading id="privacy-title">Your key, your quota, your resume.</DisplayHeading>
          <Lede className="mt-5">
            ResumeArchitect doesn&rsquo;t resell AI. You bring a Gemini API key from Google AI Studio, it&rsquo;s locked
            away the moment you save it, and every request runs on your own account.
          </Lede>

          <figure className="mt-10 max-w-md rounded-lg border border-line bg-panel p-5" aria-label="Example of a saved key in settings">
            <p className="text-small font-medium text-ink-2">Gemini API key</p>
            <div className="mt-2 flex h-9 items-center gap-2 rounded-md border border-line-strong bg-sunken px-3">
              <KeyRound className="size-4 shrink-0 text-ink-3" aria-hidden />
              <span className="truncate font-mono text-small tracking-[0.12em] text-ink-3" aria-label="Key hidden">
                ••••••••••••••••••••
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-label text-add">
                <Check className="size-3.5" aria-hidden /> Saved
              </span>
            </div>
            <figcaption className="mt-2 text-label text-ink-3">
              Encrypted with AES-256-GCM. For your security it can&rsquo;t be displayed again.
            </figcaption>
          </figure>
        </div>

        <ul className="grid content-start gap-x-10 gap-y-10 sm:grid-cols-2">
          {FACTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="border-t border-line-strong pt-5">
              <h3 className="flex items-center gap-2.5 text-lead font-semibold text-ink">
                <Icon className="size-4 text-brass" aria-hidden />
                {title}
              </h3>
              <p className="mt-2 text-body text-pretty text-ink-2">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
