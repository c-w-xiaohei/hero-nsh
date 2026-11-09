import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for Switch, per port sheet 4b
 * (T-001, T-004 … T-015). Every case keeps its upstream file:line and title, and
 * the assertions follow SOP 3.2: what NSH cannot read (data-* attributes, DOM
 * ids, computed thumb endpoints) is replaced by the observable effect, never
 * dropped silently. The partial ports T-013 … T-015 say what stays unread.
 */

// Resolved from theme/hero-nsh.theme.json: accent oklch(0.6204 0.195 253.83)
// is #0485f7ff. `text-accent` sits on the thumb while selected.
const ACCENT = "#0485f7ff";

function openCase(
  name: string,
  params: Record<string, string | number | boolean> = {},
  options: { platform?: "windows" | "web" } = {},
) {
  return open("../../../switch.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: name, ...params } },
  });
}

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function layoutCalls(app: App): LayoutCall[] {
  return callsOf(app, "layout").map((args) => args[0] as LayoutCall);
}

function lastLayout(app: App, name: "track" | "thumb"): LayoutCall {
  const calls = layoutCalls(app).filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

/** The thumb's margin on the side it starts from, in points, from the layout boxes. */
function startGap(track: LayoutCall, thumb: LayoutCall, dir: "ltr" | "rtl"): number {
  return dir === "rtl" ? track.width - (thumb.x + thumb.width) : thumb.x;
}

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(0.6);
}

const SIZES = [
  { size: "sm", track: 32, thumbWidth: 16.5, thumbHeight: 12 },
  { size: "md", track: 40, thumbWidth: 22, thumbHeight: 16 },
  { size: "lg", track: 48, thumbWidth: 27.5, thumbHeight: 20 },
] as const;

const DIRECTIONS = [
  { dir: "ltr", name: "LTR" },
  { dir: "rtl", name: "HTML RTL" },
] as const;

/* -------------------------------------------------------------------------------------------------
 * HeroUI unit cases
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/switch/switch.test.tsx:27
test("T-001 renders with role and accessible name", async () => {
  const app = await openScenario("switch/basic");

  // Two facts in one check: the role name and the Label really registering its
  // text as the content's accessibilityLabel. The role's name alone falls back
  // to the inner texts, so only `label:` can tell registration from a fallback.
  expect(
    app.shows("role:switch[Enable notifications]") && app.shows("label:Enable notifications"),
  ).toBe(true);
});

// heroui/packages/react/tests/components/switch/switch.test.tsx:55
// Rewritten port (port sheet T-004): data-testid and data-slot have no NSH
// channel (D18); the capability is testID passthrough.
test("T-004 supports data attribute passthrough on the field", async () => {
  const app = await openScenario("switch/test-id");

  expect(app.shows("id:notifications")).toBe(true);
});

// heroui/packages/react/tests/components/switch/switch.test.tsx:70
test("T-005 calls onChange when selection is toggled", async () => {
  const app = await openCase("log");
  const control = "role:switch[Enable notifications]";

  expect(app.shows("text:Off")).toBe(true);

  await app.press(control);
  expect(callsOf(app, "onChange")).toEqual([[true]]);
  expect(app.shows("text:On")).toBe(true);

  await app.press(control);
  expect(callsOf(app, "onChange")).toEqual([[true], [false]]);
  expect(app.shows("text:Off")).toBe(true);
});

// heroui/packages/react/tests/components/switch/switch.test.tsx:99
test("T-007 supports controlled isSelected", async () => {
  const app = await openCase("controlled");
  const control = "role:switch[Enable notifications]";

  expect(app.shows("text:Off")).toBe(true);

  await app.press(control);
  // The controlled parent did not write back: the surface must stay Off while
  // the callback still reports the requested value.
  expect(app.shows("text:Off") && callsOf(app, "onChange")[0]?.[0] === true).toBe(true);

  await app.press("id:force");
  expect(app.shows("text:On")).toBe(true);
});

// heroui/packages/react/tests/components/switch/switch.test.tsx:132
// Rewritten port (port sheet T-008): data-selected has no NSH channel; its two
// visible results are the selected state text and the thumb mark's `text-accent`.
test("T-008 exposes data-selected when selected", async () => {
  const app = await openScenario("switch/thumb-mark.split");
  const mark = "text:•";

  // Unselected the thumb paints the mark with text-black, so the accent read
  // after the press is a change and not a value the default state already had.
  expect(app.spanStyle(mark).color).not.toBe(ACCENT);

  await app.press("role:switch[Enable notifications]");

  expect(app.shows("text:On") && app.spanStyle(mark).color === ACCENT).toBe(true);
});

// heroui/packages/react/tests/components/switch/switch.test.tsx:141
test("T-009 supports hover state on the interactive surface", async () => {
  const app = await openCase("log");

  expect(app.shows("text:Idle")).toBe(true);

  await app.hover("role:switch[Enable notifications]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(1);
  expect(app.shows("text:Hovered")).toBe(true);

  await app.hover("id:away");
  expect(callsOf(app, "onHoverEnd")).toHaveLength(1);
  expect(app.shows("text:Idle")).toBe(true);
});

// heroui/packages/react/tests/components/switch/switch.test.tsx:153
test("T-010 supports disabled state and blocks interaction", async () => {
  const app = await openCase("disabled");
  const control = "role:switch[Enable notifications]";

  expect(app.enabled(control)).toBe(false);
  await expect(app.press(control)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/switch/switch.test.tsx:167
test("T-011 exposes no hover state when disabled", async () => {
  const app = await openCase("disabled");

  await app.hover("role:switch[Enable notifications]");

  expect(callsOf(app, "onHoverStart")).toHaveLength(0);
  expect(app.shows("text:Idle")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * HeroUI browser cases, partially ported: onLayout reads the layout boxes,
 * never the transformed endpoint (NSH has no geometry query for that).
 * -----------------------------------------------------------------------------------------------*/

