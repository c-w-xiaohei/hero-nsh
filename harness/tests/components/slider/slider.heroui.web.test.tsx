import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only Slider cases: each one moves the keyboard focus with Tab, which the
 * web target does and a real Windows window does not (NSH 0.4.0's Win32 host
 * only focuses Inputs; the port sheet registers that difference in section 8).
 * T-026 drives a pointer drag, which the web target plays as the mouse.
 *
 * The assertions follow SOP 3.2 and the port sheet's 4b column. `onLayout`
 * reports a view's frame before its `translate`, so a Thumb's percentage
 * position is the left/top edge of its box (the anchor its inline `left` /
 * `top` sets), not the box's centre.
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
    platform: options.platform ?? "web",
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

/** The usable length of a Track: its border box minus its two transparent borders. */
function usableLength(track: LayoutCall, orientation: Orientation): number {
  return (orientation === "vertical" ? track.height : track.width) - 2 * INSET;
}

/** Where a value sits in the Track's own coordinates (Thumb and Fill hang off it). */
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

function thumbAnchor(thumb: LayoutCall, orientation: Orientation): number {
  return orientation === "vertical" ? thumb.y : thumb.x;
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

function lastChange(app: App, name: "onChange" | "onChangeEnd"): unknown[] | undefined {
  const calls = callsOf(app, name);

  return calls[calls.length - 1];
}

/* -------------------------------------------------------------------------------------------------
 * Keyboard updates
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/slider/slider.test.tsx:83
// Rewritten port (port sheet T-004): Tab focuses the one thumb, then the arrow
// keys move it by one step. The hidden input's value becomes the Root render
// prop's value text.
test("T-004 calls onChange when value is incremented or decremented", async () => {
  const app = await openCase("keyboard");

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("arrowright");
  expect(lastChange(app, "onChange")).toEqual([31]);
  // Two texts read 31: the Output and the Root render prop's value readout.
  expect(app.count("text:31")).toBe(2);

  await app.keyboard.press("arrowleft");
  expect(lastChange(app, "onChange")).toEqual([30]);
  expect(app.count("text:30")).toBe(2);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:101
// Rewritten port (port sheet T-005): End and Home jump to the ends; each
// assertion pairs the reported value with the visible value text.
test("T-005 supports Home / End keys to jump to min / max", async () => {
  const app = await openCase("keyboard");

  await app.keyboard.press("tab");

  await app.keyboard.press("end");
  expect(lastChange(app, "onChange")?.[0] === 100 && app.count("text:100") === 2).toBe(true);

  await app.keyboard.press("home");
  expect(lastChange(app, "onChange")?.[0] === 0 && app.count("text:0") === 2).toBe(true);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:117
// Ported (port sheet T-006): React Aria commits once per key press, unlike
// Kobalte's commit-on-blur, so one ArrowRight ends one interaction at 31.
test("T-006 calls onChangeEnd when the interaction completes", async () => {
  const app = await openCase("keyboard");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowright");

  expect(lastChange(app, "onChangeEnd")).toEqual([31]);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:189
// Rewritten port (port sheet T-010): the focus ring itself is a box shadow,
// which `spanStyle` cannot read, so the Thumb's isFocusVisible render prop
// prints FocusRing instead.
test("T-010 supports focus-visible via keyboard", async () => {
  const app = await openCase("keyboard");

  expect(app.shows("text:NoRing")).toBe(true);

  await app.keyboard.press("tab");

  expect(callsOf(app, "onFocus")).toHaveLength(1);
  expect(app.shows("text:FocusRing")).toBe(true);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:211
// Rewritten port (port sheet T-012): two Tabs reach the two thumbs in turn;
// each arrow moves only the focused one, and the pair of values is the probe's
// payload.
test("T-012 supports moving the focused thumb via arrow keys", async () => {
  const app = await openCase("range-keyboard");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowright");

  expect(lastChange(app, "onChange")).toEqual([[150, 500]]);
  // The Output formats the range as "150 – 500"; the comma-joined readout is
  // the Root render prop's own text, so exactly one text reads it.
  expect(app.count("text:150,500")).toBe(1);

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowleft");

  expect(lastChange(app, "onChange")).toEqual([[150, 450]]);
  expect(app.count("text:150,450")).toBe(1);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:183
// Rewritten port (port sheet T-009): `data-orientation` becomes its visible
// effect and its behaviour in one assertion — a vertical thumb at 30 sits 70%
// of the usable height from the top (30% from the bottom), and ArrowUp after
// Tab increases the value. A horizontal slider would sit at 30% from the left
// and ArrowUp would not move it.
test("T-009 supports vertical orientation via data-orientation", async () => {
  const app = await openCase("geometry", { defaultValue: 30, orientation: "vertical" });
  const expected = trackPoint(lastLayout(app, "track"), "vertical", "ltr", 0.3);
  const thumb = lastLayout(app, "thumb");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowup");

  expect(
    Math.abs(thumbAnchor(thumb, "vertical") - expected) < 1 &&
      lastChange(app, "onChange")?.[0] === 31,
  ).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * Steps and marks
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/slider/slider.test.tsx:251
// Partial port (port sheet T-014): the dot list, its `data-value` values and
// its aria-hidden attribute are unreadable. Kept: the Tab order proves the
// decorative dots add no stop — the first Tab lands on the thumb and the second
// goes straight to the known view after the slider (upstream's Tab to `body`,
// which NSH's web target does not report as a blur).
test("T-014 renders decorative step dots without adding tab stops", async () => {
  const app = await openCase("indicators");

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onBlur")).toHaveLength(1);
  expect(callsOf(app, "afterFocus")).toHaveLength(1);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:293
// Partial port (port sheet T-017): the dots' filled lists stay with the
// screenshot. The marks share the same maths and stay: their resolved text
// color is text-foreground while filled and text-muted while not, so equality
// with a filled mark and difference from an unfilled one are both testable.
test("T-017 supports keyboard updates to the filled step and mark states", async () => {
  const app = await openCase("indicators");
  const color = (value: number) => app.spanStyle(`id:marks >> text:${value} >> nth=0`).color;
  const filled = color(50);

  expect(color(25)).toBe(filled);
  expect(color(0)).toBe(filled);
  expect(color(100)).not.toBe(filled);

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowright");

  expect(lastChange(app, "onChange")).toEqual([75]);
  expect(lastChange(app, "onChangeEnd")).toEqual([75]);
  expect(color(75) === color(50) && color(100) !== color(50)).toBe(true);
});

// heroui/packages/react/tests/components/slider/slider.test.tsx:357
// Partial port (port sheet T-021): the per-element `data-disabled` assertions
// are gone. Kept: the thumb is disabled, Tab skips it so an arrow changes
// nothing, and the filled marks still read filled (the values did not move).
test("T-021 exposes disabled state and preserves values during keyboard interaction", async () => {
  const app = await openCase("disabled");
  const color = (value: number) => app.spanStyle(`id:marks >> text:${value} >> nth=0`).color;

  expect(app.enabled("role:adjustable[Volume]")).toBe(false);

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowright");
  expect(callsOf(app, "onChange")).toHaveLength(0);

  const filled = color(50);

  expect(color(0)).toBe(filled);
  expect(color(25)).toBe(filled);
});

/* -------------------------------------------------------------------------------------------------
 * Locale and pointer
 * -----------------------------------------------------------------------------------------------*/

const DIRECTIONS: { dir: Direction; locale: string }[] = [
  { dir: "ltr", locale: "en-US" },
  { dir: "rtl", locale: "ar-AE" },
];

// heroui/packages/react/tests/components/slider/slider.browser.test.tsx:12
// Partial port (port sheet T-023): NSH fixes the locale when the app opens, so
// the runtime switch becomes two apps. The three computed-style end caps stay
// with the screenshot; the fill's two edges and the key direction remain: a
// RTL slider grows from its right edge, and ArrowLeft (not ArrowRight) raises
// the value.
for (const { dir, locale } of DIRECTIONS) {
  test(`T-023 supports switching locale after mounting without splitting the track fill (${dir})`, async () => {
    const app = await openCase("geometry", { defaultValue: 14, dir, marks: "0,100" }, { locale });
    const track = lastLayout(app, "track");
    const fill = lastLayout(app, "fill");

    expectClose(fillStart(fill, "horizontal", dir), trackPoint(track, "horizontal", dir, 0));
    expectClose(
      fillEnd(fill, "horizontal", dir),
      thumbAnchor(lastLayout(app, "thumb"), "horizontal"),
    );

    await app.keyboard.press("tab");
    await app.keyboard.press(dir === "rtl" ? "arrowleft" : "arrowright");

    expect(app.shows("id:output >> text:15")).toBe(true);
  });
}

// heroui/packages/react/tests/components/slider/slider.browser.test.tsx:202
// Rewritten port (port sheet T-026): the click on the dot at 75% becomes a drag
// from the Track's middle by a quarter of its width. Both callbacks, the value
// text, the mark's filled color and the thumb's focus are the five facts the
// upstream case reads (the input's value and focus, the dot's data-filled).
test("T-026 supports pointer interaction through dots and updates their filled state", async () => {
  const app = await openCase("drag");

  await app.drag("id:track", { x: 100, y: 0 });

  expect(lastChange(app, "onChange")).toEqual([75]);
  expect(lastChange(app, "onChangeEnd")).toEqual([75]);
  expect(app.shows("id:output >> text:75")).toBe(true);
  expect(app.spanStyle("id:marks >> text:75 >> nth=0").color).toBe(app.spanStyle("id:marks >> text:0 >> nth=0").color);
  expect(callsOf(app, "onFocus")).toHaveLength(1);
});

/* -------------------------------------------------------------------------------------------------
 * Regressions
 * -----------------------------------------------------------------------------------------------*/

// Regression X-001 (keyboard half), evidence:
//   src/components/slider/create-slider-state.ts:37-65, 285-311
// `defaultValues` is a snapshot taken on the first frame, not a reader of the
// live values: ArrowRight moves the value to 31 while the snapshot stays at 30.
// It sits here because reaching the thumb with Tab only works on the web target
// (NSH 0.4.0's Win32 host focuses Inputs only; port sheet section 8).
test("X-001 keeps defaultValues at its first-frame snapshot while the value moves", async () => {
  const app = await openCase("state-defaults", { defaultValue: 30 });

  expect(app.shows("id:default-values >> text:30")).toBe(true);

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowright");

  expect(app.shows("id:output >> text:31")).toBe(true);
  expect(app.shows("id:default-values >> text:30")).toBe(true);
});
