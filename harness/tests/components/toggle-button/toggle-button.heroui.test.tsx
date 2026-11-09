import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ToggleButton / ToggleButtonGroup, per port
 * sheet 4b (T-001, T-003 … T-007, T-011 … T-013, T-015 … T-023).
 *
 * Deleted there: T-002 and T-014 assert BEM class names and `data-slot`, which
 * D18 drops. Every case keeps its upstream file:line and title, and the
 * assertions follow SOP 3.2: `aria-pressed` / `aria-checked` / `data-selected`
 * are not readable through nsh/test, so each one's visible result is read from
 * a render-prop text instead (the `.split` scenarios print on / off), never
 * dropped silently. T-015 is a partial port and says what stays unread.
 *
 * Every case but the press-state one runs on a pointer-capable platform, so
 * this file needs no `.web.` or `.headless.` suffix; T-008 holds a press with
 * `dragAndHold` / `drop`, which only the headless engine and Linux run, and
 * lives in toggle-button.heroui.headless.test.tsx. The keyboard cases T-009 and
 * T-010 move focus with Tab, which a real Windows window does not do, and live
 * in toggle-button.heroui.web.test.tsx.
 *
 * Every case waits for the first frame after `open` before it reads: on
 * `--target web` `open` can resolve before the app's first commit, and a read
 * straight after it sees an empty screen. Text and role cases wait on what they
 * read first, the layout cases on the probes they measure. The waits only delay
 * the reads — every assertion still runs and can still fail.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

function layoutCalls(app: App): LayoutCall[] {
  return callsOf(app, "layout").map((args) => args[0] as LayoutCall);
}

/** Waits until the app's layout pass has reached `names`: an `open` can resolve before the first commit. */
async function firstFrame(app: App, ...names: string[]): Promise<void> {
  await app.waitUntil(() => names.every((name) => layoutCalls(app).some((call) => call.name === name)));
}

