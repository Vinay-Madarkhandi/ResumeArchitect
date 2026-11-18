"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Mic, MicOff, Minus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { ANSWER_WORDS, RUBRIC } from "@/lib/career/interview";
import { partPoints, wordCount } from "@/lib/career/score";
import type { AnswerFeedback, InterviewQuestion } from "@/lib/schemas/career";
import { useCareerPost } from "./useCareerPost";

export interface Attempt {
  id: string;
  questionId: string;
  answer: string;
  feedback: AnswerFeedback;
}

const CATEGORIES = [
  { id: "behavioral", label: "Behavioral" },
  { id: "technical", label: "Technical" },
  { id: "role", label: "Role-specific" },
] as const;

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Appends what the user says to the answer, using the browser's own speech recognition. */
function Dictate({ onText }: { onText: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    // Feature detection has to wait for the browser; the server render has no window.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(recognitionCtor() !== null);
    return () => recognition.current?.stop();
  }, []);
  if (!supported) return null;

  function toggle() {
    if (listening) return recognition.current?.stop();
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = false;
    r.lang = navigator.language || "en-US";
    r.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) onText(event.results[i][0].transcript.trim());
      }
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    r.start();
    setListening(true);
  }

  return (
    <Button size="sm" variant="ghost" onClick={toggle} aria-pressed={listening}>
      {listening ? <MicOff aria-hidden /> : <Mic aria-hidden />} {listening ? "Stop dictating" : "Dictate"}
    </Button>
  );
}

