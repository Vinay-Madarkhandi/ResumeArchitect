import { atsRegistry } from './registry';
export { atsRegistry } from './registry';
export { atsTips } from './tips';

export interface AtsMatch { id: string; name: string; parsingNotes: string; }

export function identifyAts(input: { url?: string; html?: string; text?: string }): AtsMatch | null {
  let url: URL | undefined;
  try { if (input.url) url = new URL(input.url); } catch { /* Invalid URLs can still have recognizable page markers. */ }
  if (url && !['http:', 'https:'].includes(url.protocol)) url = undefined;
  const page = `${input.html ?? ''}\n${input.text ?? ''}`;
  const matches = (entry: typeof atsRegistry[number]) => ({ id: entry.id, name: entry.name, parsingNotes: entry.parsingNotes });
  if (url) {
    const target = `${url.hostname}${url.pathname}${url.search}`;
    for (const entry of atsRegistry) {
      if (entry.id === 'linkedin' || entry.id === 'indeed') continue;
      const hostMatches = entry.hosts.some(host => url!.hostname === host || url!.hostname.endsWith(`.${host}`));
      // Entries with path rules restrict their own hosts; query rules may also match custom domains.
      if (entry.urlPatterns ? entry.urlPatterns.some(pattern => pattern.test(target)) : hostMatches) return matches(entry);
    }
  }
  for (const entry of atsRegistry) {
    if (entry.htmlMarkers.some(marker => marker.test(page))) return matches(entry);
  }
  return null;
}
