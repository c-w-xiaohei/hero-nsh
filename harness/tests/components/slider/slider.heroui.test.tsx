import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Slider, per port sheet 4b (T-001 … T-026).
 * Every case keeps its upstream file:line above it and its title starts with
 * the port-sheet id. The assertions follow SOP 3.2: what NSH cannot read (the
 * hidden `type="range"` input, `data-slot` / `data-value` / `data-filled`,
 * BEM classes, computed styles, focus) is replaced by the visible effect — the
 * accessibility name, the Output's text, a testID on the real part, the Mark's
 * resolved text color, the boxes `onLayout` reports.
 *
 * `onLayout` reports a view's frame before its `translate`, so a Thumb's or a
 * Mark's percentage position is one edge of its box: left/top with `left` /
 * `top`, right or bottom when RTL or the vertical orientation flips it. The
 * helpers below rebuild the anchor, then compare it with the Track's usable
 * segment (the Track's border box minus its 0.75rem transparent borders).
 *
 * T-013 (the fill end caps) and T-015 (the step dots' values) are screenshots
 * in the port sheet: a Track has no text for `spanStyle`, and the decorative
 * dots have no text, testID or role for any query, so `--target web` captures
 * them. T-005's dot list is covered by the same Mark geometry cases.
 */

const INSET = 12; // 0.75rem, the transparent border on the Track

type Orientation = "horizontal" | "vertical";
type Direction = "ltr" | "rtl";

type LayoutCall = {
  name: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: { locale?: string; platform?: "windows" | "web" } = {},
): Promise<App> {
  return open("../../../slider.fixtures.tsx", {
    platform: options.platform ?? "windows",
    width: 1024,
    height: 768,
    locale: options.locale ?? "en-US",
    host: { params: { case: name, ...params } },
  });
}

function lastLayout(app: App, name: string, index = 0): LayoutCall {
  const found = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name && call.index === index);
  const call = found[found.length - 1];

  if (!call) throw new Error(`no layout call recorded for ${name}`);

  return call;
}

/**
 * The usable length of a Track: its border box minus the 0.75rem transparent
 * border at each end. Thumb and Fill both hang off the Track, so their frames
 * are in the Track's own coordinates.
 */
function usableLength(track: LayoutCall, orientation: Orientation): number {
  return (orientation === "vertical" ? track.height : track.width) - 2 * INSET;
}

/** Where a value sits in the Track's own coordinates, as a left/top offset. */
function trackPoint(
  track: LayoutCall,
  orientation: Orientation,
  dir: Direction,
  percent: number,
): number {
  if (orientation === "vertical") {
    return INSET + (1 - percent) * usableLength(track, orientation);
  }

  return INSET + (dir === "rtl" ? 1 - percent : percent) * usableLength(track, orientation);
}

/** Where a value sits in the Marks' own coordinates (the Mark's parent). */
function markPoint(
  marks: LayoutCall,
  orientation: Orientation,
  dir: Direction,
  percent: number,
): number {
  if (orientation === "vertical") return (1 - percent) * marks.height;

  return (dir === "rtl" ? 1 - percent : percent) * marks.width;
}

/** The edge a Thumb's `left` / `top` anchor occupies in its layout box. */
function thumbAnchor(thumb: LayoutCall, orientation: Orientation): number {
  return orientation === "vertical" ? thumb.y : thumb.x;
}

/** The edge a Mark's percentage anchor occupies in its layout box. */
function markAnchor(mark: LayoutCall, orientation: Orientation, dir: Direction): number {
  if (orientation === "vertical") return mark.y + mark.height;

  return dir === "rtl" ? mark.x + mark.width : mark.x;
}

function fillStart(fill: LayoutCall, orientation: Orientation, dir: Direction): number {
  if (orientation === "vertical") return fill.y + fill.height;

  return dir === "rtl" ? fill.x + fill.width : fill.x;
}

function fillEnd(fill: LayoutCall, orientation: Orientation, dir: Direction): number {
  if (orientation === "vertical") return fill.y;

  return dir === "rtl" ? fill.x : fill.x + fill.width;
}

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(1);
}

