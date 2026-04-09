export interface CurrencyRevealSegment {
  isBlurred: boolean;
  text: string;
}

const CURRENCY_NOUNS = [
  "afghani",
  "ariary",
  "baht",
  "balboa",
  "birr",
  "boliviano",
  "cedi",
  "colon",
  "cordoba",
  "dalasi",
  "denar",
  "dinar",
  "dirham",
  "dollar",
  "dong",
  "dram",
  "euro",
  "forint",
  "franc",
  "gourde",
  "guarani",
  "kina",
  "kip",
  "koruna",
  "krona",
  "krone",
  "kwacha",
  "kwanza",
  "lari",
  "lek",
  "lempira",
  "leone",
  "leu",
  "lev",
  "lilangeni",
  "lira",
  "manat",
  "metical",
  "naira",
  "ngultrum",
  "ouguiya",
  "pataca",
  "peso",
  "pound",
  "pula",
  "quetzal",
  "rand",
  "real",
  "riel",
  "ringgit",
  "riyal",
  "ruble",
  "rouble",
  "rupee",
  "shekel",
  "shilling",
  "sol",
  "som",
  "somoni",
  "sterling",
  "taka",
  "tala",
  "tenge",
  "togrog",
  "tugrik",
  "vatu",
  "won",
  "yen",
  "yuan",
  "zloty",
] as const;

const currencyNounPattern = [...CURRENCY_NOUNS]
  .sort((left, right) => right.length - left.length)
  .join("|");
const countryPrefixPattern = String.raw`((?:[\p{Lu}][\p{L}'-]*|[A-Z]{2,})(?:\s+(?:[\p{Lu}][\p{L}'-]*|[A-Z]{2,}|and|of|the))*)`;
const currencyRevealPattern = new RegExp(
  `${countryPrefixPattern}\\s+(${currencyNounPattern})\\b`,
  "gu",
);

export function splitCurrencyRevealSegments(
  value: string,
): CurrencyRevealSegment[] {
  const segments: CurrencyRevealSegment[] = [];
  let cursor = 0;

  for (const match of value.matchAll(currencyRevealPattern)) {
    const fullMatch = match[0];
    const countryLikePrefix = match[1];
    const matchIndex = match.index ?? 0;

    if (!fullMatch || !countryLikePrefix) {
      continue;
    }

    if (matchIndex > cursor) {
      segments.push({
        isBlurred: false,
        text: value.slice(cursor, matchIndex),
      });
    }

    segments.push({ isBlurred: true, text: countryLikePrefix });
    segments.push({
      isBlurred: false,
      text: fullMatch.slice(countryLikePrefix.length),
    });
    cursor = matchIndex + fullMatch.length;
  }

  if (cursor < value.length) {
    segments.push({ isBlurred: false, text: value.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ isBlurred: false, text: value }];
}
