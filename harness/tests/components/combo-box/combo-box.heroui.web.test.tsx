import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as combo from "../../testers/combo-box";

/*
 * HeroUI 3.2.7 browser regressions for ComboBox that need focus movement, per
 * port sheet 4b (T-010 … T-012).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input, Tab does not walk the fields and Return / Space do not activate a
 * focused view (`crates/nsh-platform-windows/src/input.rs:997-1053`,
 * `mount.rs:440`; `crates/nsh-core/src/props.rs:365`). Every case here moves
 * focus with Tab or depends on where focus ended, so a real Windows window
 * cannot drive it (approved difference, port sheet section 8).
 *
 * T-007, T-008 and T-009 are screenshot rows: animation names, the animated
 * property list and indicator geometry have no query in `nsh test`. They stay in
 * the port sheet as comparisons.
 */

function openCase(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../combo-box.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

/** Runs past the 100 ms exit hold. */
async function settle(app: App): Promise<void> {
  await app.clock!.runFor(120);
}

// heroui/packages/react/tests/components/combo-box/combo-box.browser.test.tsx:73
// Partial port (port sheet T-010): the whole handoff chain is kept — the first
// field opens on focus, Tab records the first input blur and second input focus
// callbacks (only one listbox remains once the first has exited), ArrowDown +
// Enter select without a second-input blur callback, ArrowDown + Escape close,
// and Tab records Submit focus. These callback probes do not query active DOM
// focus. The
// `aria-expanded` / `aria-activedescendant` / `aria-hidden` assertions are
// dropped: no attribute channel.
test("T-010 preserves sibling Tab handoff, selection and Escape", async () => {
  const app = await openCase("tab-handoff");

  await app.keyboard.press("tab");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  expect(app.count(combo.COMBO_BOX_LISTBOX)).toBe(1);

  await app.keyboard.press("tab");
  await settle(app);

  expect(app.count(combo.COMBO_BOX_LISTBOX)).toBe(1);
  expect(callsOf(app, "firstInputBlur")).toHaveLength(1);
  expect(callsOf(app, "secondInputFocus")).toHaveLength(1);

  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);
  await app.keyboard.press("enter");
  await settle(app);

  expect(callsOf(app, "change")).toEqual([["cat"]]);
  expect(callsOf(app, "secondInputBlur")).toHaveLength(0);
  expect(combo.getListbox(app)).toBe(false);

  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);
  await app.keyboard.press("escape");
  await settle(app);

  expect(combo.getListbox(app)).toBe(false);

  await app.keyboard.press("tab");
  await settle(app);

  expect(combo.endsOn(app, "submitFocus")).toBe(true);
});

// heroui/packages/react/tests/components/combo-box/combo-box.browser.test.tsx:112
// Partial port (port sheet T-011): the readable half is the layering — Escape
// closes only the combobox, the dialog stays, Done closes the dialog. The two
// `closest('[aria-hidden], [inert]')` assertions are dropped: no attribute
// channel, the screen-reader isolation is on the Windows manual checklist. The
// nsh/base Dialog stands in for HeroUI's Modal, which is not in this batch.
test("T-011 preserves an enclosing modal's isolation while the combobox is open", async () => {
  const app = await openCase("modal");

  await app.press("role:button[Open form]");
  await app.waitFor("text:Choose an animal");

  await app.press(combo.COMBO_BOX);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  await app.keyboard.press("escape");
  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(app.shows("text:Choose an animal")).toBe(true);

  await app.press("role:button[Done]");
  await settle(app);

  expect(app.shows("text:Choose an animal")).toBe(false);
});

// heroui/packages/react/tests/components/combo-box/combo-box.browser.test.tsx:144
// Partial port (port sheet T-012): forty rows open, then thirty ArrowDowns; the
// highlight moves forward on every step, focus stays in the input, and Tab
// leaves the field (closing the list) for Continue. The `aria-controls`
// assertion and `scrollTop > 0` are dropped: no channel; "the highlighted row
// stays visible" is the screenshot half.
test("T-012 moves the controlled list's highlight without adding a popup Tab stop", async () => {
  const app = await openCase("items-40");

  await app.press(combo.COMBO_BOX_TRIGGER);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.clock!.runFor(20);

  expect(combo.endsOnInput(app)).toBe(true);
  expect(combo.isFocusedOption(app, "Animal 0")).toBe(true);

  for (let index = 0; index < 30; index++) {
    await app.keyboard.press("arrowdown");
    await app.clock!.runFor(20);

    expect(combo.focusedOptions(app)).toBe(1);
    expect(combo.isFocusedOption(app, `Animal ${index + 1}`)).toBe(true);
  }

  expect(combo.endsOnInput(app)).toBe(true);

  await app.keyboard.press("tab");
  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(combo.endsOn(app, "submitFocus")).toBe(true);
});

