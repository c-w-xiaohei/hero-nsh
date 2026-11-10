import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as combo from "../../testers/combo-box";

/*
 * Kobalte 0.13.14 ComboBox regressions that a pointer can drive on every
 * target, ported to HeroUI's API and to NSH's view model, per port sheet 4b
 * (T-013, T-030, T-034, T-037, T-038, T-055, T-059).
 *
 * Kobalte's `options` + `optionValue` / `optionTextValue` / `optionDisabled` /
 * `optionLabel` mapping rows (T-014 … T-021), the hidden-select rows (T-052 …
 * T-054, T-057, T-058) and the controlled `open` rows (T-027, T-028, T-032,
 * T-033, T-035, T-036) are deletions in the port sheet; nothing here hides a
 * target.
 *
 * Kobalte asserts `document.activeElement`: here the fixture's `*` marker names
 * the highlighted row and the input's `onFocus` probe answers "where focus
 * ended". The aria assertions (`aria-expanded`, `aria-controls`, `aria-selected`,
 * `aria-disabled`, `aria-describedby`) have no channel and are named in the
 * sheet's 部分移植 rows.
 */

function openCase(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../combo-box.fixtures.tsx", {
    platform: "windows",
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

// kobalte/packages/core/src/combobox/combobox.test.tsx:47
// Partial port (port sheet T-013): Label text, the input's accessible name (the
// registered Label) and the placeholder are kept. The hidden select / hidden
// textbox, their disabled state and `aria-haspopup` are dropped: NSH has no
// hidden form elements.
test("T-013 renders the label, the named input and the placeholder", async () => {
  const app = await openCase("label-description");

  expect(app.shows("text:Label")).toBe(true);
  expect(app.value("role:combobox[Label]")).not.toBeNull();
  expect(app.shows("text:Placeholder")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1423
// Partial port (port sheet T-030): a press outside closes the list, reports
// `false` and resets the typed text (there is no selection, so the reset text is
// empty). The aria-expanded / aria-controls assertions are dropped.
test("T-030 closes on a press outside and resets the input text", async () => {
  const app = await openCase("outside");

  await app.press(combo.COMBO_BOX);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.type(combo.COMBO_BOX, "pa");

  expect(combo.inputValue(app)).toBe("pa");
  expect(app.shows("role:option[Panda]")).toBe(true);

  await app.press("id:outside");
  await settle(app);

  const changes = callsOf(app, "openChange");

  expect(combo.getListbox(app)).toBe(false);
  expect(changes.filter((args) => args[0] === false)).toHaveLength(1);
  expect(combo.inputValue(app)).toBe("");
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1683
// Partial port (port sheet T-034): the visible label names the input and the
// placeholder is visible. The Label / input `id`s and the list's
// `aria-labelledby` are dropped: no id resolution.
test("T-034 labels the field with a visible label", async () => {
  const app = await openCase("label-description");

  expect(app.value("role:combobox[Label]")).not.toBeNull();
  expect(app.shows("text:Placeholder")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1836
// Partial port (port sheet T-037): the Description text is visible. Its `id` and
// `aria-describedby` are dropped; the accessibilityHint half is on the
// screen-reader manual checklist.
test("T-037 supports description", async () => {
  const app = await openCase("label-description");

  expect(app.shows("text:Description")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:1873
// Partial port (port sheet T-038): the ErrorMessage text appears while invalid.
// Its `id` and `aria-describedby` are dropped.
test("T-038 supports an error message", async () => {
  const app = await openCase("error-message");

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3285
// Partial port (port sheet T-055): the trigger press is refused, the list never
// shows and the open callback is not called. `aria-expanded="false"` is dropped.
test("T-055 does not open on a press when disabled", async () => {
  const app = await openCase("disabled");

  await expect(app.press(combo.COMBO_BOX_TRIGGER)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange")).toHaveLength(0);
});

// kobalte/packages/core/src/combobox/combobox.test.tsx:3503
// Partial port (port sheet T-059): typing `ap` leaves Apple / Grapes /
// Pineapple through the case-insensitive `contains` filter; pressing Grapes
// reports the key once and moves it into the input. The "the input blurs
// mid-press but keeps `ap`" assertion is dropped: a pointer press does not blur
// the input in NSH, so the text right before the press stands for the same
// invariant.
test("T-059 selects the clicked option after filtering", async () => {
  const app = await openCase("filter-contains");

  await app.press(combo.COMBO_BOX);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.type(combo.COMBO_BOX, "ap");

  expect(combo.inputValue(app)).toBe("ap");
  expect(app.shows("role:option[Apple]")).toBe(true);
  expect(app.shows("role:option[Grapes]")).toBe(true);
  expect(app.shows("role:option[Pineapple]")).toBe(true);
  expect(app.shows("role:option[Banana]")).toBe(false);
  expect(app.shows("role:option[Blueberry]")).toBe(false);

  await combo.toggleOptionSelection(app, "Grapes");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("Grapes");
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Grapes");
});
