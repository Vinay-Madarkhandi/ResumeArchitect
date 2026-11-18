import type { AnswerRating, InterviewQuestion } from "@/lib/schemas/career";
import { hasMeasurableResult } from "@/lib/career/score";
import { answerQuote, checkGrounding } from "./index";

const fallback = {
  behavioral: {
    question: "Describe a situation from your own experience and what you did.",
    assessing: "Your role, actions, and the outcome.",
    topical: (topic: string) => `If you faced a challenge involving ${topic}, how would you approach it?`,
  },
  technical: {
    question: "How would you investigate a technical problem with an uncertain cause?",
    assessing: "Your reasoning, trade-offs, and how you would test the approach.",
    topical: (topic: string) => `How would you approach a technical problem involving ${topic}?`,
  },
  role: {
    question: "How would you decide what to prioritize in this role?",
    assessing: "How you learn the context and make decisions.",
    topical: (topic: string) => `How would you decide what to prioritize when this role involves ${topic}?`,
  },
};

function assertsCandidateExperience(question: string): boolean {
  return /\b(?:your|you've|you have|did you|when you built|when you led|when you ran|tell me about a time you|describe a time you)\b/i.test(question);
}

export function groundInterviewQuestion(
  draft: InterviewQuestion & { resumeEvidence?: string },
  resume: string,
  jobTopics: readonly string[],
): InterviewQuestion {
  const safe = fallback[draft.category];
  const requirement = jobTopics.find((topic) =>
    topic === draft.requirement
    && /^[\p{L}\p{N}][\p{L}\p{N} +#&./()-]{0,60}$/u.test(topic)
    && !/\.\s|\b(?:you|your|candidate)\b/i.test(topic)
  ) ?? null;
  const evidence = draft.resumeEvidence ? answerQuote(resume, draft.resumeEvidence) : null;

  // Questions about the job itself ("How would you design an idempotent payment retry?")
  // make no claim about the candidate and are allowed. Statements of fact about candidate need support.
  const isHypotheticalJobQuestion = (draft.category === "technical" || draft.category === "role") && !assertsCandidateExperience(draft.question);

  let questionOk = false;
  let assessingOk = false;

  if (isHypotheticalJobQuestion) {
    questionOk = true;
    assessingOk = true;
  } else {
    const check = checkGrounding([resume], [draft.question, draft.assessing].join("\n"));
    if (!check.flags.length) {
      questionOk = true;
      assessingOk = true;
    } else if (evidence && checkGrounding([resume], evidence).flags.length === 0) {
      // Evidence is grounded in resume
      questionOk = true;
      assessingOk = true;
    }
  }

  const question = questionOk
    ? draft.question
    : evidence
      ? `Your resume says “${evidence}”. What was your role in that work, and what did you learn?`
      : requirement ? safe.topical(requirement) : safe.question;

  return {
    id: draft.id,
    category: draft.category,
    question,
    assessing: assessingOk ? draft.assessing : safe.assessing,
    requirement,
    grounded: true,
  };
}

type StarEvidence = Partial<Record<keyof AnswerRating["star"], string>>;

export function groundAnswerRating(answer: string, draft: AnswerRating & { starEvidence?: StarEvidence }): AnswerRating {
  const strengths = [...new Set(draft.strengths.flatMap((line) => {
    const quote = answerQuote(answer, line);
    return quote ? [`“${quote}”`] : [];
  }))];
  const supports = (part: keyof StarEvidence) => {
    const quote = draft.starEvidence?.[part];
    return draft.star[part] && !!quote && !!answerQuote(answer, quote);
  };
  const star = { situation: supports("situation"), task: supports("task"), action: supports("action"), result: supports("result") };
  const improvements: string[] = [];
  if (!star.action) improvements.push("Explain what you personally did.");
  if (!star.result) improvements.push("State the outcome of your actions.");
  if (!hasMeasurableResult(answer)) improvements.push("Include a measurable result if you have a figure you can verify.");
  return { star, specificity: draft.specificity, relevance: draft.relevance, strengths, improvements };
}