/* -------------------------------------------------------------------------------------------------
 * Composition and values
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/slider/slider.test.tsx:55
// Rewritten port (port sheet T-001): NSH has no `slider` role, so the Thumb is
// an `adjustable` view. The name still has to come from the composed Label
// through FieldContext: a broken registration loses the name.
test("T-001 renders a slider thumb with accessible name from composed Label", async () => {
  const app = await openScenario("slider/default", { locale: "en-US" });

  expect(app.shows("role:adjustable[Volume]")).toBe(true);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:61
// Partial port (port sheet T-002): the BEM block and the five `data-slot`
// assertions have no NSH attribute channel (D18). What remains is that the
// four parts are real components: each testID finds its own view, and the last
// selector proves Fill is composed inside Track rather than beside it.
test("T-002 exposes data-slots and BEM block", async () => {
  const app = await openScenario("slider/test-ids");

  expect(app.shows("id:output")).toBe(true);
  expect(app.shows("id:track")).toBe(true);
  expect(app.shows("id:track >> id:fill")).toBe(true);
  expect(app.shows("id:thumb")).toBe(true);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:74
// Rewritten port (port sheet T-003): upstream reads the hidden range input's
// value. Its two visible facts are the Output's text and where the thumb sits:
// 30% of the Track's 376-point usable segment, a tolerance of 1 point.
test("T-003 exposes default value via range input and output text", async () => {
  const app = await openCase("geometry", { defaultValue: 30 });

  expect(app.shows("id:output >> text:30")).toBe(true);
  expectClose(
    thumbAnchor(lastLayout(app, "thumb"), "horizontal"),
    trackPoint(lastLayout(app, "track"), "horizontal", "ltr", 0.3),
  );
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:131
// Rewritten port (port sheet T-007): NSH has no `rerender`, so the parent's
// update is a signal write behind the fixture's force-60 button.
test("T-007 supports controlled value", async () => {
  const app = await openCase("controlled");

  expect(app.shows("id:output >> text:40")).toBe(true);

  await app.press("id:force-60");

  expect(app.shows("id:output >> text:60")).toBe(true);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:161
// Partial port (port sheet T-008): the two `data-disabled` assertions have no
// NSH channel (D18). The three facts that remain are stronger: the thumb is
// disabled, a press on it is refused, and no change is reported.
test("T-008 supports disabled state and blocks keyboard interaction", async () => {
  const app = await openCase("disabled");

  expect(app.enabled("role:adjustable[Volume]")).toBe(false);
  await expect(app.press("role:adjustable[Volume]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:201
// Rewritten port (port sheet T-011): the two-thumb count and the two hidden
// input values become the Output's range text and the two thumbs' measured
// positions (10% and 50% of the usable segment).
test("T-011 renders two thumbs with independent accessible names", async () => {
  const app = await openCase("geometry", {
    defaultValue: "100,500",
    maxValue: 1000,
    minValue: 0,
    step: 50,
  });
  const track = lastLayout(app, "track");

  expect(app.count("role:adjustable")).toBe(2);
  expect(app.shows("id:output >> text:100 – 500")).toBe(true);
  expectClose(thumbAnchor(lastLayout(app, "thumb", 0), "horizontal"), trackPoint(track, "horizontal", "ltr", 0.1));
  expectClose(thumbAnchor(lastLayout(app, "thumb", 1), "horizontal"), trackPoint(track, "horizontal", "ltr", 0.5));
});

/* -------------------------------------------------------------------------------------------------
 * Steps and marks
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/slider/slider.test.tsx:272
// Partial port (port sheet T-015): the dots have no text, testID or role, so the
// five upstream parameter sets live in the shared scenarios for the reference
// screenshot comparison. This pins that each of them opens and formats its
// minimum; the dot sequence itself stays with the screenshot.
test("T-015 renders steps from minValue to maxValue by step for the five documented grids", async () => {
  const grids = [
    { scenario: "slider/steps-negative", text: "-0.3" },
    { scenario: "slider/steps-offset", text: "10" },
    { scenario: "slider/steps-tiny", text: "0" },
    { scenario: "slider/steps-overshoot", text: "5" },
    { scenario: "slider/steps-zero-range", text: "5" },
  ];

  for (const { scenario, text } of grids) {
    const app = await openScenario(scenario, { locale: "en-US" });

    expect(app.shows(`id:output >> text:${text}`)).toBe(true);
  }
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:286
// Rewritten port (port sheet T-016): the dots cannot be counted, but Steps
// returns null for more than 1000 dots, so the whole subtree is absent — a
// stronger fact than zero matching dots. The track and its value stay.
test("T-016 renders no automatic dots for excessively dense steps", async () => {
  const app = await openCase("indicators", { maxValue: 100, step: 0.001 });

  expect(app.shows("id:steps")).toBe(false);
  expect(app.shows("role:adjustable[Volume]")).toBe(true);
  expect(app.shows("id:output >> text:50")).toBe(true);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:308
// Partial port (port sheet T-018): the dot counts and the dot value lists are
// unreachable. The controlled updates stay, read through the Marks' resolved
// text color: filled marks share `text-foreground`, unfilled ones `text-muted`.
test("T-018 supports controlled range updates and recomputes dots when the step changes", async () => {
  const app = await openCase("controlled-range", {
    initial: "25,75",
    step: 25,
    next1Value: "50,100",
    next1Step: 50,
    next2Value: "-25,25",
    next2Step: 25,
    next2Min: -50,
    next2Max: 50,
  });

  const color = (value: number) => app.spanStyle(`id:marks >> text:${value} >> nth=0`).color;
  const first = color(50);

  expect(color(25)).toBe(first);
  expect(color(75)).toBe(first);
  expect(color(0)).not.toBe(first);
  expect(color(100)).not.toBe(first);

  await app.press("id:next-1");

  const second = color(50);

  expect(color(75)).toBe(second);
  expect(color(100)).toBe(second);

  await app.press("id:next-2");

  const third = color(0);

  expect(color(25)).toBe(third);
  expect(app.shows("id:marks >> text:75")).toBe(false);
  expect(app.shows("id:marks >> text:100")).toBe(false);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:326
// Rewritten port (port sheet T-019): the three visible texts and the thumb's
// name stay; the two `data-value` hooks become the first two Marks' positions
// on the Marks container (0 and 25%).
test("T-019 renders custom labels and locale-formatted defaults without changing the thumb name", async () => {
  const app = await openCase("labels", {}, { locale: "en-US" });
  const marks = lastLayout(app, "marks");

  expect(app.shows("text:Free")).toBe(true);
  expect(app.shows("text:$25.00")).toBe(true);
  expect(app.shows("text:Maximum")).toBe(true);
  expect(app.shows("role:adjustable[Budget]")).toBe(true);
  expectClose(markAnchor(lastLayout(app, "mark-0"), "horizontal", "ltr"), markPoint(marks, "horizontal", "ltr", 0));
  expectClose(
    markAnchor(lastLayout(app, "mark-25"), "horizontal", "ltr"),
    markPoint(marks, "horizontal", "ltr", 0.25),
  );
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:349
// Rewritten port (port sheet T-020): the `data-value` list becomes scoped text
// counts under the Marks container. A Mark that is not finite or out of bounds
// renders nothing, and 33 is not snapped to 25 or 50. Infinity's default
// formatted text is `∞`.
test("T-020 renders only finite marks within bounds without snapping arbitrary values", async () => {
  const app = await openCase("indicators", { marks: "-1,0,33,100,101,NaN,Infinity" });

  expect(app.count("id:marks >> text:0")).toBe(1);
  expect(app.count("id:marks >> text:33")).toBe(1);
  expect(app.count("id:marks >> text:100")).toBe(1);
  expect(app.count("id:marks >> text:-1")).toBe(0);
  expect(app.count("id:marks >> text:101")).toBe(0);
  expect(app.count("id:marks >> text:NaN")).toBe(0);
  expect(app.count("id:marks >> text:∞")).toBe(0);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:370
// Partial port (port sheet T-022): the three class assertions, `data-custom`,
// `toHaveStyle` and `render` (element replacement) have no NSH channel. Kept:
// each ref callback receives a node, testID reaches each part, and a custom
// Mark child renders.
test("T-022 supports refs, DOM props, classes, and custom mark rendering", async () => {
  const app = await openCase("refs");
  const mounted = (part: string) =>
    callsOf(app, "ref").filter((args) => {
      const call = args[0] as { part: string; mounted: boolean };

      return call.part === part && call.mounted;
    });

  expect(mounted("steps")).toHaveLength(1);
  expect(mounted("marks")).toHaveLength(1);
  expect(mounted("mark")).toHaveLength(1);
  expect(app.shows("id:steps")).toBe(true);
  expect(app.shows("id:marks")).toBe(true);
  expect(app.shows("id:mark")).toBe(true);
  expect(app.shows("text:Quiet")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * Alignment (browser cases, measured through onLayout)
 * -----------------------------------------------------------------------------------------------*/