function frame(app: App, name: string): LayoutCall {
  const found = layoutCalls(app).find((call) => call.name === name);

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

/* -------------------------------------------------------------------------------------------------
 * ToggleButton
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:27
test("T-001 renders with role and accessible name", async () => {
  const app = await openScenario("toggle-button/basic");
  await app.waitFor("role:button[Bold]");

  expect(app.shows("role:button[Bold]")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:42
// Rewritten port (port sheet T-003): NSH has no `data-*` passthrough (D18); the
// test identity is `testID`, which the fixture gives to the root.
test("T-003 supports data attribute passthrough", async () => {
  const app = await openScenario("toggle-button/basic");
  await app.waitFor("id:toggle");

  expect(app.shows("id:toggle")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:48
// Rewritten port (port sheet T-004): `aria-pressed` and `data-selected` have no
// NSH channel; the render prop prints the selection, and onChange is probed.
test("T-004 supports toggling selected state on click", async () => {
  const app = await openScenario("toggle-button/render-props.split");
  await app.waitFor("text:Bold off");

  expect(app.shows("text:Bold off")).toBe(true);

  await app.press("role:button[Bold off]");
  expect(app.shows("text:Bold on")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true]]);

  await app.press("role:button[Bold on]");
  expect(app.shows("text:Bold off")).toBe(true);
  expect(callsOf(app, "onChange")).toEqual([[true], [false]]);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:64
// Rewritten port (port sheet T-005): the selected state is printed by the
// render prop, since `aria-pressed` is not readable.
test("T-005 supports uncontrolled defaultSelected", async () => {
  const app = await openScenario("toggle-button/default-selected.split");
  await app.waitFor("text:Button on");

  expect(app.shows("text:Button on")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:70
// Rewritten port (port sheet T-006): the scenario holds `isSelected` in a
// signal and a "Set selected" button writes it, standing in for rerender().
test("T-006 supports controlled isSelected", async () => {
  const app = await openScenario("toggle-button/controlled.split");
  await app.waitFor("text:Bold off");

  expect(app.shows("text:Bold off")).toBe(true);

  await app.press("role:button[Bold off]");
  expect(callsOf(app, "onChange")).toEqual([[true]]);
  // The parent ignored the change, so the button stays off.
  expect(app.shows("text:Bold off")).toBe(true);

  await app.press("text:Set selected");
  expect(app.shows("text:Bold on")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:93
// Rewritten port (port sheet T-007): `data-hovered` is not readable; the hover
// callbacks it guards are probed instead.
test("T-007 supports hover state", async () => {
  const app = await openScenario("toggle-button/hover");
  await app.waitFor("role:button[Bold]");

  await app.hover("role:button[Bold]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(1);

  await app.hover("id:away");
  expect(callsOf(app, "onHoverEnd")).toHaveLength(1);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:142
// Ported (port sheet T-011). `data-disabled` is not projected, so it is not
// asserted on its own; the disabled state, the blocked toggle and the
// unchanged text are.
test("T-011 supports disabled state and blocks toggle", async () => {
  const app = await openScenario("toggle-button/disabled.split");
  const control = "role:button[Bold off]";
  await app.waitFor(control);

  expect(app.enabled(control)).toBe(false);

  await expect(app.press(control)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onChange")).toHaveLength(0);
  expect(app.shows("text:Bold off")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:160
// Rewritten port (port sheet T-012): a disabled button reports no hover.
test("T-012 exposes no hover state when disabled", async () => {
  const app = await openScenario("toggle-button/disabled.split");
  await app.waitFor("role:button[Bold off]");

  await app.hover("role:button[Bold off]");

  expect(callsOf(app, "onHoverStart")).toHaveLength(0);
});

// heroui/packages/react/tests/components/toggle-button/toggle-button.test.tsx:168
test("T-013 supports children as a render function receiving selection state", async () => {
  const app = await openScenario("toggle-button/render-props.split");
  await app.waitFor("role:button[Bold off]");

  expect(app.shows("role:button[Bold off]")).toBe(true);

  await app.press("role:button[Bold off]");

  expect(app.shows("role:button[Bold on]")).toBe(true);
});

/* -------------------------------------------------------------------------------------------------
 * ToggleButtonGroup
 * -----------------------------------------------------------------------------------------------*/

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:26
// Partial port (port sheet T-015): existence is read through `testID` and
// `count`; `aria-hidden` has no nsh/test query and is listed for the Windows
// screen-reader check (`accessibilityElementsHidden`).
test("T-015 renders a Separator with data-slot", async () => {
  const app = await openScenario("toggle-button-group/separators");
  await app.waitFor("id:group-separator");

  expect(app.shows("id:group-separator")).toBe(true);
  expect(app.count("id:group-separator")).toBe(1);
});

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:43
// Rewritten port (port sheet T-016): class names are not readable, so the
// modifiers are read as the layout they produce — a vertical group stacks its
// two buttons, a full-width group gives each `flex-1` share, wider than the
// same two buttons attached (w-fit).
test("T-016 exposes orientation and full-width BEM modifiers", async () => {
  const vertical = await openScenario("toggle-button-group/vertical");
  await firstFrame(vertical, "vertical-0", "vertical-1");

  expect(frame(vertical, "vertical-1").y).toBeGreaterThan(frame(vertical, "vertical-0").y);

  const full = await openScenario("toggle-button-group/full-width");
  await firstFrame(full, "full-width-0", "full-width-1");
  const attached = await openScenario("toggle-button-group/attached");
  await firstFrame(attached, "attached-0");
  const first = frame(full, "full-width-0");
  const second = frame(full, "full-width-1");

  expect(Math.abs(first.width - second.width)).toBeLessThan(0.6);
  expect(first.width).toBeGreaterThan(frame(attached, "attached-0").width);
});

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:61
// Rewritten port (port sheet T-017): `gap-1` is measured as the space between
// the two buttons — 4 points detached, 0 attached.
test("T-017 exposes detached BEM modifier", async () => {
  const detached = await openScenario("toggle-button-group/detached");
  await firstFrame(detached, "detached-0", "detached-1");
  const d0 = frame(detached, "detached-0");
  const d1 = frame(detached, "detached-1");

  expect(Math.abs(d1.x - (d0.x + d0.width) - 4)).toBeLessThan(0.6);

  const attached = await openScenario("toggle-button-group/attached");
  await firstFrame(attached, "attached-0", "attached-1");
  const a0 = frame(attached, "attached-0");
  const a1 = frame(attached, "attached-1");

  expect(Math.abs(a1.x - (a0.x + a0.width))).toBeLessThan(0.6);
});

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:74
// Rewritten port (port sheet T-018): the toolbar role stays readable; the
// pressed state is printed by each member's render prop.
test("T-018 exposes a toolbar role with pressable toggle buttons", async () => {
  const app = await openScenario("toggle-button-group/multiple.split");
  await app.waitFor("role:toolbar");

  expect(app.shows("role:toolbar")).toBe(true);
  expect(app.shows("text:Bold off")).toBe(true);

  await app.press("role:button[Bold off]");
  expect(app.shows("text:Bold on")).toBe(true);
  expect(callsOf(app, "onSelectionChange")).toEqual([[["bold"]]]);

  await app.press("role:button[Italic off]");
  expect(callsOf(app, "onSelectionChange")).toEqual([[["bold"]], [["bold", "italic"]]]);
});

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:99
// Rewritten port (port sheet T-019): both pressed states are read as text.
test("T-019 supports defaultSelectedKeys", async () => {
  const app = await openScenario("toggle-button-group/multiple-default.split");
  await app.waitFor("text:Bold on");

  expect(app.shows("text:Bold on")).toBe(true);
  expect(app.shows("text:Italic off")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:113
// Rewritten port (port sheet T-020): `aria-checked` has no NSH channel, so the
// radio state is printed; the radiogroup / radio roles stay readable.
test("T-020 exposes a radiogroup role with radio-style buttons", async () => {
  const app = await openScenario("toggle-button-group/single.split");
  await app.waitFor("role:radiogroup");

  expect(app.shows("role:radiogroup")).toBe(true);
  expect(app.shows("role:radio[Left off]")).toBe(true);
  expect(app.shows("text:Left off")).toBe(true);

  await app.press("role:radio[Left off]");
  expect(app.shows("text:Left on")).toBe(true);
  expect(callsOf(app, "onSelectionChange")).toEqual([[["left"]]]);

  await app.press("role:radio[Center off]");
  expect(app.shows("text:Center on")).toBe(true);
  expect(app.shows("text:Left off")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:139
// Rewritten port (port sheet T-021): pressing the selected radio must not clear
// it, read through its printed text.
test("T-021 supports disallowEmptySelection", async () => {
  const app = await openScenario("toggle-button-group/single-disallow.split");
  await app.waitFor("role:radio[Left on]");

  await app.press("role:radio[Left on]");

  expect(app.shows("text:Left on")).toBe(true);
});

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:159
test("T-022 supports group disabled state on every button", async () => {
  const app = await openScenario("toggle-button-group/disabled");
  await app.waitFor("role:button[Bold]");

  expect(app.enabled("role:button[Bold]")).toBe(false);
  expect(app.enabled("role:button[Italic]")).toBe(false);
});

// heroui/packages/react/tests/components/toggle-button-group/toggle-button-group.test.tsx:171
// Rewritten port (port sheet T-023): the `toggle-button--lg` class is not
// readable; `text-base` is, and only lg raises the member's text to 16.
test("T-023 exposes inherited size on child ToggleButtons", async () => {
  const app = await openScenario("toggle-button-group/sizes");
  await app.waitFor("text:Bold");

  expect(app.spanStyle("text:Bold").fontSize).toBe(16);
});
