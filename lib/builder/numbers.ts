/**
 * AI assist may only reuse figures the user wrote. Any number in its output
 * that the user's own text doesn't contain becomes a placeholder the user
 * must fill, so a suggestion can never smuggle in an invented metric.
 */
const FIGURE = /(?<![\w.$])\$?\d(?:[\d,]*\d)?(?:\.\d+)?(?:%|\+|[kKmMbB]\b|x\b)?(?![\w%])/g;

const normalize = (figure: string) => figure.replace(/,/g, "").toLowerCase();

export function figuresIn(text: string): Set<string> {
  return new Set([...text.matchAll(FIGURE)].map((m) => normalize(m[0])));
}

function placeholderFor(figure: string): string {
  if (figure.endsWith("%")) return "[X%]";
  if (figure.startsWith("$")) return "[$X]";
  if (/x$/i.test(figure)) return "[N]x";
  return "[N]";
}

export function guardNumbers(output: string, source: string): string {
  const known = figuresIn(source);
  return output.replace(FIGURE, (figure) => (known.has(normalize(figure)) ? figure : placeholderFor(figure)));
}
