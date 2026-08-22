/** Shared helper for flagging fields the parser (or tailoring step) couldn't
 * confidently populate, so review UIs can highlight them consistently. */
export function isLowConfidence(fields: string[] | undefined, path: string): boolean {
  return Boolean(fields?.includes(path));
}

export function lowConfidenceClass(fields: string[] | undefined, path: string): string {
  return isLowConfidence(fields, path) ? "border-secondary ring-1 ring-secondary" : "";
}
