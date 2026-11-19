import { Database, EyeOff, KeyRound, Lock, Server, Share2 } from "lucide-react";
import { Container, DisplayHeading, Lede } from "./Section";

const FACTS = [
  {
    icon: Server,
    title: "Runs on Docker Compose",
    body: "The web app, a background worker, Postgres, Redis and S3-compatible storage start with one command. An admin area covers users, queues, AI call logs, an audit log and announcements.",
  },
  {
    icon: Database,
    title: "Your data stays on your server",
    body: "Resumes, job posts, scans and applications live in your Postgres database. Uploaded files go to your storage bucket. The production profile adds a nightly database dump, kept for 14 days.",
  },
  {
    icon: Lock,
    title: "Your key is encrypted at rest",
    body: "The Gemini key is stored with AES-256-GCM, under a secret that only your server has. It is decrypted on the server to make your requests.",
  },
  {
    icon: EyeOff,
    title: "Never shown again",
    body: "After you save it, the browser only ever sees the last four characters. You can replace or remove the key at any time.",
  },
  {
    icon: Share2,
    title: "What does leave the server",
    body: "When an AI step runs, the resume or job text it needs goes to Google under your key. Match scoring runs in your server's code and sends nothing out. Job links you import are fetched by your server.",
  },
  {
    icon: KeyRound,
    title: "No accounts to buy",
    body: "There are no plans, credits or usage tiers. Google bills you directly only if you choose a paid Gemini plan.",
  },
];

export function SelfHosted() {
  return (
    <section id="self-hosted" aria-labelledby="self-hosted-title" className="scroll-mt-20 border-y border-line bg-sunken/60 py-24 lg:py-32">
      <Container className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <div>
          <DisplayHeading id="self-hosted-title">Your server, your key, your data.</DisplayHeading>
          <Lede className="mt-5">
            ResumeArchitect doesn&rsquo;t resell AI and doesn&rsquo;t meter you. You run it, you bring a Gemini key from
            Google AI Studio, and every request runs on your own account.
          </Lede>
          <figure className="mt-10 max-w-md">
            <pre className="overflow-x-auto rounded-lg border border-line bg-panel p-4 font-mono text-small leading-6 text-ink-2">
              <code>{`cp .env.example .env
openssl rand -base64 32   # into KEY_ENCRYPTION_SECRET
docker compose up -d --build --wait`}</code>
            </pre>
            <figcaption className="mt-2 text-label text-ink-3">
              Setup in short. The README covers production, HTTPS and backups.
            </figcaption>
          </figure>
        </div>

        <ul className="grid content-start gap-x-10 gap-y-9 sm:grid-cols-2">
          {FACTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="border-t border-line-strong pt-5">
              <h3 className="flex items-center gap-2.5 text-lead font-semibold text-ink">
                <Icon className="size-4 shrink-0 text-brass" aria-hidden />
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
