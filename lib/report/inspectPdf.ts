import { inspectWithinBudget } from "./inspectBudget";

export { countColumns, fontFamily, type Segment } from "./pdfLayout";

export function inspectPdf(file: ArrayBuffer | Uint8Array) {
  return inspectWithinBudget("pdf", file);
}
