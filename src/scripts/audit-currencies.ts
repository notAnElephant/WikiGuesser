import "@/src/scripts/load-env";
import { writeFile } from "node:fs/promises";

import {
  getCurrencyRedactionTexts,
  splitCurrencyRevealSegments,
} from "@/src/lib/game/currency-censor";
import { getGeneratedPath } from "@/src/lib/content/generated-io";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";

function escapeTableCell(value: string): string {
  return value.replaceAll("|", "\\|");
}

async function main() {
  const snapshot = await getLatestSnapshot();
  const rows = snapshot.entities
    .filter((entity) => entity.category === "countries")
    .map((entity) => {
      const currency = entity.clues.find(
        (clue) => clue.key === "currency",
      )?.value;

      if (!currency) {
        return null;
      }

      const censored = splitCurrencyRevealSegments(
        currency,
        getCurrencyRedactionTexts(currency, entity.canonicalAnswer),
      )
        .map((segment) =>
          segment.isBlurred ? `[BLURRED: ${segment.text}]` : segment.text,
        )
        .join("");

      return {
        country: entity.canonicalAnswer,
        currency,
        censored,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => left.country.localeCompare(right.country));

  const report = [
    "# Currency censor audit",
    "",
    `Generated from live snapshot \`${snapshot.key}\` (${rows.length} countries).`,
    "",
    "`[BLURRED: …]` marks exactly the text the game redacts; unmarked text remains visible.",
    "",
    "| Country | Currency | Blurred currency |",
    "| --- | --- | --- |",
    ...rows.map(
      ({ country, currency, censored }) =>
        `| ${escapeTableCell(country)} | ${escapeTableCell(currency)} | ${escapeTableCell(censored)} |`,
    ),
    "",
  ].join("\n");
  const target = getGeneratedPath("reports", "currency-censor-audit.md");

  await writeFile(target, report, "utf8");
  console.log(`Wrote ${rows.length} country rows to ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
