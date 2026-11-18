export function parseUtcTime(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return null;
  const time = new Date(`${input}:00.000Z`);
  const iso = Number.isNaN(time.valueOf()) ? null : time.toISOString();
  return iso?.slice(0, 16) === input ? iso : null;
}

export function announcementStatus(row: { starts_at: string; ends_at: string | null }, now: number) {
  if (row.ends_at && Date.parse(row.ends_at) <= now) return "Ended";
  if (Date.parse(row.starts_at) > now) return "Scheduled";
  return "Active";
}
