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
// field opens on focus, Tab hands off to the second (only one listbox on screen
// once the first has exited), ArrowDown + Enter select, focus stays in the
// second input, ArrowDown + Escape close, Tab reaches Submit. The
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
  expect(combo.endsOn(app, "secondInputFocus")).toBe(true);

  await app.keyboard.press("arrowdown");
  await app.clock!.runFor(20);
  await app.keyboard.press("enter");
  await settle(app);

  expect(callsOf(app, "change")).toEqual([["cat"]]);
  expect(combo.endsOn(app, "secondInputFocus")).toBe(true);
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
