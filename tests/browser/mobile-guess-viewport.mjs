// Run against a local instance with node tests/browser/mobile-guess-viewport.mjs [origin].
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const origin = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const clue = {
    key: "continent",
    label: "Continent",
    value: "Europe",
    difficulty: 1,
    spoilerLevel: "safe",
  };
  await page.route("**/api/rounds/start", (route) =>
    route.fulfill({
      json: {
        roundId: "viewport-test",
        token: "test",
        kind: "standard",
        category: "countries",
        continent: null,
        mode: "classic",
        canGuess: true,
        remainingClues: 0,
        revealedClues: [clue],
        clues: [{ ...clue, isRevealed: true, prefetchedValue: clue.value }],
      },
    }),
  );
  await page.goto(new URL("/play/classic", origin).href);
  await page.getByText("All continents", { exact: true }).click();
  const input = page.getByRole("combobox", { name: "Guess the country" });
  const map = page.locator("[data-game-map]");
  const shapes = map.locator("path.map-country");
  await shapes.first().waitFor();
  // Choose a country in the part of the map all the keyboard sizes leave visible.
  const landmark = await shapes.evaluateAll((paths) => {
    const origin = paths[0].closest("svg").getBoundingClientRect();
    return paths
      .find((path) => {
        const rect = path.getBoundingClientRect();
        return (
          rect.width > 3 &&
          rect.left > origin.left &&
          rect.right < origin.right &&
          rect.top > origin.top &&
          rect.bottom < origin.top + 140
        );
      })
      ?.getAttribute("d");
  });
  assert.ok(landmark, "expected a landmark near the top of the map");
  const country = shapes.and(page.locator(`path[d="${landmark}"]`));

  async function measure() {
    const [{ x, y }, mapBox, inputBox, inputHit] = await Promise.all([
      country.boundingBox(),
      map.boundingBox(),
      input.boundingBox(),
      input.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          ) === element
        );
      }),
    ]);
    return {
      inputHit,
      mapTop: mapBox.y,
      countryX: x - mapBox.x,
      countryY: y - mapBox.y,
      inputTop: inputBox.y,
      inputBottom: inputBox.y + inputBox.height,
    };
  }

  async function setVisualViewport(height, offsetTop) {
    await page.evaluate(
      async ({ height, offsetTop }) => {
        const viewport = window.visualViewport;
        for (const [key, value] of Object.entries({
          height,
          offsetTop,
          pageTop: offsetTop + scrollY,
        })) {
          Object.defineProperty(viewport, key, { configurable: true, value });
        }
        viewport.dispatchEvent(new Event("resize"));
        viewport.dispatchEvent(new Event("scroll"));
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      },
      { height, offsetTop },
    );
  }

  const before = await measure();
  await input.tap();
  for (const [height, top] of [
    [844, 0],
    [690, 0],
    [520, 70],
    [368, 150],
    [820, 0], // A brief toolbar resize while the Android keyboard opens.
    [322, 174],
  ]) {
    await setVisualViewport(height, top);
    const current = await measure();
    const details = JSON.stringify({ height, top, ...current });
    assert.ok(Math.abs(current.mapTop - top) <= 1, `map top: ${details}`);
    assert.ok(
      current.inputHit &&
        current.inputTop >= top &&
        current.inputBottom <= top + height + 1,
      `input visibility: ${details}`,
    );
    assert.ok(
      Math.abs(current.countryX - before.countryX) <= 1 &&
        Math.abs(current.countryY - before.countryY) <= 1,
      `landmark: ${details}`,
    );
  }
  await input.fill("fr");
  const france = page.getByRole("option", { name: "France", exact: true });
  await france.waitFor();
  const visualBottom = await page.evaluate(
    () => visualViewport.offsetTop + visualViewport.height,
  );
  assert.ok(
    (await measure()).inputBottom <= visualBottom + 1,
    "input below keyboard after typing",
  );
  await france.tap();
  // Android's Back button restores viewport height while the input still has focus.
  await setVisualViewport(844, 0);
  assert.equal(
    await input.evaluate((element) => element.matches(":focus")),
    true,
  );
  const restored = await measure();
  assert.ok(
    Math.abs(restored.mapTop - before.mapTop) <= 1,
    "map position after blur",
  );
  assert.ok(
    Math.abs(restored.inputBottom - before.inputBottom) <= 1,
    `input position after blur: ${JSON.stringify({ before, restored })}`,
  );
  await setVisualViewport(368, 0);
  const reopened = await measure();
  assert.ok(
    reopened.inputHit && reopened.inputBottom <= 368 && reopened.mapTop === 0,
  );
  await input.evaluate((element) => element.blur());
  await setVisualViewport(844, 0);
  console.log(
    "Mobile viewport passed across keyboard opening, typing, and dismissal.",
  );
} finally {
  await browser.close();
}
