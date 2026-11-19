/** Model-chosen ids become React keys and stored references, so make them unique. */
export function uniqueIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  const seen = new Set<string>();
  return items.map((item, i) => {
    let id = item.id.trim() || `${prefix}-${i}`;
    while (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return { ...item, id };
  });
}