for (const { dir, name } of DIRECTIONS) {
  for (const size of SIZES) {
    // heroui/packages/react/tests/components/switch/switch.browser.test.tsx:56
    test(`T-013 supports both thumb endpoints at size ${size.size} with default track width (${name})`, async () => {
      const app = await openCase("layout", { dir, size: size.size });
      const track = lastLayout(app, "track");
      const thumb = lastLayout(app, "thumb");

      expect(track.width).toBe(size.track);
      expectClose(thumb.width, size.thumbWidth);
      expectClose(thumb.height, size.thumbHeight);
      expectClose(startGap(track, thumb, dir), 2);

      expect(app.shows("text:Off")).toBe(true);

      await app.press("role:switch[Enable notifications]");
      expect(app.shows("text:On")).toBe(true);

      const after = lastLayout(app, "thumb");

      expectClose(after.width, size.thumbWidth);
      expectClose(after.height, size.thumbHeight);
      expectClose(startGap(lastLayout(app, "track"), after, dir), 2);
    });
  }
}

// heroui/packages/react/tests/components/switch/switch.browser.test.tsx:83
test("T-014 supports resizing a selected track with inherited CSS RTL", async () => {
  const app = await openCase("layout", { dir: "rtl", selected: true, size: "md" });

  const track = lastLayout(app, "track");

  expect(track.width).toBe(40);
  expect(app.shows("text:On")).toBe(true);
  expectClose(startGap(track, lastLayout(app, "thumb"), "rtl"), 2);

  await app.press("id:resize");

  const resized = lastLayout(app, "track");
  const thumb = lastLayout(app, "thumb");

  expect(resized.width).toBe(64);
  expectClose(startGap(resized, thumb, "rtl"), 2);
  expectClose(thumb.width, 22);
  expect(app.shows("text:On")).toBe(true);
});

// heroui/packages/react/tests/components/switch/switch.browser.test.tsx:96
test("T-015 supports intermediate thumb positions without changing its dimensions or margin", async () => {
  const app = await openCase("layout", { dir: "ltr", size: "md", wide: true });
  const control = "role:switch[Enable notifications]";

  const track = lastLayout(app, "track");
  const thumb = lastLayout(app, "thumb");

  expect(track.width).toBe(64);
  expectClose(thumb.width, 22);
  expectClose(thumb.height, 16);
  expectClose(startGap(track, thumb, "ltr"), 2);

  expect(app.shows("text:Off")).toBe(true);

  await app.press(control);
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "onChange")).toHaveLength(1);

  const after = lastLayout(app, "thumb");

  expectClose(after.width, thumb.width);
  expectClose(after.height, thumb.height);
  expectClose(startGap(lastLayout(app, "track"), after, "ltr"), 2);
});

/* -------------------------------------------------------------------------------------------------
 * X cases: behaviour the React Aria sources pin down and no upstream HeroUI
 * test covers (WAI-ARIA toggle contract, D17).
 * -----------------------------------------------------------------------------------------------*/

