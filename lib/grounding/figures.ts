// Match quantities without treating digits inside names such as S3 as figures.
const NUMBER_WORD = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter)";
export const FIGURE = new RegExp(
  `(?<![\\w.])(?:[$€£]?[+-]?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?(?:\\s?%|\\+|[kmbx]\\b|\\s+(?:percent|per cent|thousand|million|billion|trillion)\\b)?(?![\\w%]))|\\b${NUMBER_WORD}(?:[- ](?:and[- ])?${NUMBER_WORD})*(?:\\s+(?:percent|per cent))?\\b`,
  "giu",
);

export function normalizeFigure(figure: string) {
  return figure.toLowerCase()
    .replace(/\s*(?:%|percent|per cent)$/, "%")
    .replace(/(\d)\s+thousand$/, "$1k")
    .replace(/(\d)\s+million$/, "$1m")
    .replace(/(\d)\s+billion$/, "$1b");
}
