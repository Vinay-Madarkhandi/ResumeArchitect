const DAY = 86_400_000;

export function utcDays(now: Date, size = 30) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: size }, (_, index) =>
    new Date(today - (size - 1 - index) * DAY).toISOString().slice(0, 10),
  );
}

export function percentage(part: number, total: number) {
  return total ? (100 * part / total).toFixed(1) + "%" : "—";
}

export function fillDays(days: string[], rows: { day: string; count: number }[]) {
  const counts = new Map(rows.map(({ day, count }) => [day, count]));
  return days.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}
