/**
 * Gemini's structured JSON output uses `null` for "field not applicable",
 * but the canonical ResumeContent/TailoringResult Zod schemas use `null`
 * only where it's semantically meaningful (e.g. endDate — "no end date" —
 * which is `.nullable().default(null)`) and `undefined` everywhere else
 * (`.optional()`). Deleting every null key before validation resolves both
 * cases correctly: a `.default(null)` field re-establishes null on its own,
 * and an `.optional()` field is happy with the key simply being absent.
 */
export function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripNulls(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === null) continue;
      result[key] = stripNulls(val);
    }
    return result as T;
  }
  return value;
}
