import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as combo from "../../testers/combo-box";

/*
 * HeroUI 3.2.7 unit regressions for ComboBox that a pointer can drive on every
 * target, per port sheet 4b (T-001 … T-006).
 *
 * T-007, T-008 and T-009 are browser rows: the animation-name / property-list
 * and indicator-geometry assertions have no query and are port sheet screenshot
 * rows, not tests. The keyboard and focus rows live in
 * combo-box.heroui.web.test.tsx: NSH 0.4.0's Win32 host gives keyboard focus
 * only to an Input, so Tab / focus handoff cannot run in a real Windows window
 * (approved difference, port sheet section 8).
 *
 * Every case opens a manual clock: closing keeps the list visible for the
 * 100 ms exit hold, so "the list is gone" is only true after the clock passes
 * it.
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
function settle(app: App): Promise<void> {
  return app.clock!.runFor(120);
}

// heroui/packages/react/tests/components/combo-box/combo-box.test.tsx:24
// Partial port (port sheet T-001): the root `data-slot` and the BEM class
// assertions are D18 deletions. The input and the trigger stay observable.
test("T-001 exposes the input and the trigger", async () => {
  const app = await openCase("log");

  expect(app.value(combo.COMBO_BOX)).not.toBeNull();
  expect(app.shows(combo.COMBO_BOX_TRIGGER)).toBe(true);
});

// heroui/packages/react/tests/components/combo-box/combo-box.test.tsx:35
// Partial port (port sheet T-002): the RAC ComboBox tester becomes the local
// tester; the `[data-slot="combo-box-popover"]` assertion is replaced by the
// listbox appearing, which is the same behavior.
test("T-002 opens, lists the options and selects through the ComboBox tester", async () => {
  const app = await openCase("log");

  expect(combo.getListbox(app)).toBe(false);

  await combo.open(app);

  expect(combo.getListbox(app)).toBe(true);
  expect(combo.getOptions(app)).toBe(3);
  expect(app.shows("role:option[Cat]")).toBe(true);
  expect(app.shows("role:option[Dog]")).toBe(true);
  expect(app.shows("role:option[Panda]")).toBe(true);

  await combo.toggleOptionSelection(app, "Dog");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("dog");
  expect(combo.getListbox(app)).toBe(false);
  expect(combo.inputValue(app)).toBe("Dog");
});

// heroui/packages/react/tests/components/combo-box/combo-box.test.tsx:57
// Ported (port sheet T-003): the text is both the display value and the filter,
// so both paths are covered.
test("T-003 supports filtering options while typing", async () => {
  const app = await openCase("log");

  await app.press(combo.COMBO_BOX);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.type(combo.COMBO_BOX, "pa");

  expect(app.shows("role:option[Panda]")).toBe(true);
  expect(app.shows("role:option[Cat]")).toBe(false);
  expect(app.shows("role:option[Dog]")).toBe(false);
  expect(combo.inputValue(app)).toBe("pa");
});

// heroui/packages/react/tests/components/combo-box/combo-box.test.tsx:71
// Ported (port sheet T-004): the input is disabled, the trigger press is refused
// by the host, the list never shows and no selection is recorded.
test("T-004 supports disabled state", async () => {
  const app = await openCase("disabled");

  expect(app.enabled(combo.COMBO_BOX)).toBe(false);

  await expect(app.press(combo.COMBO_BOX_TRIGGER)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(callsOf(app, "change")).toHaveLength(0);
});

// heroui/packages/react/tests/components/combo-box/combo-box.test.tsx:89
// Ported (port sheet T-005): `defaultValue` really reaches the selection and the
// input text reset.
test("T-005 renders the default selected value", async () => {
  const app = await openCase("default-key");

  expect(combo.inputValue(app)).toBe("Cat");
});

// heroui/packages/react/tests/components/combo-box/combo-box.test.tsx:95
// Partial port (port sheet T-006): `isInvalid` really reaches FieldError. The
// `[data-slot="field-error"]` and root `data-invalid` assertions have no channel
// (D18 / no attribute query); the rest of the invalid appearance (red label,
// hidden description, danger ring) is the `combo-box/invalid` screenshot scene.
test("T-006 renders FieldError when invalid", async () => {
  const app = await openCase("invalid");

  expect(app.shows("text:Please choose an animal")).toBe(true);
});

/*
 * Port regressions from the deep review of round 2. Each one is written to the
 * required React Aria behavior, not to the port's current one.
 */

