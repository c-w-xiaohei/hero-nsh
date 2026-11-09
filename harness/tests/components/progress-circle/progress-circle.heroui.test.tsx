import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ProgressCircle, per port sheet 4b
 * (T-001, T-003, T-005). T-002 and T-004 are deleted (D18 drops the BEM class
 * and `data-*` APIs, neither has a user-visible effect).
 *
 * T-003 was a screenshot in the port sheet, but the screenshot is not part of
 * this acceptance; its visible effect is read here instead by recording the
 * paint each canvas stroke hands the platform (harness/progress-circle.fixtures.tsx).
 * That keeps the warning (and every other) color variant verified rather than
 * left to an unrun comparison.
 */

// heroui/packages/react/tests/components/progress-circle/progress-circle.test.tsx:6
// Straight port (port sheet T-001): the scenario is the upstream JSX. The
// selector checks the progressbar role and the accessible name together, and
// either one being wrong fails it.
test("T-001 renders with progressbar role and accessible name", async () => {
  const app = await openScenario("progress-circle/default");
  expect(app.shows("role:progressbar[Loading]")).toBe(true);
});

// heroui/packages/react/tests/components/progress-circle/progress-circle.test.tsx:34
// Rewritten port (port sheet T-003): upstream asserts the BEM
// `progress-circle--warning` modifier. D18 drops class names, so the case reads
// what that class paints: the fill arc's stroke. A canvas probe records every
// stroke and its dash pattern; the fill is the dashed one (R-006), the track is
// the solid one (R-005). The expected paint is the same `token()` the variant
// maps to (R-016–R-020), read in the app's own appearance. A constant paint, a
// missing token, or a swapped mapping fails the matching color.
type StrokeCall = { paint: string; lineCap: string; dash: number[] };
type ExpectedPaint = { color: string; paint: string };

const colorTokens = {
  default: "default-foreground",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

test("T-003 paints each color variant's fill circle with that color's token", async () => {
  for (const color of Object.keys(colorTokens) as (keyof typeof colorTokens)[]) {
    const app = await open("../../../progress-circle.fixtures.tsx", {
      platform: "windows",
      width: 240,
      height: 240,
      host: { params: { color } },
    });

    const fills = callsOf(app, "stroke")
      .map((args) => args[0] as StrokeCall)
      .filter((call) => call.dash.length > 0);
    const expected = callsOf(app, "expected-paint").map(
      (args) => args[0] as ExpectedPaint,
    )[0];

    expect(expected.color).toBe(color);
    expect(fills.length).toBeGreaterThan(0);

    for (const fill of fills) {
      expect(fill.paint).toBe(expected.paint);
    }

    app.dispose();
  }
});

// heroui/packages/react/tests/components/progress-circle/progress-circle.test.tsx:63
// Partial port (port sheet T-005): the upstream case asserts three `data-slot`
// values (progress-circle-track / -track-circle / -fill-circle); D18 drops
// them. Each part must still be really mounted, so the three assertions read
// the part's own testID scoped to the progressbar root, as upstream's
// per-part lookup does. A part that is missing, or rendered outside the root,
// fails it.
test("T-005 mounts the track, track circle and fill circle", async () => {
  const app = await openScenario("progress-circle/default");
  expect(app.shows("role:progressbar[Loading] >> id:pcircle-track")).toBe(true);
  expect(app.shows("role:progressbar[Loading] >> id:pcircle-track-circle")).toBe(true);
  expect(app.shows("role:progressbar[Loading] >> id:pcircle-fill-circle")).toBe(true);
});

// src/primitives/progress/create-progress-state.ts:127-136
// The regression report probed `<ProgressCircle isIndeterminate valueLabel="half">`
// and got valueText "half". Upstream keeps `aria-valuetext` undefined when
// indeterminate (react-aria@3.53.1 useProgressBar.mjs:39-49), and Kobalte
// returns undefined for an indeterminate label before formatting
// (kobalte/packages/core/src/progress/progress-root.tsx:92-97); port sheet §2
// says an indeterminate circle uses only the caller's aria-valuetext. The
// scenario renders the render prop's valueText as copy, since `nsh/test` cannot
// query aria state. A value label leaking while indeterminate fails it.
test("X-001 an indeterminate circle exposes only the caller's aria-valuetext", async () => {
  const app = await openScenario("progress-circle/indeterminate-value-text");
  const texts = app.texts();

  expect(texts).toContain("Halfway there");
  expect(texts).toContain("no value text");
  expect(texts).not.toContain("half");
});
