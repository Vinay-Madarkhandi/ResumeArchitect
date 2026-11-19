import { ApiError } from "@google/genai";
import { z } from "zod";
import { recordAiCall } from "@/lib/data/ai-calls";
import { createGeminiClient } from "./client";
import { TAILOR_MODEL } from "./config";
import { stripNulls } from "./stripNulls";

/**
 * The single place the app talks to Gemini for structured output. Prompts
 * describe what they want with a Zod schema; this module turns it into the
 * JSON Schema Gemini enforces, validates the reply with the same Zod schema,
 * classifies failures into codes the UI can explain, and retries the
 * transient ones once.
 */

export type AiErrorCode = "invalid_api_key" | "rate_limited" | "timeout" | "gemini_error" | "schema_validation_failed";

const MESSAGES: Record<AiErrorCode, string> = {
  invalid_api_key: "Google rejected your Gemini API key. Update it in Settings and try again.",
  rate_limited: "Your Gemini key hit its rate limit or quota. Wait a minute, then try again.",
  timeout: "Gemini took too long to answer. Try again; long job posts can be trimmed to the role details.",
  gemini_error: "Gemini had a problem answering. Try again in a moment.",
  schema_validation_failed: "Gemini's answer came back malformed. Try again.",
};

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message = MESSAGES[code],
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface JsonRequest {
  /** Names the step in usage accounting ("analyzeJob", "tailorLines", …). */
  label: string;
  system: string;
  prompt: string;
  /** JSON Schema the reply must follow. */
  jsonSchema: unknown;
  temperature?: number;
}

export interface TokenUsage {
  prompt: number;
  output: number;
  total: number;
}

/** A model that answers with a JSON string. The Gemini client in production; a fake in tests. */
export interface JsonModel {
  name: string;
  generate(request: JsonRequest): Promise<string>;
  /** Tokens used so far, per step label. */
  usage?: Record<string, TokenUsage>;
  recordAttempt?(kind: string, elapsed: number, errorCode: AiErrorCode | null, tokensIn?: number, tokensOut?: number): Promise<void>;
}

const CALL_TIMEOUT_MS = 50_000;

function classify(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof ApiError) {
    const text = `${error.message}`.toLowerCase();
    if (error.status === 401 || error.status === 403) return new AiError("invalid_api_key");
    if (error.status === 400 && (text.includes("api key") || text.includes("api_key"))) {
      return new AiError("invalid_api_key");
    }
    if (error.status === 429) return new AiError("rate_limited");
    return new AiError("gemini_error");
  }
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new AiError("timeout");
  }
  return new AiError("gemini_error");
}

export function geminiModel(apiKey: string, userId?: string): JsonModel {
  const client = createGeminiClient(apiKey);
  const usage: Record<string, TokenUsage> = {};
  return {
    name: TAILOR_MODEL,
    usage,
    recordAttempt: userId ? (kind, latency_ms, error_code, tokens_in, tokens_out) => recordAiCall(userId, {
      kind, model: TAILOR_MODEL, ok: error_code === null, error_code, latency_ms, tokens_in, tokens_out,
    }) : undefined,
    async generate({ label, system, prompt, jsonSchema, temperature }) {
      const candidates = [TAILOR_MODEL, "gemini-3.5-flash-lite", "gemini-flash-lite-latest"].filter(
        (m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i,
      );
      let lastErr: unknown;
      for (const modelName of candidates) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: system,
              responseMimeType: "application/json",
              responseJsonSchema: jsonSchema,
              temperature: temperature ?? 0.4,
              abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
            },
          });
          const meta = response.usageMetadata;
          if (meta) {
            const prev = usage[label] ?? { prompt: 0, output: 0, total: 0 };
            usage[label] = {
              prompt: prev.prompt + (meta.promptTokenCount ?? 0),
              output: prev.output + (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
              total: prev.total + (meta.totalTokenCount ?? 0),
            };
          }
          const text = response.text;
          if (!text) throw new AiError("gemini_error", "Gemini returned an empty answer. Try again.");
          return text;
        } catch (err) {
          lastErr = err;
          if (err instanceof ApiError && (err.status === 404 || err.status === 503)) {
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    },
  };
}

/** Removes JSON Schema keywords outside the subset Gemini's structured output accepts. */
function sanitize(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitize);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "$schema" || key === "additionalProperties" || key === "default") continue;
      // z.int() emits ±2^53 bounds; they add nothing and only risk a rejection.
      if ((key === "minimum" || key === "maximum") && Math.abs(Number(value)) >= Number.MAX_SAFE_INTEGER) continue;
      out[key] = sanitize(value);
    }
    return out;
  }
  return node;
}

export function toGeminiSchema(schema: z.ZodType): unknown {
  return sanitize(z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }));
}

const RETRYABLE: AiErrorCode[] = ["rate_limited", "gemini_error", "schema_validation_failed", "timeout"];

export async function generateStructured<T>(
  model: JsonModel,
  request: {
    label: string; system: string; prompt: string; schema: z.ZodType<T>; temperature?: number;
    /** The shape asked of the model, when `schema` reads its reply more leniently. */
    replySchema?: z.ZodType;
  },
  { attempts = 2, backoffMs = 1200 }: { attempts?: number; backoffMs?: number } = {},
): Promise<T> {
  const jsonSchema = toGeminiSchema(request.replySchema ?? request.schema);
  let lastError: AiError = new AiError("gemini_error");

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const started = performance.now();
    const previous = model.usage?.[request.label];
    let errorCode: AiErrorCode | null = null;
    try {
      const text = await model.generate({
        label: request.label,
        system: request.system,
        prompt: request.prompt,
        jsonSchema,
        temperature: request.temperature,
      });
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new AiError("schema_validation_failed");
      }
      const parsed = request.schema.safeParse(stripNulls(raw));
      if (!parsed.success) throw new AiError("schema_validation_failed");
      return parsed.data;
    } catch (error) {
      lastError = classify(error);
      errorCode = lastError.code;
      if (!RETRYABLE.includes(lastError.code) || attempt === attempts) break;
    } finally {
      const now = model.usage?.[request.label];
      const hasUsage = now && now !== previous;
      await model.recordAttempt?.(request.label, Math.round(performance.now() - started), errorCode,
        hasUsage ? now.prompt - (previous?.prompt ?? 0) : undefined,
        hasUsage ? now.output - (previous?.output ?? 0) : undefined);
    }
    await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
  }
  throw lastError;
}
