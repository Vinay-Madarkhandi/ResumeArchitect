import { z } from "zod";

export const GeminiKeyStatus = z.enum(["not_configured", "valid", "invalid"]);
export type GeminiKeyStatusT = z.infer<typeof GeminiKeyStatus>;