// react-aria/src/toggle/useToggle.ts:174-184, react-aria/src/form/useFormValidation.ts:91-93
test("X-002 shows a validation error right after a press and clears it on the next", async () => {
  const app = await openCase("validation");
  const control = "role:switch[Enable notifications]";
  const error = "text:Selected is not allowed";

  expect(app.shows(error)).toBe(false);

  await app.press(control);
  expect(app.shows("text:On")).toBe(true);
  expect(app.shows(error)).toBe(true);

  await app.press(control);
  expect(app.shows("text:Off")).toBe(true);
  expect(app.shows(error)).toBe(false);
});

// react-aria-components/src/Switch.tsx:71-77, react-aria/src/toggle/useToggle.ts:119-184
test("X-003 fires the Root's press callbacks for a press on the Content and on the Label", async () => {
  const app = await openCase("press");

  await app.press("role:switch[Enable notifications]");
  expect(callsOf(app, "onPressStart")).toHaveLength(1);
  expect(callsOf(app, "onPressEnd")).toHaveLength(1);
  expect(callsOf(app, "onPress")).toHaveLength(1);
  expect(callsOf(app, "onPressUp")).toHaveLength(1);
  expect(callsOf(app, "onClick")).toHaveLength(1);
  expect(callsOf(app, "onPressChange")).toEqual([[true], [false]]);

  await app.press("text:Enable notifications");
  expect(callsOf(app, "onPressStart")).toHaveLength(2);
  expect(callsOf(app, "onPressEnd")).toHaveLength(2);
  expect(callsOf(app, "onPress")).toHaveLength(2);
  expect(callsOf(app, "onPressUp")).toHaveLength(2);
  expect(callsOf(app, "onClick")).toHaveLength(2);
  expect(callsOf(app, "onPressChange")).toEqual([
    [true],
    [false],
    [true],
    [false],
  ]);
});

// D17 (port sheet §1: a Root render prop is called once; accessors drive what it returned)
test("X-004 calls a Root render prop once across a toggle", async () => {
  const app = await openCase("render-count");
  const control = "role:switch[Enable notifications]";

  expect(callsOf(app, "render")).toHaveLength(1);

  await app.press(control);
  expect(app.shows("text:On")).toBe(true);
  expect(callsOf(app, "render")).toHaveLength(1);
});

// react-aria/src/toggle/useToggle.ts:136-187
test("X-006 a read-only switch fires no press callbacks and commits no validation", async () => {
  const app = await openCase("readonly-validate");
  const control = "role:switch[Enable notifications]";
  const error = "text:Selected is not allowed";

  expect(app.shows(error)).toBe(false);

  await app.press(control);
  expect(app.shows(error)).toBe(false);
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(callsOf(app, "onPress")).toHaveLength(0);

  await app.press("text:Enable notifications");
  expect(app.shows(error)).toBe(false);
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(callsOf(app, "onPress")).toHaveLength(0);
  expect(callsOf(app, "onPressStart")).toHaveLength(0);
  expect(callsOf(app, "onPressEnd")).toHaveLength(0);
  expect(callsOf(app, "onPressChange")).toHaveLength(0);
  expect(callsOf(app, "onPressUp")).toHaveLength(0);
  expect(callsOf(app, "onClick")).toHaveLength(0);
});

// react-aria/src/toggle/useToggle.ts:174-184, react-aria/src/form/useFormValidation.ts:91-93
test("X-008 commits validation against the value still in effect when the parent ignores it", async () => {
  const app = await openCase("controlled-validation");
  const control = "role:switch[Enable notifications]";
  const error = "text:Selected is not allowed";

  expect(app.shows("text:Off")).toBe(true);
  expect(app.shows(error)).toBe(false);

  const before = callsOf(app, "validate").length;

  await app.press(control);

  expect(callsOf(app, "onChange")).toEqual([[true]]);
  expect(app.shows("text:Off")).toBe(true);

  const commits = callsOf(app, "validate");

  // The press committed validation against isSelected, which the ignoring
  // parent left false, so the validate that failed for true must not report.
  expect(commits.length).toBeGreaterThan(before);
  expect(commits[commits.length - 1][0]).toBe(false);
  expect(app.shows(error)).toBe(false);
});

// Ref forwarding regression: this scenario passes no ref to any Switch part
// (Control, Icon, Thumb). A plain `ref={local.ref}` with an undefined value is
// a ref store to NSH, which throws at mount on the web target and renders an
// empty page. The callback refs keep the switch and its label on screen.
test("X-009 renders a ref-less Switch on a real engine", async () => {
  const app = await openScenario("switch/basic");

  expect(app.shows("role:switch[Enable notifications]")).toBe(true);
  expect(app.shows("label:Enable notifications")).toBe(true);
});
