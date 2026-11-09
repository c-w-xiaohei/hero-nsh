import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 regression cases for Meter, per port sheet 4b
 * (T-007 … T-012). Meter is a K-tier unit: the clamp → percentage → valueText
 * calculation is ported from Kobalte's `meter-root.tsx`.
 *
 * `nsh/test` cannot read `accessibilityValue` / aria attributes, so the six
 * upstream cases keep the facts that are observable: the role and the
 * registered name, the formatted output text, and the fill width inside a fixed
 * 300-point track (percentage × 300). The aria-valuemin / valuemax / valuenow /
 * valuetext assertions are the partial-port losses named per case.
 *
 * No platform-specific file is needed: Meter has no keyboard or focus behavior.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App): LayoutCall {
  const calls = callsOf(app, "layout").map((args) => args[0] as LayoutCall);
  const found = calls[calls.length - 1];

  if (!found) throw new Error("no layout call recorded for the fill");

  return found;
}

// kobalte/packages/core/src/meter/meter.test.tsx:16
// Partial port (port sheet T-007): four of the seven upstream assertions stay —
// the progressbar role (NSH has no `meter` role), the accessible name from the
// Label registration (replacing Kobalte's aria-labelledby id), the default
// "0%" output text and a zero-width fill in the 300-point track. The four
// aria-valuemin / valuemax / valuenow / valuetext reads have no NSH channel.
test("T-007 handles defaults", async () => {
  const app = await openScenario("meter/defaults");

  expect(app.shows("role:progressbar")).toBe(true);
  expect(app.shows("label:Meter")).toBe(true);
  expect(app.shows("id:value-label >> text:0%")).toBe(true);
  expect(lastLayout(app).width).toBe(0);
});

// kobalte/packages/core/src/meter/meter.test.tsx:43
// Partial port (port sheet T-008): Kobalte's `getValueLabel` prop does not exist
// in HeroUI's API, which uses `valueLabel`; the scenario drives the same text
// through it. The visible output text and the 30% fill (90 of 300) stay, the
// aria-valuetext read has no NSH channel.
test("T-008 supports custom value label", async () => {
  const app = await openScenario("meter/value-label");

  expect(app.shows("id:value-label >> text:3 of 10 completed")).toBe(true);
  expect(lastLayout(app).width).toBe(90);
});

// kobalte/packages/core/src/meter/meter.test.tsx:66
// Partial port (port sheet T-009): aria-valuenow "30" and aria-valuetext "30%"
// have visible counterparts — the output text and a 90-point fill. The two
// default min/max assertions are dropped (no NSH channel; T-007 covers them).
test("T-009 should update all fields by value", async () => {
  const app = await openScenario("meter/value-30");

  expect(app.shows("id:value-label >> text:30%")).toBe(true);
  expect(lastLayout(app).width).toBe(90);
});

// kobalte/packages/core/src/meter/meter.test.tsx:85
// Partial port (port sheet T-010): value -1 clamps to minValue 0, so the output
// reads "0%" and the fill is empty. The aria-valuenow / aria-valuetext reads
// have no NSH channel.
test("T-010 should clamps values to 'minValue'", async () => {
  const app = await openScenario("meter/clamp-min");

  expect(app.shows("id:value-label >> text:0%")).toBe(true);
  expect(lastLayout(app).width).toBe(0);
});

// kobalte/packages/core/src/meter/meter.test.tsx:101
// Partial port (port sheet T-011): value 200 clamps to maxValue 100, so the
// output reads "100%" and the fill spans the whole 300-point track.
test("T-011 should clamps values to 'maxValue'", async () => {
  const app = await openScenario("meter/clamp-max");

  expect(app.shows("id:value-label >> text:100%")).toBe(true);
  expect(lastLayout(app).width).toBe(300);
});

// kobalte/packages/core/src/meter/meter.test.tsx:117
// Partial port (port sheet T-012): value 0 with min -5 / max 5 sits halfway, so
// the output reads "50%" and the fill is 150 of 300 points.
test("T-012 supports negative values", async () => {
  const app = await openScenario("meter/negative");

  expect(app.shows("id:value-label >> text:50%")).toBe(true);
  expect(lastLayout(app).width).toBe(150);
});