function Feedback({ feedback, earlier }: { feedback: AnswerFeedback; earlier: number[] }) {
  return (
    <div className="mt-4 grid gap-5 border-t border-line pt-4 sm:grid-cols-[10rem_1fr]">
      <div>
        <p className="text-small text-ink-2">Answer score</p>
        <div className="mt-2 inline-flex flex-col items-start">
          <p className="font-mono text-[40px] font-medium leading-none text-ink tabular" aria-label={`Answer score ${feedback.score.total} of 100`}>
            {feedback.score.total}
          </p>
          <span className="mt-1.5 h-0.5 w-full rounded-full bg-brass" aria-hidden />
        </div>
        {earlier.length > 0 && (
          <p className="mt-2 text-label text-ink-3">
            Earlier: <span className="font-mono tabular">{earlier.join(", ")}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2.5">
          {feedback.score.parts.map((p) => (
            <li key={p.id}>
              <div className="flex items-baseline justify-between gap-3 text-small">
                <span className="text-ink">{p.label}</span>
                <span className="font-mono text-ink-2 tabular">
                  {partPoints(p)}
                  <span className="text-ink-3">/{Math.round(p.weight * 100)}</span>
                </span>
              </div>
              <div className="relative mt-1 h-1 rounded-full bg-sunken" aria-hidden>
                <span className="absolute inset-y-0 left-0 rounded-full bg-brass" style={{ width: `${p.ratio * 100}%` }} />
              </div>
              <p className="mt-0.5 text-label text-ink-3">{p.detail}</p>
            </li>
          ))}
        </ul>
        {feedback.rating.strengths.length > 0 && (
          <div>
            <h4 className="text-small font-medium text-ink-2">What works</h4>
            <ul className="mt-1.5 flex flex-col gap-1">
              {feedback.rating.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-small text-ink-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-add" aria-hidden /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {feedback.rating.improvements.length > 0 && (
          <div>
            <h4 className="text-small font-medium text-ink-2">To improve</h4>
            <ul className="mt-1.5 flex flex-col gap-1">
              {feedback.rating.improvements.map((s) => (
                <li key={s} className="flex gap-2 text-small text-ink-2">
                  <Minus className="mt-0.5 size-3.5 shrink-0 text-del" aria-hidden /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ sessionId, question, attempts, hasKey }: { sessionId: string; question: InterviewQuestion; attempts: Attempt[]; hasKey: boolean }) {
  const [history, setHistory] = useState(attempts);
  const [answer, setAnswer] = useState(attempts.at(-1)?.answer ?? "");
  const { post, busy, error } = useCareerPost<{ id: string; feedback: AnswerFeedback }>();
  const latest = history.at(-1);
  const words = wordCount(answer);
  const headingId = `q-${question.id}`;

  async function submit() {
    const data = await post(`/api/career/interview/${sessionId}/answers`, { questionId: question.id, answer });
    if (data) setHistory((h) => [...h, { id: data.id, questionId: question.id, answer, feedback: data.feedback }]);
  }

  return (
    <article aria-labelledby={headingId} className="rounded-lg border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {question.requirement && <Badge>{question.requirement}</Badge>}
        {latest && <Badge tone="add">Practiced</Badge>}
      </div>
      <h3 id={headingId} className="mt-2 text-lead font-medium text-ink">
        {question.question}
      </h3>
      <p className="mt-1.5 text-small text-ink-3">
        <span className="text-ink-2">Assessing:</span> {question.assessing}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor={`${headingId}-answer`} className="text-small font-medium text-ink-2">
          Your answer
        </label>
        <Textarea id={`${headingId}-answer`} rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" onClick={submit} loading={busy} disabled={!hasKey || !answer.trim()}>
            {busy ? "Rating…" : latest ? "Get new feedback" : "Get feedback"}
          </Button>
          <Dictate onText={(text) => setAnswer((a) => (a.trim() ? `${a.trimEnd()} ${text}` : text))} />
          <span className="ml-auto text-label text-ink-3">
            <span className="font-mono tabular">{words}</span> words · aim for {ANSWER_WORDS.min}–{ANSWER_WORDS.max}
          </span>
        </div>
        {error && (
          <p role="alert" className="flex gap-2 text-small text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
      </div>
      {latest && <Feedback feedback={latest.feedback} earlier={history.slice(0, -1).map((a) => a.feedback.score.total)} />}
    </article>
  );
}

export function InterviewPractice({
  sessionId,
  questions,
  attempts,
  hasKey,
}: {
  sessionId: string;
  questions: InterviewQuestion[];
  attempts: Attempt[];
  hasKey: boolean;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-8">
        {CATEGORIES.map((c) => {
          const items = questions.filter((q) => q.category === c.id);
          if (!items.length) return null;
          return (
            <section key={c.id} aria-labelledby={`cat-${c.id}`} className="flex flex-col gap-3">
              <h2 id={`cat-${c.id}`} className="flex items-baseline gap-2 text-title font-semibold">
                {c.label} <span className="font-mono text-small font-normal text-ink-3 tabular">{items.length}</span>
              </h2>
              {items.map((q) => (
                <QuestionCard key={q.id} sessionId={sessionId} question={q} attempts={attempts.filter((a) => a.questionId === q.id)} hasKey={hasKey} />
              ))}
            </section>
          );
        })}
      </div>
      <aside aria-labelledby="rubric-heading" className="flex flex-col gap-3 order-first lg:order-none lg:sticky lg:top-20 lg:self-start">
        <h2 id="rubric-heading" className="text-small font-medium text-ink-2">How answers are scored</h2>
        <ul className="flex flex-col rounded-lg border border-line bg-panel px-4">
          {RUBRIC.map((r) => (
            <li key={r.id} className="border-t border-line py-2.5 first:border-t-0">
              <p className="flex items-baseline justify-between gap-3 text-small text-ink">
                {r.label} <span className="font-mono text-label text-ink-3 tabular">{r.weight}</span>
              </p>
              <p className="text-label text-ink-3">{r.describe}</p>
            </li>
          ))}
        </ul>
        <p className="text-small text-ink-3">
          Gemini rates structure, specificity and relevance. The points, the number check and the length are counted in
          code from those ratings, so the rubric is the same for every answer.
        </p>
      </aside>
    </div>
  );
}
