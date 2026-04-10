import "@/src/scripts/load-env";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getGeneratedPath, readGeneratedJson } from "@/src/lib/content/generated-io";
import type { EntityCategory, SourceEntity } from "@/src/lib/types";
import { getArgValue } from "@/src/scripts/cli-args";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function main() {
  const category = (getArgValue("category") ?? "cities") as EntityCategory;
  const hydrated = await readGeneratedJson<{
    entities: SourceEntity[];
    propertyLabels?: Record<string, string>;
  }>(
    "hydrated",
    `${category}.json`,
  );
  const totalEntities = hydrated.entities.length;
  const propertyCounts = new Map<string, number>();
  const propertyLabels = hydrated.propertyLabels ?? {};

  for (const entity of hydrated.entities) {
    for (const propertyId of Object.keys(entity.claims)) {
      const values = entity.claims[propertyId] ?? [];

      if (values.length === 0) {
        continue;
      }

      propertyCounts.set(propertyId, (propertyCounts.get(propertyId) ?? 0) + 1);
    }
  }

  const rows = [...propertyCounts.entries()]
    .map(([propertyId, count]) => ({
      propertyId,
      propertyLabel: propertyLabels[propertyId] ?? "Unknown property",
      count,
      percent: totalEntities === 0 ? 0 : (count / totalEntities) * 100,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.propertyId.localeCompare(right.propertyId);
    });

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(category)} property coverage</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #f5efe6;
        color: #1f1b17;
      }

      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 32px 20px 56px;
      }

      h1 {
        margin: 0;
        font-size: 2rem;
        line-height: 1.05;
      }

      p {
        color: #6b6259;
      }

      .summary {
        display: inline-flex;
        gap: 12px;
        flex-wrap: wrap;
        margin: 16px 0 28px;
      }

      .chip {
        border: 1px solid rgba(15, 118, 110, 0.14);
        background: rgba(15, 118, 110, 0.08);
        color: #115e59;
        border-radius: 999px;
        padding: 10px 14px;
        font-weight: 600;
      }

      .chart {
        display: grid;
        gap: 10px;
      }

      .row {
        display: grid;
        grid-template-columns: 108px minmax(0, 180px) minmax(0, 1fr) 88px;
        gap: 12px;
        align-items: center;
      }

      .label {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.95rem;
        font-weight: 700;
      }

      .name {
        color: #6b6259;
        font-size: 0.95rem;
      }

      .bar-wrap {
        position: relative;
        height: 18px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(31, 27, 23, 0.08);
      }

      .bar {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #0f766e 0%, #14b8a6 100%);
      }

      .value {
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: #6b6259;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 32px;
        background: rgba(255, 255, 255, 0.72);
        border-radius: 20px;
        overflow: hidden;
      }

      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid rgba(31, 27, 23, 0.08);
        text-align: left;
      }

      th {
        font-size: 0.82rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b6259;
      }

      td:first-child {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-weight: 700;
      }

      @media (max-width: 720px) {
        .row {
          grid-template-columns: 80px minmax(0, 120px) minmax(0, 1fr) 72px;
          gap: 8px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(category)} property coverage</h1>
      <p>Counts are based on hydrated entities and show how many entities contain at least one value for each property.</p>
      <div class="summary">
        <span class="chip">Entities: ${totalEntities}</span>
        <span class="chip">Properties found: ${rows.length}</span>
      </div>
      <section class="chart">
        ${rows
          .map(
            (row) => `<div class="row">
              <div class="label">${escapeHtml(row.propertyId)}</div>
              <div class="name">${escapeHtml(row.propertyLabel)}</div>
              <div class="bar-wrap"><div class="bar" style="width: ${Math.max(row.percent, 0.8).toFixed(2)}%"></div></div>
              <div class="value">${row.count} (${row.percent.toFixed(1)}%)</div>
            </div>`,
          )
          .join("\n")}
      </section>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Name</th>
            <th>Entities</th>
            <th>Coverage</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `<tr>
                <td>${escapeHtml(row.propertyId)}</td>
                <td>${escapeHtml(row.propertyLabel)}</td>
                <td>${row.count}</td>
                <td>${row.percent.toFixed(1)}%</td>
              </tr>`,
            )
            .join("\n")}
        </tbody>
      </table>
    </main>
  </body>
</html>
`;

  const reportDirectory = getGeneratedPath("reports");
  await mkdir(reportDirectory, { recursive: true });
  const target = path.join(reportDirectory, `${category}-property-coverage.html`);
  await writeFile(target, html, "utf8");

  console.log(
    `Wrote ${category} property coverage report for ${totalEntities} entities -> ${target}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