const DIRECTIONS: { dir: Direction; locale: string }[] = [
  { dir: "ltr", locale: "en-US" },
  { dir: "rtl", locale: "ar-AE" },
];
const ORIENTATIONS: Orientation[] = ["horizontal", "vertical"];

// heroui/packages/react/tests/components/slider/slider.browser.test.tsx:75
// Partial port (port sheet T-024): dots have no text, testID or role, so their
// four centre / size / pointer-events assertions stay with the screenshot.
// Marks and thumbs share the same percentage maths and stay measurable: five
// Mark anchors on the Track's usable segment, the Marks outside the Track, the
// two thumbs on their marks, and the Fill's end on the last thumb.
for (const { dir, locale } of DIRECTIONS) {
  for (const orientation of ORIENTATIONS) {
    test(`T-024 renders ${orientation} step dots and marks aligned with the track and thumbs (${dir})`, async () => {
      const app = await openCase(
        "geometry",
        { defaultValue: "25,75", dir, marks: "0,25,50,75,100", orientation },
        { locale },
      );
      const track = lastLayout(app, "track");
      const marks = lastLayout(app, "marks");

      for (const value of [0, 25, 50, 75, 100]) {
        expectClose(
          markAnchor(lastLayout(app, `mark-${value}`), orientation, dir),
          markPoint(marks, orientation, dir, value / 100),
        );
      }

      for (const [index, value] of [25, 75].entries()) {
        expectClose(
          thumbAnchor(lastLayout(app, "thumb", index), orientation),
          trackPoint(track, orientation, dir, value / 100),
        );
      }

      // The Marks container must cover the Track's usable box, so the two
      // coordinate systems above describe the same stretch of the slider.
      if (orientation === "vertical") {
        expect(
          Math.abs(marks.y - (track.y + INSET)) < 1 &&
            Math.abs(marks.height - usableLength(track, orientation)) < 1,
        ).toBe(true);
        expect(
          dir === "rtl" ? marks.x + marks.width <= track.x : marks.x >= track.x + track.width,
        ).toBe(true);
      } else {
        expect(
          Math.abs(marks.x - (track.x + INSET)) < 1 &&
            Math.abs(marks.width - usableLength(track, orientation)) < 1,
        ).toBe(true);
        expect(marks.y).toBeGreaterThanOrEqual(track.y + track.height);
      }

      expectClose(
        fillEnd(lastLayout(app, "fill"), orientation, dir),
        thumbAnchor(lastLayout(app, "thumb", 1), orientation),
      );
    });
  }
}

