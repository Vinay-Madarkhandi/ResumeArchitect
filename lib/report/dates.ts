/**
 * Dates on a resume: which style each one is written in (ATS read "Jan 2020"
 * and "01/2020" reliably; "Summer '19" less so) and how much experience the
 * ranges add up to.
 */

export type DateStyle =
  | "Mon YYYY"
  | "Month YYYY"
  | "MM/YYYY"
  | "MM-YYYY"
  | "MM.YYYY"
  | "YYYY-MM"
  | "YYYY"
  | "Season YYYY"
  | "Mon 'YY";

/** A calendar month as a count of months, so ranges subtract. */
type MonthIndex = number;

export interface DateMention {
  text: string;
  style: DateStyle;
  month: MonthIndex;
  start: number;
  end: number;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAME =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const SEASONS: Record<string, number> = { spring: 4, summer: 7, fall: 10, autumn: 10, winter: 1 };
const YEAR = "((?:19|20)\\d{2})";
const RANGE_JOINER = /^\s*(?:[-–—]|to|until|through|thru)\s*$/i;
const UNTIL_PRESENT = /^\s*(?:[-–—]|to|until)\s*(?:present|current|now|today|ongoing)\b/i;

function monthIndex(year: number, month: number): MonthIndex {
  return year * 12 + (month - 1);
}

interface Pattern {
  re: RegExp;
  read: (m: RegExpMatchArray) => { style: DateStyle; year: number; month: number };
}

const PATTERNS: Pattern[] = [
  {
    re: new RegExp(`\\b${MONTH_NAME}\\.?,?\\s+${YEAR}\\b`, "gi"),
    read: (m) => {
      const name = m[1].toLowerCase();
      const full = name.length > 4 || name === "june" || name === "july";
      return { style: full ? "Month YYYY" : "Mon YYYY", year: Number(m[2]), month: MONTHS.indexOf(name.slice(0, 3)) + 1 };
    },
  },
  {
    re: new RegExp(`\\b${MONTH_NAME}\\.?\\s*['’](\\d{2})\\b`, "gi"),
    read: (m) => ({ style: "Mon 'YY", year: 2000 + Number(m[2]), month: MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)) + 1 }),
  },
  {
    re: new RegExp(`\\b(spring|summer|fall|autumn|winter)\\s+${YEAR}\\b`, "gi"),
    read: (m) => ({ style: "Season YYYY", year: Number(m[2]), month: SEASONS[m[1].toLowerCase()] }),
  },
  {
    re: new RegExp(`(?<![\\d/.-])(0?[1-9]|1[0-2])([/.-])${YEAR}\\b`, "g"),
    read: (m) => ({ style: `MM${m[2]}YYYY` as DateStyle, year: Number(m[3]), month: Number(m[1]) }),
  },
  {
    re: new RegExp(`\\b${YEAR}-(0[1-9]|1[0-2])\\b(?!-\\d)`, "g"),
    read: (m) => ({ style: "YYYY-MM", year: Number(m[1]), month: Number(m[2]) }),
  },
];

function monthDates(text: string): DateMention[] {
  const found: DateMention[] = [];
  for (const { re, read } of PATTERNS) {
    for (const m of text.matchAll(re)) {
      const start = m.index;
      const end = start + m[0].length;
      if (found.some((d) => start < d.end && d.start < end)) continue;
      const { style, year, month } = read(m);
      found.push({ text: m[0], style, month: monthIndex(year, month), start, end });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/**
 * Bare years count as dates only inside a range ("2019 – 2021"), so a
 * graduation year or "AWS Certified 2022" isn't read as a style choice.
 */
function yearRangeDates(text: string, taken: DateMention[]): DateMention[] {
  const re = new RegExp(`(?<![\\d/.'’-])${YEAR}(?=\\s*(?:[-–—]|to|until|through)\\s*(?:${YEAR}|present|current|now)\\b)`, "gi");
  const endRe = new RegExp(`^\\s*(?:[-–—]|to|until|through)\\s*${YEAR}\\b`, "i");
  const out: DateMention[] = [];
  for (const m of text.matchAll(re)) {
    const start = m.index;
    if (taken.some((d) => start < d.end && d.start < start + 4)) continue;
    out.push({ text: m[0], style: "YYYY", month: monthIndex(Number(m[1]), 7), start, end: start + 4 });
    const tail = endRe.exec(text.slice(start + 4));
    if (tail) {
      const endStart = start + 4 + tail[0].length - 4;
      out.push({ text: tail[1], style: "YYYY", month: monthIndex(Number(tail[1]), 7), start: endStart, end: endStart + 4 });
    }
  }
  return out;
}

export function findDates(text: string): DateMention[] {
  const months = monthDates(text);
  return [...months, ...yearRangeDates(text, months)].sort((a, b) => a.start - b.start);
}

/**
 * The distinct styles in use. "May 2020" fits both the short and the long
 * month style, so it only counts as a style when nothing else decides it.
 */
export function dateStyles(dates: DateMention[]): DateStyle[] {
  const styles = new Set(dates.filter((d) => !/^may\b/i.test(d.text)).map((d) => d.style));
  if (dates.some((d) => /^may\b/i.test(d.text)) && !styles.has("Mon YYYY") && !styles.has("Month YYYY")) {
    styles.add("Month YYYY");
  }
  return [...styles];
}

export interface DateRange {
  from: MonthIndex;
  to: MonthIndex;
}

/** Start–end pairs, with "Present" read as `asOf`. */
export function findRanges(text: string, asOf: Date): DateRange[] {
  const dates = findDates(text);
  const now = monthIndex(asOf.getFullYear(), asOf.getMonth() + 1);
  const ranges: DateRange[] = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const next = dates[i + 1];
    if (next && RANGE_JOINER.test(text.slice(date.end, next.start))) {
      ranges.push({ from: date.month, to: next.month });
      i++;
    } else if (UNTIL_PRESENT.test(text.slice(date.end))) {
      ranges.push({ from: date.month, to: now });
    }
  }
  return ranges;
}

/** Years covered by the ranges, overlapping jobs counted once. */
export function yearsCovered(ranges: DateRange[]): number {
  const sorted = ranges.filter((r) => r.to >= r.from).sort((a, b) => a.from - b.from);
  let months = 0;
  let cursor = -Infinity;
  for (const { from, to } of sorted) {
    const start = Math.max(from, cursor);
    if (to + 1 > start) months += to + 1 - start;
    cursor = Math.max(cursor, to + 1);
  }
  return Math.round((months / 12) * 10) / 10;
}
