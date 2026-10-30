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
  "colón",
  "cordoba",
  "córdoba",
  "dalasi",
  "denar",
  "dinar",
  "dirham",
  "dollar",
  "dobra",
  "dong",
  "đồng",
  "dram",
  "escudo",
  "euro",
  "forint",
  "franc",
  "gourde",
  "guarani",
  "guaraní",
  "kina",
  "kip",
  "koruna",
  "krona",
  "króna",
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
  "paʻanga",
  "pataca",
  "peso",
  "pound",
  "pula",
  "quetzal",
  "rand",
  "real",
  "rial",
  "riel",
  "ringgit",
  "riyal",
  "ruble",
  "rouble",
  "rufiyaa",
  "rupee",
  "shekel",
  "shilling",
  "sol",
  "som",
  "somoni",
  "sterling",
  "taka",
  "tala",
  "tālā",
  "tenge",
  "togrog",
  "tögrög",
  "tugrik",
  "vatu",
  "vatus",
  "won",
  "yen",
  "yuan",
  "zloty",
] as const;
const currencyNounPattern = [...CURRENCY_NOUNS]
  .sort((left, right) => right.length - left.length)
  .map(
    (noun) =>
      `[${noun[0]!.toLocaleLowerCase()}${noun[0]!.toLocaleUpperCase()}]${noun.slice(1)}`,
  )
  .join("|");
const countryPrefixPattern = String.raw`((?:[\p{Lu}][\p{L}'-]*|[A-Z]{2,})(?:\s+(?:[\p{Lu}][\p{L}'-]*|[A-Z]{2,}|and|of|the))*)`;
const currencyRevealPattern = new RegExp(
  `${countryPrefixPattern}(?:\\s+(?:convertible|new))?\\s+(${currencyNounPattern})(?![\\p{L}\\p{N}])`,
  "gu",
);

// These are country adjectives, not generic geographic terms. Comparing them to
// the actual answer avoids redacting shared currencies such as Swiss franc.
const COUNTRY_QUALIFIER_ALIASES: Record<string, readonly string[]> = {
  Albania: ["Albanian"],
  Algeria: ["Algerian"],
  Argentina: ["Argentine"],
  Armenia: ["Armenian"],
  Azerbaijan: ["Azerbaijani"],
  Bahrain: ["Bahraini"],
  Bangladesh: ["Bangladeshi"],
  Barbados: ["Barbadian"],
  Belarus: ["Belarusian"],
  Brazil: ["Brazilian"],
  Burundi: ["Burundian"],
  "Cape Verde": ["Cape Verdean"],
  Chile: ["Chilean"],
  Colombia: ["Colombian"],
  Comoros: ["Comorian"],
  "Costa Rica": ["Costa Rican"],
  Cuba: ["Cuban"],
  "Dominican Republic": ["Dominican"],
  "Czech Republic": ["Czech"],
  "Democratic Republic of the Congo": ["Congolese"],
  Denmark: ["Danish"],
  Djibouti: ["Djiboutian"],
  Egypt: ["Egyptian"],
  Fiji: ["Fijian"],
  France: ["French"],
  Georgia: ["Georgian"],
  Guinea: ["Guinean"],
  Guyana: ["Guyanese"],
  Honduras: ["Honduran"],
  Iceland: ["Icelandic"],
  India: ["Indian"],
  Iran: ["Iranian"],
  Iraq: ["Iraqi"],
  Jamaica: ["Jamaican"],
  Jordan: ["Jordanian"],
  Kazakhstan: ["Kazakhstani"],
  Kenya: ["Kenyan"],
  Kuwait: ["Kuwaiti"],
  Kyrgyzstan: ["Kyrgyz"],
  Laos: ["Lao"],
  Lebanon: ["Lebanese"],
  Liberia: ["Liberian"],
  Libya: ["Libyan"],
  Malawi: ["Malawian"],
  Malaysia: ["Malaysian"],
  Maldives: ["Maldivian"],
  Mauritania: ["Mauritanian"],
  Mauritius: ["Mauritian"],
  Moldova: ["Moldovan"],
  Mongolia: ["Mongolian"],
  Morocco: ["Moroccan"],
  Mozambique: ["Mozambican"],
  Namibia: ["Namibian"],
  Nepal: ["Nepalese"],
  Nicaragua: ["Nicaraguan"],
  "North Korea": ["North Korean"],
  "North Macedonia": ["Macedonian"],
  Norway: ["Norwegian"],
  Oman: ["Omani"],
  Pakistan: ["Pakistani"],
  Panama: ["Panamanian"],
  Paraguay: ["Paraguayan"],
  Philippines: ["Philippine"],
  Qatar: ["Qatari"],
  Romania: ["Romanian"],
  Russia: ["Russian"],
  Rwanda: ["Rwandan"],
  Samoa: ["Samoan"],
  "Saudi Arabia": ["Saudi"],
  Serbia: ["Serbian"],
  Seychelles: ["Seychellois"],
  Somalia: ["Somali"],
  "South Sudan": ["South Sudanese"],
  "Sri Lanka": ["Sri Lankan"],
  Sudan: ["Sudanese"],
  Suriname: ["Surinamese"],
  Sweden: ["Swedish"],
  Switzerland: ["Swiss"],
  Syria: ["Syrian"],
  Tajikistan: ["Tajikistani"],
  Tanzania: ["Tanzanian"],
  "The Bahamas": ["Bahamian"],
  Tunisia: ["Tunisian"],
  Tonga: ["Tongan"],
  Turkey: ["Turkish"],
  Tuvalu: ["Tuvaluan"],
  Uganda: ["Ugandan"],
  Uruguay: ["Uruguayan"],
  Uzbekistan: ["Uzbek"],
  Vietnam: ["Vietnamese"],
  Yemen: ["Yemeni"],
  Zambia: ["Zambian"],
};

function normalizeReference(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase();
}
function getCurrencyMatches(value: string) {
  return [...value.matchAll(currencyRevealPattern)].flatMap((match) => {
    const [fullMatch, countryLikePrefix] = match;
    return fullMatch && countryLikePrefix
      ? [{ fullMatch, countryLikePrefix, index: match.index ?? 0 }]
      : [];
  });
}

export function getCurrencyRedactionTexts(
  value: string,
  country: string,
): string[] {
  const references = new Set([
    normalizeReference(country),
    ...(COUNTRY_QUALIFIER_ALIASES[country] ?? []).map(normalizeReference),
  ]);
  return getCurrencyMatches(value)
    .map(({ countryLikePrefix }) => countryLikePrefix)
    .filter((prefix) => references.has(normalizeReference(prefix)));
}

export function splitCurrencyRevealSegments(
  value: string,
  redactionTexts: readonly string[] = [],
): CurrencyRevealSegment[] {
  const segments: CurrencyRevealSegment[] = [];
  const redactions = new Set(redactionTexts.map(normalizeReference));
  let cursor = 0;
  for (const { fullMatch, countryLikePrefix, index } of getCurrencyMatches(
    value,
  )) {
    if (!redactions.has(normalizeReference(countryLikePrefix))) continue;
    if (index > cursor)
      segments.push({ isBlurred: false, text: value.slice(cursor, index) });
    segments.push({ isBlurred: true, text: countryLikePrefix });
    segments.push({
      isBlurred: false,
      text: fullMatch.slice(countryLikePrefix.length),
    });
    cursor = index + fullMatch.length;
  }
  if (cursor < value.length)
    segments.push({ isBlurred: false, text: value.slice(cursor) });
  return segments.length > 0 ? segments : [{ isBlurred: false, text: value }];
}