// src/components/combo-box/combo-box-root.tsx:376-378 (review finding);
// upstream packages/react-stately/src/combobox/useComboBoxState.ts:309-316
// (`onOpenChange` carries `menuOpenTrigger.current` only while opening) and
// :338,343 (the trigger press opens with "manual", arrows included). Closing
// passes no source; the probe serialises that `undefined` as null.
test("X-001 reports the action that opened the list and drops the source on close", async () => {
  const app = await openCase("log");

  await app.press(combo.COMBO_BOX_TRIGGER);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.clock!.runFor(20);

  expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);

  await app.press(combo.COMBO_BOX_TRIGGER);
  await settle(app);

  expect(callsOf(app, "openChange")).toEqual([
    [true, "manual"],
    [false, null],
  ]);
});

// src/components/combo-box/combo-box-root.tsx:759-784 (review finding);
// upstream packages/react-stately/src/combobox/useComboBoxState.ts:328,338,350-374
// (a collection with nothing displayable is not opened unless
// allowsEmptyCollection is set or the root owns the collection). The field
// mounts on an empty, uncontrolled collection, so the trigger press is the open
// path under test.
test("X-004 does not open a collection that has nothing to display", async () => {
  const app = await openCase("no-items");

  expect(combo.getListbox(app)).toBe(false);

  await app.press(combo.COMBO_BOX_TRIGGER);
  await settle(app);

  expect(combo.getListbox(app)).toBe(false);
  expect(callsOf(app, "openChange")).toHaveLength(0);
});

// src/components/combo-box/combo-box-root.tsx:759-784 (review finding);
// upstream packages/react-stately/src/combobox/useComboBoxState.ts:328,338,350-374:
// `allowsEmptyCollection` keeps the empty list displayable, so the trigger does
// open it — a guard that always refuses would be wrong.
test("X-005 opens an empty list when allowsEmptyCollection is set", async () => {
  const app = await openCase("no-items-allowed");

  expect(combo.getListbox(app)).toBe(false);

  await app.press(combo.COMBO_BOX_TRIGGER);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  expect(combo.getListbox(app)).toBe(true);
  expect(combo.getOptions(app)).toBe(0);
});

// src/components/combo-box/combo-box-root.tsx:362-365 (review finding);
// upstream packages/react-stately/src/combobox/useComboBoxState.ts:298-303 skips
// the default filter only for the controlled `items` prop, and
// packages/react-aria-components/src/ComboBox.tsx:206-213 forwards only
// `props.items`, so `defaultItems` stays filtered.
test("X-006 filters a defaultItems collection while typing", async () => {
  const app = await openCase("default-items");

  await app.press(combo.COMBO_BOX);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);

  expect(combo.getOptions(app)).toBe(3);

  await app.type(combo.COMBO_BOX, "Tw");
  await app.clock!.runFor(20);

  expect(combo.inputValue(app)).toBe("Tw");
  expect(app.shows("role:option[Two]")).toBe(true);
  expect(app.shows("role:option[One]")).toBe(false);
  expect(app.shows("role:option[Three]")).toBe(false);
});

// src/components/combo-box/combo-box-trigger.tsx:36-96 (review finding);
// upstream packages/react/src/components/combo-box/combo-box.tsx:170-176 makes
// `ComboBoxTriggerProps extends ButtonProps`, so the caller's press handlers run
// alongside the internal toggle.
test("X-010 runs the trigger's press handlers beside its own toggle", async () => {
  const app = await openCase("log");

  await app.press(combo.COMBO_BOX_TRIGGER);
  await app.waitFor(combo.COMBO_BOX_LISTBOX);
  await app.clock!.runFor(20);

  expect(callsOf(app, "triggerPress")).toHaveLength(1);
  expect(callsOf(app, "triggerPressChange")).toEqual([[true], [false]]);
  expect(callsOf(app, "triggerPressStart")).toHaveLength(1);
  expect(callsOf(app, "triggerPressUp")).toHaveLength(1);
  expect(callsOf(app, "triggerPressEnd")).toHaveLength(1);
  expect(combo.getListbox(app)).toBe(true);

  await app.press(combo.COMBO_BOX_TRIGGER);
  await settle(app);

  expect(callsOf(app, "triggerPress")).toHaveLength(2);
  expect(callsOf(app, "triggerPressChange")).toEqual([
    [true],
    [false],
    [true],
    [false],
  ]);
  expect(combo.getListbox(app)).toBe(false);
});