/*
 * Port regressions from the deep review of round 2. Each one is written to the
 * required React Aria behavior, not to the port's current one; they need
 * keyboard focus, so they live in this `.web.` file.
 */

// src/components/combo-box/combo-box-root.tsx:759-784 (review finding);
// upstream packages/react-stately/src/combobox/useComboBoxState.ts:328,338 with
// `menuTrigger === "focus"` sets `showAllItems`, so the focus open shows the
// whole collection, not just the selected row.
test("X-002 shows every option on a focus open and reports the focus source", async () => {
  const app = await openCase("default-key");

  await app.keyboard.press("tab");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.clock!.runFor(20);

  expect(callsOf(app, "openChange")).toEqual([[true, "focus"]]);
  expect(combo.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);
});

// src/components/combo-box/combo-box-root.tsx:376-378 (review finding);
// upstream packages/react-stately/src/combobox/useComboBoxState.ts:338,343: an
// ArrowDown / ArrowUp open names the action "manual", like the trigger press.
test("X-003 reports an ArrowDown open as manual", async () => {
  const app = await openCase("manual");

  await app.keyboard.press("tab");
  await app.keyboard.press("arrowdown");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.clock!.runFor(20);

  expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);
});

// src/components/combo-box/combo-box-root.tsx:396-426, 881-926; src/primitives/create-select-state/create-select-state.ts:188-194 (review finding): focusTarget must not synthesize duplicate focus/blur events when the input already owns focus.
test("X-012 keeps focus event counts unchanged when ArrowDown opens the list", async () => {
  const app = await openCase("manual", { platform: "web" });

  await app.keyboard.press("tab");
  await app.clock!.runFor(20);

  const before = {
    focus: callsOf(app, "inputFocus").length,
    blur: callsOf(app, "inputBlur").length,
    change: callsOf(app, "focusChange").length,
  };
  expect(before.focus).toBe(1);

  await app.keyboard.press("arrowdown");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.clock!.runFor(20);

  expect(callsOf(app, "inputFocus")).toHaveLength(before.focus);
  expect(callsOf(app, "inputBlur")).toHaveLength(before.blur);
  expect(callsOf(app, "focusChange")).toHaveLength(before.change);
});

// src/components/combo-box/combo-box-root.tsx:676-712 (review finding);
// upstream packages/react-stately/src/combobox/useComboBoxState.ts:466-478:
// clearing the input of a single field whose selection is not fully controlled
// clears the selection through the normal callback path.
test("X-007 clears a single selection when the input becomes empty", async () => {
  const app = await openCase("default-key");

  await app.type(combo.COMBO_BOX, "");
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  expect(combo.inputValue(app)).toBe("Cat");

  await app.keyboard.press("backspace");
  await app.keyboard.press("backspace");
  await app.keyboard.press("backspace");
  await app.clock!.runFor(20);

  expect(combo.inputValue(app)).toBe("");
  expect(callsOf(app, "change")).toEqual([[null]]);
  expect(callsOf(app, "selectionChange")).toEqual([[null]]);
  expect(combo.getListbox(app)).toBe(true);
  expect(combo.selectedOptions(app)).toBe(0);
});

// src/components/combo-box/combo-box-root.tsx:176 (review finding);
// upstream packages/react-aria/src/combobox/useComboBox.ts:68,174-186 passes the
// root's `shouldFocusWrap` to `useSelectableCollection`, so the highlight wraps
// at both ends.
test("X-008 wraps the highlight at both ends with shouldFocusWrap", async () => {
  const app = await openCase("wrap");

  await combo.open(app);
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "One")).toBe(true);

  await app.keyboard.press("arrowup");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "Three")).toBe(true);
  expect(combo.focusedOptions(app)).toBe(1);

  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);

  expect(combo.isFocusedOption(app, "One")).toBe(true);
  expect(combo.focusedOptions(app)).toBe(1);
});

// src/components/combo-box/combo-box-root.tsx:879-904 (review finding);
// upstream packages/react-aria/src/combobox/useComboBox.ts:316-324 binds the list
// keydown only when the field is neither read-only nor disabled; a read-only
// field's list never opens.
test("X-009 keeps a read-only field's list closed on the list keys", async () => {
  const app = await openCase("read-only");

  await app.keyboard.press("tab");
  await app.clock!.runFor(20);

  expect(combo.getListbox(app)).toBe(false);

  await app.keyboard.press("arrowdown");
  await app.keyboard.press("arrowup");
  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange")).toHaveLength(0);
});
