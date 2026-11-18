import { atsRegistry } from './registry';

export interface AtsTip {
  id: string;
  name: string;
  guidance: string[];
  sources: string[];
  basis: 'general best practice';
}

/** Conservative guidance: employers can configure upload formats and application flows differently. */
export function atsTips(id: string): AtsTip | undefined {
  const entry = atsRegistry.find(item => item.id === id);
  if (!entry) return undefined;
  return {
    id: entry.id,
    name: entry.name,
    guidance: [
      'Use a text-based PDF or DOCX if the application accepts it; follow the employer’s file instructions.',
      'Use clear section headings and check that text can be selected in your file.',
      'After upload, review the preview and any populated fields, especially dates, contact details, and experience; correct errors before submitting.',
    ],
    sources: [],
    basis: 'general best practice',
  };
}
