import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Kobalte 0.13.14 regression cases for ProgressBar, per port sheet 4b
 * (T-007 ... T-013; T-014 ... T-017 are deleted because `data-progress` and
 * `data-indeterminate` are Kobalte-only API that HeroUI 3.2.7 does not have).
 *
 * Kobalte asserts aria-valuemin / aria-valuemax / aria-valuenow /
 * aria-valuetext and a DOM label reference. `nsh/test` reads none of them, so
 * every case uses the shared geometry fixture: the root is 200 points wide, the
 * Output text carries the formatted value, and the Fill's measured width
 * carries the percentage. The partial ports name the assertions that stay
 * unread.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

function openGeometry(params: Record<string, string | number | boolean> = {}): Promise<App> {
  return open("../../../progress-bar.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    host: { params: { case: "geometry", ...params } },
  });
}

/** The Fill's width out of the 200-point track, within a sub-point tolerance. */
function expectFillWidth(app: App, width: number): void {
  expect(Math.abs(lastLayout(app, "fill").width - width)).toBeLessThan(0.6);
}

// kobalte/packages/core/src/progress/progress.test.tsx:15
// Partial port (port sheet T-007): `aria-valuemin="0"`, `aria-valuemax="100"`
// and the DOM label reference have no NSH counterpart, and the zero-width
// `aria-valuenow="0"` fill is not measurable (a zero-size box reports no
// reliable layout). What stays: the role with the registered Label name, the
// visible label text, and the default formatted Output.
test("T-007 handles defaults", async () => {
  const app = await openGeometry();

  expect(app.shows("role:progressbar[Progress Bar]")).toBe(true);
  expect(app.texts()).toContain("Progress Bar");
  expect(app.texts()).toContain("0%");
});

// kobalte/packages/core/src/progress/progress.test.tsx:42
// Rewritten port (port sheet T-008): Kobalte's `getValueLabel` is HeroUI's
// `valueLabel`. The same string must reach the Output text, and the value must
// still drive the percentage: 3 of 10 is 30% of the 200-point track.
test("T-008 supports custom value label", async () => {
  const app = await openGeometry({ maxValue: 10, minValue: 0, value: 3, valueLabel: "3 of 10 completed" });

  expect(app.texts()).toContain("3 of 10 completed");
  expectFillWidth(app, 60);
});

// kobalte/packages/core/src/progress/progress.test.tsx:65
// Partial port (port sheet T-009): the aria-valuemin and aria-valuemax
// assertions have no visible counterpart and are dropped. `aria-valuenow="30"`
// and `aria-valuetext="30%"` survive as the Output text and the Fill width.
test("T-009 should update all fields by value", async () => {
  const app = await openGeometry({ value: 30 });

  expect(app.texts()).toContain("30%");
  expectFillWidth(app, 60);
});

// kobalte/packages/core/src/progress/progress.test.tsx:84
// Partial port (port sheet T-010): `aria-valuetext="0%"` survives as the Output
// text (an unclamped value would read `-1%`). The `aria-valuenow` assertion's
// visible counterpart is a zero-width Fill, which is not reliably measurable,
// so it is dropped.
test("T-010 should clamps values to 'minValue'", async () => {
  const app = await openGeometry({ minValue: 0, value: -1 });

  expect(app.texts()).toContain("0%");
});

// kobalte/packages/core/src/progress/progress.test.tsx:100
// Rewritten port (port sheet T-011): 200 over a max of 100 clamps to 100, so the
// Output reads `100%` and the Fill covers the whole 200-point track (an
// unclamped 200 would give 400 points).
test("T-011 should clamps values to 'maxValue'", async () => {
  const app = await openGeometry({ maxValue: 100, value: 200 });

  expect(app.texts()).toContain("100%");
  expectFillWidth(app, 200);
});

// kobalte/packages/core/src/progress/progress.test.tsx:116
// Rewritten port (port sheet T-012): with the range -5 ... 5, value 0 is the
// midpoint. The percentage is computed over the interval, not over 0 ... 100,
// so the Output reads `50%` and the Fill is half the track.
test("T-012 supports negative values", async () => {
  const app = await openGeometry({ maxValue: 5, minValue: -5, value: 0 });

  expect(app.texts()).toContain("50%");
  expectFillWidth(app, 100);
});

// kobalte/packages/core/src/progress/progress.test.tsx:132
// Partial port (port sheet T-013): the aria-valuemin and aria-valuemax
// assertions are dropped. What stays: the Output renders nothing (matching the
// absent aria-valuenow / aria-valuetext and the empty ValueLabel), the Fill
// keeps the 40% indeterminate width, and the root still has the role.
test("T-013 supports indeterminate state", async () => {
  const app = await openGeometry({ indeterminate: true });

  expect(app.texts().filter((text) => text.trim() !== "")).toEqual(["Progress Bar"]);
  expectFillWidth(app, 80);
  expect(app.shows("role:progressbar[Progress Bar]")).toBe(true);
});
