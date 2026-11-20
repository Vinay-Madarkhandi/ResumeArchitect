import { Container, DisplayHeading, Lede } from "./Section";

const GUARANTEES = [
  {
    title: "Envelope Encryption (AES-256-GCM)",
    body: "Your Gemini API key is sealed at rest with an encryption key held exclusively in your local environment. It is decrypted only in ephemeral memory to issue your direct requests.",
  },
  {
    title: "Local Deterministic Evaluation",
    body: "ATS match scoring, token frequency analysis, and PDF structure checks execute entirely in your server's Node.js process. No third-party analytics or tracker beacons.",
  },
  {
    title: "Direct Google AI Studio Connection",
    body: "AI tailoring requests travel straight from your server to Google AI Studio over TLS under your personal API key. No intermediate proxies or telemetry brokers.",
  },
  {
    title: "Automatic Nightly Snapshots",
    body: "A dedicated backup container creates nightly PostgreSQL dumps and synchronizes them to private S3-compatible storage, preserving 14 days of revisions.",
  },
];

export function SelfHosted() {
  return (
    <section id="self-hosted" aria-labelledby="self-hosted-title" className="scroll-mt-20 border-y border-line bg-sunken/40 py-20 lg:py-28">
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <DisplayHeading id="self-hosted-title">Zero outbound telemetry. Total data sovereignty.</DisplayHeading>
          <Lede className="mt-4">
            ResumeArchitect operates completely within your own infrastructure perimeter. Your resumes, job history, and notes never leave your personal database.
          </Lede>

          {/* Docker Topology Inspector */}
          <div className="mt-8 overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
            <div className="flex items-center justify-between border-b border-line bg-sunken/80 px-4 py-2 text-label">
              <span className="font-mono text-ink-3">docker-compose.yml · stack topology</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" /> 5 services healthy
              </span>
            </div>
            <div className="p-4 font-mono text-[12px] leading-6 text-ink-2">
              <div className="text-ink-3"># Initialize encrypted environment</div>
              <div className="text-ink font-semibold">docker compose up -d --build</div>
              <div className="mt-3 border-t border-line/50 pt-3 text-ink-3 space-y-1">
                <div className="flex justify-between"><span>postgres:17-alpine</span><span className="text-ink-3">port 55432 · encrypted volume</span></div>
                <div className="flex justify-between"><span>redis:7-alpine</span><span className="text-ink-3">port 16379 · job queues</span></div>
                <div className="flex justify-between"><span>s3-localstack:4.14</span><span className="text-ink-3">port 14566 · PDF exports & backups</span></div>
                <div className="flex justify-between"><span>web (Next.js 16)</span><span className="text-brass">port 3100 · zero telemetry</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-6">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="rounded-xl border border-line bg-panel/50 p-5 transition-colors hover:border-line-strong">
              <h3 className="text-lead font-semibold text-ink">{g.title}</h3>
              <p className="mt-2 text-small leading-relaxed text-pretty text-ink-2">{g.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
