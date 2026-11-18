import { atsRegistry } from './registry';

export interface AtsGuidance {
  text: string;
  sources: string[];
  basis: 'vendor documentation' | 'general best practice';
}
export interface AtsTip {
  id: string;
  name: string;
  guidance: AtsGuidance[];
}

/** Documentation may describe defaults or specific workflows; follow the application instructions. */
export function atsTips(id: string): AtsTip | undefined {
  const entry = atsRegistry.find(item => item.id === id);
  if (!entry) return undefined;
  const { acceptedFileTypes, sizeLimits, parsing, searchFeatures } = entry.facts;
  const selected = [
    [acceptedFileTypes[0], 'Choose your file format with this in mind'],
    [sizeLimits[0], 'Check your file size against the applicable limit'],
    [parsing[0], 'Check your application fields before submitting'],
    [searchFeatures[0], 'Review your application for relevant qualifications'],
  ] as const;
  return {
    id: entry.id,
    name: entry.name,
    guidance: selected.filter(([fact]) => fact !== undefined).map(([fact, action]) => ({ text: `${action}: ${fact.text}`, sources: fact.sources, basis: 'vendor documentation' as const })),
  };
}