// heroui/packages/react/tests/components/slider/slider.browser.test.tsx:142
// Rewritten port (port sheet T-025): each combination's two fill edges become
// two measured facts. A single thumb starts at the Track's usable start; a
// range starts at its first thumb and ends at its last (the second one).
for (const { dir, locale } of DIRECTIONS) {
  for (const orientation of ORIENTATIONS) {
    for (const range of [false, true]) {
      test(`T-025 renders the ${orientation} ${range ? "range" : "single"} fill aligned with its thumbs (${dir})`, async () => {
        const app = await openCase(
          "geometry",
          { defaultValue: range ? "20,60" : "25", dir, orientation },
          { locale },
        );
        const track = lastLayout(app, "track");
        const fill = lastLayout(app, "fill");
        const first = range
          ? thumbAnchor(lastLayout(app, "thumb", 0), orientation)
          : trackPoint(track, orientation, dir, 0);
        const last = thumbAnchor(lastLayout(app, "thumb", range ? 1 : 0), orientation);

        expect(fill.width).toBeGreaterThan(0);
        expect(fill.height).toBeGreaterThan(0);
        expectClose(fillStart(fill, orientation, dir), first);
        expectClose(fillEnd(fill, orientation, dir), last);
      });
    }
  }
}

/* -------------------------------------------------------------------------------------------------
 * Regressions
 * -----------------------------------------------------------------------------------------------*/

