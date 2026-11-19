import { describe, expect, it } from "vitest";
import { AnswerFeedbackSchema, AnswerRatingSchema, InterviewQuestionSetSchema } from "@/lib/schemas/career";
import { RUBRIC, scoreAnswer } from "./interview";

const words = (n: number, extra = "") => `${extra} ${Array.from({ length: n }, () => "word").join(" ")}`.trim();
const perfect = AnswerRatingSchema.parse({ star: { situation: true, task: true, action: true, result: true }, specificity: 5, relevance: 5 });

describe("scoreAnswer", () => {
  it("gives full marks only when every rubric line is met", () => {
    const feedback = scoreAnswer(words(200, "Cut latency by 38%."), perfect);
    expect(feedback.score.total).toBe(100);
    expect(AnswerFeedbackSchema.parse(feedback)).toEqual(feedback);
  });

  it("takes points off for a missing result, no number, and a short answer", () => {
    const rating = { ...perfect, star: { ...perfect.star, result: false }, specificity: 3 };
    const feedback = scoreAnswer(words(60), rating);
    const part = (id: string) => feedback.score.parts.find((p) => p.id === id)!;
    expect(part("structure")).toMatchObject({ ratio: 0.75, detail: "Missing result" });
    expect(part("specificity").ratio).toBe(0.5);
    expect(part("measurable").ratio).toBe(0);
    expect(part("length").ratio).toBe(0.5);
    // 30·0.75 + 25·0.5 + 25 + 0 + 10·0.5
    expect(feedback.score.total).toBe(65);
  });

  it("penalizes rambling past the length limit", () => {
    const part = scoreAnswer(words(700, "3x faster."), perfect).score.parts.find((p) => p.id === "length")!;
    expect(part.ratio).toBeCloseTo(0, 1);
  });

  it("uses a rubric whose weights add up to 100", () => {
    expect(RUBRIC.reduce((sum, r) => sum + r.weight, 0)).toBe(100);
  });
});

describe("Gemini output schemas", () => {
  it("rejects ratings outside 1–5", () => {
    expect(AnswerRatingSchema.safeParse({ ...perfect, specificity: 6 }).success).toBe(false);
    expect(AnswerRatingSchema.safeParse({ ...perfect, relevance: 0 }).success).toBe(false);
  });

  it("requires each question to say what it assesses, in a known category", () => {
    const q = { id: "q1", category: "behavioral", question: "Tell me about an outage.", assessing: "Calm ownership." };
    expect(InterviewQuestionSetSchema.safeParse({ questions: [q, q, q] }).success).toBe(true);
    expect(InterviewQuestionSetSchema.safeParse({ questions: [q, q, { ...q, assessing: "" }] }).success).toBe(false);
    expect(InterviewQuestionSetSchema.safeParse({ questions: [q, q, { ...q, category: "trivia" }] }).success).toBe(false);
  });
});
