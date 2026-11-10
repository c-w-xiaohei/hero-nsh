import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import * as select from "../../testers/select";

/*
 * HeroUI 3.2.7 unit regressions for Select that a pointer can drive on every
 * target, per port sheet 4b (T-001 … T-006, T-008 … T-013).
 *
 * Deleted here: T-007 (tagName / DOM nesting, SOP 3.2). T-019, T-020 and T-026
 * are screenshot comparisons, not tests. The keyboard and focus rows live in
 * select.heroui.web.test.tsx: NSH 0.4.0's Win32 host gives keyboard focus only
 * to an Input, so Tab / Backspace / focus restore cannot run in a real Windows
 * window (approved difference, port sheet section 8).
 *
 * Every case opens a manual clock: closing keeps the list visible for the
 * 100 ms exit hold, so "the list is gone" is only true after the clock passes
 * it.
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
function settle(app: App): Promise<void> {
  return app.clock!.runFor(120);
}

// heroui/packages/react/tests/components/select/select.test.tsx:32
// Partial port (port sheet T-001): the root `data-slot` and the BEM class
// assertions are D18 deletions. The trigger and the value stay observable: the
// trigger is a button named by the visible Label, and the value shows the
// placeholder.
test("T-001 exposes the trigger and the value", async () => {
  const app = await openScenario("select/default", { clock: {} });

  expect(app.shows("role:button[State]")).toBe(true);
  expect(app.shows("text:Select one")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:43
// Partial port (port sheet T-002): the RAC Select tester becomes the local
// tester; the `[data-slot="select-popover"]` assertion is replaced by the
// listbox appearing, which is the same behavior. This case renders its options
// through `items`, so the dynamic collection path is the one under test.
test("T-002 opens, lists the options and updates the value through the Select tester", async () => {
  const app = await openCase("states-items");

  expect(select.getListbox(app)).toBe(false);

  await select.open(app);

  expect(select.getListbox(app)).toBe(true);
  expect(select.getOptions(app)).toBe(3);

  await select.toggleOptionSelection(app, "California");
  await settle(app);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("california");
  expect(select.getListbox(app)).toBe(false);
  expect(select.triggerShows(app, "California")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:92
// Ported (port sheet T-004), through the deprecated `value` alias, which is
// what HeroUI's own fixture uses.
test("T-004 supports controlled value", async () => {
  const app = await openCase("states-controlled");

  expect(select.triggerShows(app, "Texas")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:98
// Ported (port sheet T-005): the trigger is disabled, the press is refused by
// the host, the list never shows and no selection is recorded.
test("T-005 supports disabled state", async () => {
  const app = await openCase("states-disabled");

  expect(app.enabled(select.SELECT_TRIGGER)).toBe(false);

  await expect(app.press(select.SELECT_TRIGGER)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  await settle(app);

  expect(select.getListbox(app)).toBe(false);
  expect(callsOf(app, "selectionChange")).toHaveLength(0);
});

// heroui/packages/react/tests/components/select/select.test.tsx:116
// Partial port (port sheet T-006): `isInvalid` really reaches FieldError. The
// `[data-slot="field-error"]` and root `data-invalid` assertions have no
// channel (D18 / no attribute query); the rest of the invalid appearance
// (red label, hidden description, danger ring) is the `select/invalid`
// screenshot scene.
test("T-006 renders FieldError when invalid", async () => {
  const app = await openCase("states-invalid");

  expect(app.shows("text:Please choose a state")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:138
// Partial port (port sheet T-008): the value's `data-placeholder` became the
// text assertion. Pressing the ClearButton clears once, reports `null` and
// leaves the listbox closed, which is what proves the press did not reach the
// trigger.
test("T-008 clears the selection on click without opening the listbox", async () => {
  const app = await openCase("states-clear");

  await app.press(select.getClearButton(app));
  await settle(app);

  expect(callsOf(app, "clear")).toHaveLength(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBeNull();
  expect(select.getListbox(app)).toBe(false);
  expect(select.triggerShows(app, "Select one")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:164
// Partial port (port sheet T-009): the right button is kept; the middle button
// has no `nsh test` step, named as dropped. Clearing runs on the primary press,
// so a context click must leave the value alone.
test("T-009 does not clear on the secondary pointer button", async () => {
  const app = await openCase("states-clear");

  await app.rightClick(select.getClearButton(app));
  await settle(app);

  expect(callsOf(app, "clear")).toHaveLength(0);
  expect(select.triggerShows(app, "California")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:177
// Partial port (port sheet T-010): `data-empty` has no attribute query; its
// visible effect is opacity 0 and pointer-events none, so the behavior is the
// only readable half: with no selection the clear press does nothing.
test("T-010 ignores a clear press with no selection", async () => {
  const app = await openCase("states-clear-empty");

  await app.press(select.getClearButton(app));

  expect(callsOf(app, "clear")).toHaveLength(0);
});

// heroui/packages/react/tests/components/select/select.test.tsx:190
// Ported (port sheet T-011): the host refuses the press on a disabled field.
// A component that forgot to read the root's isDisabled would record a clear.
test("T-011 does not clear when the select is disabled", async () => {
  const app = await openCase("states-disabled");

  await expect(app.press(select.getClearButton(app))).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(callsOf(app, "clear")).toHaveLength(0);
  expect(select.triggerShows(app, "California")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:204
// Ported (port sheet T-012): only the Trigger is disabled. The ClearButton must
// read the Trigger's own context rather than the root's prop.
test("T-012 does not clear when only the trigger is disabled", async () => {
  const app = await openCase("states-trigger-disabled");

  await expect(app.press(select.getClearButton(app))).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(callsOf(app, "clear")).toHaveLength(0);
  expect(select.triggerShows(app, "California")).toBe(true);
});

// heroui/packages/react/tests/components/select/select.test.tsx:223
// Partial port (port sheet T-013): the custom child is kept. "The default icon
// is absent" is dropped: the built-in X is a border-only view with no text or
// role, so nothing can prove it is gone.
test("T-013 renders custom children in place of the default icon", async () => {
  const app = await openCase("states-custom-icon");

  expect(app.shows("text:×")).toBe(true);
});

// Review round 1 regression (D17, tmp/heroui-nsh-port-research.md:40,272-273):
// a Value render prop's function body runs once, untracked, so the
// custom-value branch must be reactive (`<If>` / `<Each>` reading the
// accessors). Selecting Bob in the single scene replaces the placeholder with
// his avatar initial and name; selecting Martha in the multiple scene adds her
// chip to the two default ones.
test("X-001 custom value scenes follow the selection", async () => {
  const single = await openScenario("select/custom-value.split", { clock: {} });

  expect(single.shows("role:button[User]")).toBe(true);
  expect(single.shows("role:button >> text:Select a user")).toBe(true);

  await single.press("role:button[User]");
  await single.waitFor("role:listbox");
  await single.press("text:Bob");
  await settle(single);

  expect(single.shows("role:button >> text:Bob")).toBe(true);
  expect(single.shows("role:button >> text:B")).toBe(true);
  expect(single.shows("role:button >> text:Select a user")).toBe(false);

  const multiple = await openScenario("select/custom-value-multiple.split", {
    clock: {},
  });

  expect(multiple.shows("role:button >> text:Bob")).toBe(true);
  expect(multiple.shows("role:button >> text:Martha")).toBe(false);

  await multiple.press("role:button");
  await multiple.waitFor("role:listbox");
  await multiple.press("text:Martha");

  expect(multiple.shows("role:button >> text:Martha")).toBe(true);
  expect(multiple.shows("role:button >> text:M")).toBe(true);
});