// Regression X-001, evidence:
//   src/components/slider/create-slider-state.ts:37-65, 285-311
// Upstream: tmp/vendor/react-spectrum/packages/react-aria-components/src/Slider.tsx:340-351 hands
// the whole SliderState to the render prop, and react-stately 3.51.0 useSliderState.d.ts:32-40
// declares `readonly defaultValues: number[]`. Port sheet tmp/port-sheets/slider.md:74 lists it as
// the first-frame snapshot: the restricted defaultValue when one was given, otherwise the first
// values.
test("X-001 exposes the first-frame defaultValues through the Root render prop", async () => {
  // Uncontrolled: the snapshot is the restricted defaultValue.
  let app = await openCase("state-defaults", { defaultValue: 30 }, { platform: "web" });

  expect(app.shows("id:default-values >> text:30")).toBe(true);

  // It is a snapshot, not the live values: an arrow key leaves it at 30.
  await app.keyboard.press("tab");
  await app.keyboard.press("arrowright");
  expect(app.shows("id:output >> text:31")).toBe(true);
  expect(app.shows("id:default-values >> text:30")).toBe(true);

  // The snapshot is restricted to the slider's bounds.
  app = await openCase(
    "state-defaults",
    { defaultValue: 150, maxValue: 100 },
    { platform: "web" },
  );
  expect(app.shows("id:default-values >> text:100")).toBe(true);

  // Controlled without a defaultValue: the first values are the snapshot.
  app = await openCase("state-defaults", { controlled: true, value: 40 }, { platform: "web" });
  expect(app.shows("id:default-values >> text:40")).toBe(true);
});

// Regression X-002, evidence:
//   src/components/slider/slider-mark.tsx:160-163
// Research 4.1 (tmp/heroui-nsh-port-research.md:175) and the 4.6 anti-pattern list (:292): every
// read of props.children builds new native views, so a Mark reads its children once. The probe
// child runs on each build, so two discarded trees show up as two extra calls.
test("X-002 builds a Mark's children exactly once", async () => {
  const app = await openCase("mark-children");

  expect(callsOf(app, "markChild")).toHaveLength(1);
  expect(app.shows("id:marks >> text:Quiet")).toBe(true);
});
