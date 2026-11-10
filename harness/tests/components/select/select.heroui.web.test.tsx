import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as select from "../../testers/select";

/*
 * HeroUI 3.2.7 Select regressions that need keyboard focus or focus
 * restoration, per port sheet 4b (T-003, T-014 … T-018, T-021 … T-025, T-027,
 * T-028). They run as the web platform and in the `.web` target.
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). Every case here starts with Tab on the
 * trigger or reads where focus ended, so a real Windows window cannot drive it
 * (approved difference "Windows keyboard focus and activation", port sheet
 * section 8). Nothing is hidden on macOS or the web, which both move focus.
 *
 * Focus is read through the fixture's onFocus / onBlur probes (there is no
 * activeElement query) and highlight through the row's `*` marker.
 */

function openCase(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../select.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

/** Runs past the 100 ms exit hold. */
function settle(app: App): Promise<void> {
  return app.clock!.runFor(120);
}

// heroui/packages/react/tests/components/select/select.test.tsx:69
// Ported (port sheet T-003). The RAC tester's `toggleOptionSelection` walks the
// options with the arrow keys; opening with Enter leaves the first row focused
// (the same behavior Kobalte's T-041 pins), so two ArrowDowns reach Texas.
test("T-003 supports open and select via keyboard", async () => {
  const app = await openCase("states-plain");

  await app.keyboard.press("tab");
  await app.keyboard.press("enter");

  expect(select.getListbox(app)).toBe(true);
  expect(select.isFocusedOption(app, "Florida")).toBe(true);

  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowdown");
  await app.keyboard.press("enter");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("texas");
  expect(select.getListbox(app)).toBe(false);
  expect(select.triggerShows(app, "Texas")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:249
// Ported (port sheet T-014): the Backspace shortcut exists only because a
// ClearButton is composed; it clears, reports null, returns to the placeholder
// and never opens the list.
test("T-014 clears the selection with Backspace", async () => {
  const app = await openCase("states-clear");

  await app.keyboard.press("tab");
  await app.keyboard.press("backspace");
  await settle(app);

  expect(callsOf(app, "clear")).toHaveLength(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBeNull();
  expect(select.triggerShows(app, "Select one")).toBe(true);
  expect(select.getListbox(app)).toBe(false);
});

// heroui/packages/react/tests/components/select/select.test.tsx:270
// Ported (port sheet T-015): Delete is the second clear key.
test("T-015 clears the selection with Delete", async () => {
  const app = await openCase("states-clear");

  await app.keyboard.press("tab");
  await app.keyboard.press("delete");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBeNull();
  expect(select.triggerShows(app, "Select one")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:281
// Ported (port sheet T-016): no ClearButton is composed, so the shortcut must
// stay off even though the field holds a selection.
test("T-016 does not clear when no clear button is composed", async () => {
  const app = await openCase("states-plain-selected");

  await app.keyboard.press("tab");
  await app.keyboard.press("backspace");

  expect(callsOf(app, "selectionChange")).toHaveLength(0);
  expect(select.triggerShows(app, "California")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:292
// Ported (port sheet T-017): the shortcut must not swallow the list keys;
// ArrowDown opens the list and records no selection.
test("T-017 leaves other keys to the select", async () => {
  const app = await openCase("states-clear");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");

  expect(callsOf(app, "selectionChange")).toHaveLength(0);
  expect(select.getListbox(app)).toBe(true);
});

// heroui/packages/react/tests/components/select/select.browser.test.tsx:40
// Rewritten port (port sheet T-018): the upstream case is entirely
// `expect.element` (census 0). The rewrite presses the trigger, reads the three
// rows, presses Escape and reads both the closed list and the trigger's focus
// probe, which stands in for `toHaveFocus`.
test("T-018 opens the listbox, shows the options and restores focus after Escape", async () => {
  const app = await openCase("states");

  await app.press(select.SELECT_TRIGGER);

  expect(select.getListbox(app)).toBe(true);
  expect(app.shows("role:option[Florida]")).toBe(true);
  expect(app.shows("role:option[California]")).toBe(true);
  expect(app.shows("role:option[Texas]")).toBe(true);

  await app.keyboard.press("escape");
  await settle(app);

  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
});

// heroui/packages/react/tests/components/select/select.browser.test.tsx:98
// Partial port (port sheet T-021): the two dropped assertions are
// `data-focus-visible` (no attribute channel) and `box-shadow: none` (a paint
// result). A mouse open must land the highlight on the selected row; if the
// modality tracking is wrong the marker is missing or doubled.
test("T-021 opens with the mouse and highlights the selected option", async () => {
  const app = await openCase("states-default");

  await app.press(select.SELECT_TRIGGER);

  expect(select.isFocusedOption(app, "California")).toBe(true);
  expect(app.count(select.FOCUS_MARKERS)).toBe(1);
});

// heroui/packages/react/tests/components/select/select.browser.test.tsx:117
// Partial port (port sheet T-022): the focus-ring assertions are dropped (no
// attribute or box-shadow query). Kept: a mouse open and Escape, the focus
// probe after the close, then a keyboard reopen that highlights California.
test("T-022 reopens with the keyboard and highlights the selected option", async () => {
  const app = await openCase("states-default");

  await app.press(select.SELECT_TRIGGER);
  await app.keyboard.press("escape");
  await settle(app);

  expect(select.endsOnTrigger(app)).toBe(true);

  await app.keyboard.press("enter");

  expect(select.getListbox(app)).toBe(true);
  expect(select.isFocusedOption(app, "California")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.browser.test.tsx:146
// Partial port (port sheet T-023): the two `ringOf(...)` box-shadow assertions
// are dropped. Both highlight moves are kept, one marker at a time.
test("T-023 moves the highlight with the arrow keys", async () => {
  const app = await openCase("states");

  await app.press(select.SELECT_TRIGGER);

  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "Florida")).toBe(true);
  expect(app.count(select.FOCUS_MARKERS)).toBe(1);

  await app.keyboard.press("arrowdown");

  expect(select.isFocusedOption(app, "California")).toBe(true);
  expect(app.count(select.FOCUS_MARKERS)).toBe(1);
});

// heroui/packages/react/tests/components/select/select.browser.test.tsx:177
// Partial port (port sheet T-024): `data-focus-visible` and the trigger ring
// equality are dropped. A mouse selection closes the list and the trigger ends
// up focused.
test("T-024 supports selecting with the mouse and focuses the trigger", async () => {
  const app = await openCase("states-default");

  await app.press(select.SELECT_TRIGGER);
  await app.press("role:option[Texas]");
  await settle(app);

  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Texas")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.browser.test.tsx:200
// Partial port (port sheet T-025): the `data-focus-visible` and ring-change
// assertions are dropped. A keyboard selection closes the list and returns the
// focus to the trigger.
test("T-025 supports selecting with the keyboard and focuses the trigger", async () => {
  const app = await openCase("states-default");

  await app.press(select.SELECT_TRIGGER);
  await app.keyboard.press("arrowdown");
  await app.keyboard.press("enter");
  await settle(app);

  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
  expect(select.triggerShows(app, "Texas")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.browser.test.tsx:236
// Rewritten port (port sheet T-027): the upstream case is four
// `expect.element` calls (census 0) of which three survive as text, presence
// and the focus probe.
test("T-027 clears on click, leaves the listbox closed and focuses the trigger", async () => {
  const app = await openCase("states-clear");

  expect(select.triggerShows(app, "California")).toBe(true);

  await app.press(select.getClearButton(app));
  await settle(app);

  expect(select.triggerShows(app, "Select one")).toBe(true);
  expect(select.getListbox(app)).toBe(false);
  expect(select.endsOnTrigger(app)).toBe(true);
});

// heroui/packages/react/tests/components/select/select.browser.test.tsx:250
// Rewritten port (port sheet T-028): three `expect.element` calls (census 0).
// Tab to the trigger, open and Escape, then the Backspace shortcut.
test("T-028 clears with the Backspace shortcut", async () => {
  const app = await openCase("states-clear");

  await app.keyboard.press("tab");
  await app.keyboard.press("enter");
  await app.keyboard.press("escape");
  await settle(app);

  expect(select.triggerShows(app, "California")).toBe(true);

  await app.keyboard.press("backspace");
  await settle(app);

  expect(select.triggerShows(app, "Select one")).toBe(true);
  expect(select.getListbox(app)).toBe(false);
});
