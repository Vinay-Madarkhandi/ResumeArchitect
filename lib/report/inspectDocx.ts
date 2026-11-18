import { inspectWithinBudget } from "./inspectBudget";

export function inspectDocx(file: ArrayBuffer | Uint8Array) {
  return inspectWithinBudget("docx", file);
}
