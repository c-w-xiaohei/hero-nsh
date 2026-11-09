import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as select from "../../testers/select";

/*
 * Kobalte 0.13.14 Select regressions that a pointer can drive on every target,
 * ported to HeroUI's API and to NSH's view model, per port sheet 4b (T-029,
 * T-048, T-053, T-054, T-057, T-058, T-082).
 *
 * The option-mapping rows T-030 … T-037 and the hidden `<select>` / `<input>`
 * rows T-079 … T-081, T-084, T-085 are deleted in the sheet: Kobalte's
 * `options` + `optionValue` API and its form elements have no HeroUI
 * counterpart here. T-055 / T-056 (aria-labelledby) are deleted too: NSH has no
 * id resolution.
 *
 * Everything else in Kobalte's file lives in select.kobalte.web.test.tsx: it
 * starts with Tab or reads where focus went, and NSH 0.4.0's Win32 host cannot
 * move keyboard focus to a view (approved difference, port sheet section 8).
 */

function openCase(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../select.fixtures.tsx", {
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

// kobalte/packages/core/src/select/select.test.tsx:43
// Partial port (port sheet T-029): the visible Label and the placeholder are
// kept, and so is the trigger being a button named by the Label. The root
// element type, the hidden textbox and `aria-haspopup` are dropped (no DOM
// type, no hidden select, no attribute query).
test("T-029 renders the label, the placeholder and a named trigger", async () => {
  const app = await openCase("items");

  expect(app.shows("text:Label")).toBe(true);
  expect(app.shows("text:Placeholder")).toBe(true);
  expect(app.shows("role:button[Label]")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:1516
// Partial port (port sheet T-048): the two aria assertions are dropped. The
// press outside the popover closes it and reports `false`.
test("T-048 closes on a press outside the popover", async () => {
  const app = await openCase("items-outside");

  await select.open(app);
  expect(select.getListbox(app)).toBe(true);

  await app.press("id:outside");
  await settle(app);

  expect(select.getListbox(app)).toBe(false);

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toHaveLength(1);
});

// kobalte/packages/core/src/select/select.test.tsx:1811
// Partial port (port sheet T-053): the visible name reaches the trigger and the
// placeholder is shown. Opened, the listbox carries the same name through the
// popover's container label. The two `id` assertions and `aria-labelledby` are
// dropped.
test("T-053 supports labeling with a visible label", async () => {
  const app = await openCase("items");

  expect(app.shows("role:button[Label]")).toBe(true);
  expect(app.shows("text:Placeholder")).toBe(true);

  await select.open(app);

  expect(app.shows("role:listbox[Label]")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:1868
// Partial port (port sheet T-054): `aria-label` on the root becomes the
// trigger's accessible name. The `id` and `aria-labelledby` assertions have no
// channel.
test("T-054 supports labeling via aria-label", async () => {
  const app = await openCase("items-aria-label");

  expect(app.shows("role:button[foo]")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2027
// Partial port (port sheet T-057): the Description text is visible. The `id`
// and `aria-describedby` assertions are dropped; the hint half is on the
// Windows screen-reader checklist.
test("T-057 supports description", async () => {
  const app = await openCase("items-description");

  expect(app.shows("text:Description")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:2064
// Partial port (port sheet T-058): the error message appears while invalid. The
// `id` and `aria-describedby` assertions are dropped.
test("T-058 supports error message", async () => {
  const app = await openCase("items-invalid");

  expect(app.shows("text:ErrorMessage")).toBe(true);
});

// kobalte/packages/core/src/select/select.test.tsx:3965
// Partial port (port sheet T-082): the press is refused, the list never shows
// and `onOpenChange` is not called. `aria-expanded` has no channel.
test("T-082 does not open on a press when disabled", async () => {
  const app = await openCase("items-disabled");

  await expect(app.press(select.SELECT_TRIGGER)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  await settle(app);

  expect(select.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange")).toHaveLength(0);
});
