export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_DOCX_BYTES = 24 * 1024 * 1024;
export const MAX_DOCX_ENTRIES = 256;
export const MAX_XML_BYTES = 1024 * 1024;
export const MAX_PDF_PAGES = 20;
export const INSPECTION_TIMEOUT_MS = 4_000;

export class InspectionLimit extends Error {}
