import type { AnswerFeedback, AnswerRating } from "@/lib/schemas/career";
import { hasMeasurableResult, weightedScore, wordCount } from "./score";

/** Spoken at a normal pace, 120–350 words is roughly one to two and a half minutes. */
export const ANSWER_WORDS = { min: 120, max: 350 } as const;

/** The rubric shown next to every answer. Weights are the share of the 100 points. */
export const RUBRIC = [
  { id: "structure", label: "STAR structure", weight: 30, describe: "Situation, task, action and result are each there." },
  { id: "specificity", label: "Specificity", weight: 25, describe: "Concrete actions, tools and names from your own work, not generalities." },
  { id: "relevance", label: "Relevance", weight: 25, describe: "Answers the question asked and ties back to what the job needs." },
  { id: "measurable", label: "Measurable result", weight: 10, describe: "At least one number shows the outcome." },
  { id: "length", label: "Length", weight: 10, describe: `${ANSWER_WORDS.min}–${ANSWER_WORDS.max} words, about one to two minutes spoken.` },
] as const;

const weight = (id: (typeof RUBRIC)[number]["id"]) => RUBRIC.find((r) => r.id === id)!.weight / 100;
const STAR = ["situation", "task", "action", "result"] as const;

function lengthRatio(words: number): number {
  if (words < ANSWER_WORDS.min) return words / ANSWER_WORDS.min;
  if (words > ANSWER_WORDS.max) return Math.max(0, 1 - (words - ANSWER_WORDS.max) / ANSWER_WORDS.max);
  return 1;
}

export function scoreAnswer(answer: string, rating: AnswerRating): AnswerFeedback {
  const words = wordCount(answer);
  const measurable = hasMeasurableResult(answer);
  const present = STAR.filter((part) => rating.star[part]);
  const missing = STAR.filter((part) => !rating.star[part]);
  const score = weightedScore([
    {
      id: "structure",
      label: "STAR structure",
      base: weight("structure"),
      ratio: present.length / STAR.length,
      detail: missing.length ? `Missing ${missing.join(", ")}` : "All four parts are there",
    },
    {
      id: "specificity",
      label: "Specificity",
      base: weight("specificity"),
      ratio: (rating.specificity - 1) / 4,
      detail: `Rated ${rating.specificity} of 5`,
    },
    {
      id: "relevance",
      label: "Relevance",
      base: weight("relevance"),
      ratio: (rating.relevance - 1) / 4,
      detail: `Rated ${rating.relevance} of 5`,
    },
    {
      id: "measurable",
      label: "Measurable result",
      base: weight("measurable"),
      ratio: measurable ? 1 : 0,
      detail: measurable ? "Includes a number" : "No number in the answer",
    },
    {
      id: "length",
      label: "Length",
      base: weight("length"),
      ratio: lengthRatio(words),
      detail: `${words} words`,
    },
  ]);
  return { score, rating, words, measurable };
}
