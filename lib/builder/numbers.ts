/**
 * Retain figures supplied in the notes, including the original unit or scale.
 * Unsupported figures become placeholders the user must review.
 */
const NUMBER_WORD = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter)";
const FIGURE = new RegExp(
  `(?<![\\w.])(?:[$€£]?[+-]?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?(?:%|\\+|[kmbx]\\b|\\s+(?:percent|per cent|thousand|million|billion|trillion)\\b)?(?![\\w%])|\\b${NUMBER_WORD}(?:[- ](?:and[- ])?${NUMBER_WORD})*(?:\\s+(?:percent|per cent))?\\b)`,
  "gi",
);

function normalize(figure: string) {
  return figure.toLowerCase().replace(/,/g, "")
    .replace(/\s+(?:percent|per cent)$/, "%")
    .replace(/(\d)\s+thousand$/, "$1k")
    .replace(/(\d)\s+million$/, "$1m")
    .replace(/(\d)\s+billion$/, "$1b");
}

export function figuresIn(text: string): Set<string> {
  return new Set([...text.matchAll(FIGURE)].map(([figure]) => normalize(figure)));
}

function placeholderFor(figure: string): string {
  const amount = normalize(figure);
  if (amount.endsWith("%")) return "[X%]";
  if (/^[$€£]/.test(amount)) return `[${amount[0]}X]`;
  if (/x$/i.test(amount) && /\d/.test(amount)) return "[N]x";
  return "[N]";
}

export function guardNumbers(output: string, source: string): string {
  const known = figuresIn(source);
  return output.replace(FIGURE, (figure) => (known.has(normalize(figure)) ? figure : placeholderFor(figure)));
}
