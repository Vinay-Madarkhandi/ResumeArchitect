export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_DOCX_BYTES = 24 * 1024 * 1024;
export const MAX_DOCX_ENTRIES = 256;
export const MAX_XML_BYTES = 1024 * 1024;
export const MAX_PDF_PAGES = 20;
export const MAX_PDF_INFLATED_BYTES = 48 * 1024 * 1024;
export const MAX_PDF_STREAMS = 2_000;
/** Drawing operators and text items across all pages. */
export const MAX_PDF_OPERATORS = 250_000;
export const MAX_PDF_TEXT_ITEMS = 40_000;
/**
 * The budgets above bound the work; this only catches a parser that hangs.
 * It is generous so a busy server never turns a slow, honest file into a
 * "too large" result.
 */
export const INSPECTION_BACKSTOP_MS = 20_000;

export class InspectionLimit extends Error {}
