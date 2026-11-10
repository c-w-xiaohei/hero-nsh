import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ColorArea, per port sheet 4b (T-001), plus
 * the pointer rules the sheet calls out (R-020, R-022, R-006, R-018).
 *
 * The upstream file has four cases. T-002 (data-slot and the BEM block class) is
 * deleted by D18. T-003 is turned into a screenshot: it asserts the
 * `color-area--show-dots` class, and what that class paints (the dot layer) is
 * not a public part, has no role or testID, and `nsh test` cannot read a
 * background image; the case lives on as the light/dark baseline of
 * `color-area/show-dots` (§7). T-004 moves the keyboard focus with Tab and lives
 * in color-area.heroui.web.test.tsx.
 *
 * T-001 is a partial port: upstream counts two hidden `type="range"` inputs
 * (the y input is aria-hidden) and NSH has neither a range input nor a
 * `slider` role (registered difference), so the two assertions become "exactly
 * one adjustable is on screen".
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };
type RecordedColor = { hue: number; saturation: number; hsl: string };

function lastLayout(app: App, name: string): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

function openFixture(name: string, locale = "en-US"): Promise<App> {
  return open("../../../color-area.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/color-area/color-area.test.tsx:32
// Partial port (port sheet T-001): a 2D slider is one accessible control here,
// and the only one — a second thumb, or a thumb that lost its role, fails.
test("T-001 renders an accessible 2D slider", async () => {
  const app = await openScenario("color-area/default", { locale: "en-US" });

  expect(app.shows("role:adjustable")).toBe(true);
  expect(app.count("role:adjustable")).toBe(1);
});

// react-aria/src/color/useColorArea.ts:189-290 (R-022): a pointer press on the
// area sets the value where it landed, the moves follow the finger, and the
// release commits once. The area is 200pt wide, the value starts at hue 200;
// dragging 50pt to the right moves the hue further right on the hue axis.
test("X-001 a pointer drag moves the color and ends once", async () => {
  const app = await openFixture("drag");

  expect(app.shows("id:area")).toBe(true);
  expect(app.shows("text:Idle")).toBe(true);

  await app.drag("id:area", { x: 50, y: 0 });

  const changes = callsOf(app, "onChange").map((args) => args[0] as RecordedColor);
  const ends = callsOf(app, "onChangeEnd").map((args) => args[0] as RecordedColor);

  expect(changes.length).toBeGreaterThanOrEqual(1);
  // One release, one commit — not one per move.
  expect(ends).toHaveLength(1);
  expect(ends[0]?.hsl).toBe(changes[changes.length - 1]?.hsl);
  expect(changes[changes.length - 1]?.hue).toBeGreaterThan(200);
  // The dragging flag comes back down when the finger lifts.
  expect(app.shows("text:Idle")).toBe(true);
});

// react-aria/src/color/useColorArea.ts:250-262 (R-020) and the styles' size
// pair (R-009, R-017): the thumb is 16pt and sits where its two channel
// percentages put it. hsl(90, 50%, 50%) is 25% from the left and 50% from the
// top of the area's padding box; the thumb is placed by `left` / `top`
// percentages with negative half-size margins, not a transform, so the box it
// reports is the box it draws. `onLayout` reports a view's frame in its parent
// (types.d.ts:1345), so the thumb's origin is already in the area's frame and
// must not be shifted by the area's origin (the Stage's 24pt padding, which the
// area itself reports). The centre is allowed 1pt for layout rounding; the
// wrong channel or a lost percentage moves it 50pt.
test("X-002 places the thumb at its channel percentages and keeps it 16pt", async () => {
  const app = await openFixture("geometry");

  const area = lastLayout(app, "area");
  const thumb = lastLayout(app, "thumb");

  expect(thumb.width).toBe(16);
  expect(thumb.height).toBe(16);

  const centerX = thumb.x + thumb.width / 2;
  const centerY = thumb.y + thumb.height / 2;

  expect(Math.abs(centerX - area.width * 0.25)).toBeLessThanOrEqual(1);
  expect(Math.abs(centerY - area.height * 0.5)).toBeLessThanOrEqual(1);
});

// styles/components/color-area.css:22-26 (R-006, R-018): disabled dims the root
// and the thumb and takes both out of input. NSH refuses a press on a disabled
// view outright, so no callback can run.
test("X-003 a disabled area takes no pointer input", async () => {
  const app = await openFixture("disabled");

  expect(app.enabled("role:adjustable")).toBe(false);
  await expect(app.press("role:adjustable")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(callsOf(app, "onChangeEnd")).toHaveLength(0);
});

// packages/react-stately/src/color/useColorAreaState.ts:105 (react-spectrum@740c6c5):
// `const DEFAULT_COLOR = parseColor('#ffffff');`. HeroUI's Root passes no
// defaultValue of its own, so `<ColorArea><ColorArea.Thumb/></ColorArea>`
// starts white. This port started on hsl(0, 100%, 50%) (Kobalte's default),
// which is red: the thumb sits elsewhere and onChange starts from another hue,
// saturation and lightness.
test("X-006 starts an uncontrolled area on white", async () => {
  const app = await openFixture("default-color");

  // White is hue 0, saturation 0%, lightness 100%; the red default would print
  // hsl(0 100% 50%) here instead.
  expect(app.texts()).toContain("hsl(0 0% 100%)");
});

// react-aria/src/color/useColorArea.ts:212 (`currentPosition.current.x +=
// (direction === 'rtl' ? -1 : 1) * deltaX / width`) and :298-299 (the press
// origin also flips under RTL). The finger lands at the middle of the 200pt
// area (hue 180) and moves 50pt right; in an RTL locale that sum is negated,
// so the last onChange must land near hue 90, not 270.
test("X-007 mirrors a horizontal drag in an RTL locale", async () => {
  const app = await openFixture("rtl-drag", "ar-EG");

  expect(app.shows("id:area")).toBe(true);

  await app.drag("id:area", { x: 50, y: 0 });

  const changes = callsOf(app, "onChange").map((args) => args[0] as RecordedColor);
  const last = changes[changes.length - 1];

  expect(last).toBeDefined();
  expect(Math.abs((last as RecordedColor).hue - 90)).toBeLessThanOrEqual(10);
});

// react-aria/src/color/useColorAreaGradient.ts:120-121,138: the thumb's `left`
// takes `x = 1 - x` in RTL. hsl(90, 50%, 50%) is 25% along the hue axis, so in
// an RTL locale the thumb's centre is 75% of the area's width from the left;
// the unmirrored build leaves it at 25%. The vertical fraction is untouched.
test("X-008 mirrors the thumb on the horizontal axis in RTL", async () => {
  const app = await openFixture("rtl-geometry", "ar-EG");

  const area = lastLayout(app, "area");
  const thumb = lastLayout(app, "thumb");
  const centerX = thumb.x + thumb.width / 2;
  const centerY = thumb.y + thumb.height / 2;

  expect(Math.abs(centerX - area.width * 0.75)).toBeLessThanOrEqual(1);
  expect(Math.abs(centerY - area.height * 0.5)).toBeLessThanOrEqual(1);
});
