import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import * as autocomplete from "../../testers/autocomplete";

/*
 * HeroUI 3.2.7 unit regressions for Autocomplete that a pointer drives on every
 * target, per port sheet 4b (T-002 … T-006).
 *
 * Deleted here: T-001 (data-slot / BEM block, D18). T-019 and T-020 are
 * screenshots, not tests. The overlay-motion, item-indicator and keyboard rows
 * live in autocomplete.heroui.web.test.tsx.
 *
 * Every case opens a manual clock: closing keeps the popover visible for the
 * 100 ms exit hold, so "the list is gone" is only true after the clock passes
 * it.
 */

function openCase(name: string, options: Parameters<typeof openScenario>[1] = {}): Promise<App> {
  return openScenario(name, { clock: {}, width: 1024, height: 768, ...options });
}

/** Runs past the 100 ms exit hold. */
function settle(app: App): Promise<void> {
  return app.clock!.runFor(120);
}

// heroui/packages/react/tests/components/autocomplete/autocomplete.test.tsx:103
// Partial port (port sheet T-002): the RAC Select tester becomes the local
// tester and the `[data-slot="autocomplete-popover"]` / `getByRole("searchbox")`
// queries become the listbox and the filter input's label. The behavior is
// unchanged: the list opens with three options, selecting Dog reports "dog",
// closes the popover and shows the value.
test("T-002 supports open, select, and value update via the tester", async () => {
  const app = await openCase("autocomplete/default");

  expect(autocomplete.getListbox(app)).toBe(false);

  await autocomplete.open(app, "Select an animal");

  expect(autocomplete.getListbox(app)).toBe(true);
  expect(app.shows("label:Search animals")).toBe(true);
  expect(autocomplete.getOptions(app)).toBe(3);

  await autocomplete.toggleOptionSelection(app, "Dog");
  await settle(app);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBe("dog");
  expect(autocomplete.getListbox(app)).toBe(false);
  expect(autocomplete.triggerShows(app, "Dog")).toBe(true);
});

// heroui/packages/react/tests/components/autocomplete/autocomplete.test.tsx:130
// Partial port (port sheet T-003): the `[data-slot="autocomplete-clear-button"]`
// query becomes the button's accessible name. The clear reports once, resets the
// value to the placeholder and reports the empty selection.
test("T-003 exposes ClearButton and calls onClear", async () => {
  const app = await openCase("autocomplete/clear-button");

  expect(autocomplete.triggerShows(app, "Cat")).toBe(true);

  await app.press("label:Clear selection");
  await settle(app);

  expect(callsOf(app, "clear")).toHaveLength(1);

  const changes = callsOf(app, "change");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toBeNull();
  expect(autocomplete.triggerShows(app, "Select an animal")).toBe(true);
});

// heroui/packages/react/tests/components/autocomplete/autocomplete.test.tsx:151
// Ported (port sheet T-004): the host refuses the press on a disabled field, the
// list never shows and no selection is recorded.
test("T-004 supports disabled state", async () => {
  const app = await openCase("autocomplete/disabled");

  await expect(app.press("text:Select an animal")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  await settle(app);

  expect(autocomplete.getListbox(app)).toBe(false);
  expect(callsOf(app, "change")).toHaveLength(0);
});

// heroui/packages/react/tests/components/autocomplete/autocomplete.test.tsx:169
// Partial port (port sheet T-005): `isInvalid` reaches FieldError. The
// `[data-slot="field-error"]` and root `data-invalid` assertions have no channel
// (D18 / no attribute query); the invalid appearance is a screenshot case.
test("T-005 renders FieldError when invalid", async () => {
  const app = await openCase("autocomplete/invalid");

  expect(app.shows("text:Please choose an animal")).toBe(true);
});

// heroui/packages/react/tests/components/autocomplete/autocomplete.test.tsx:178
// Partial port (port sheet T-006): three selected animals render as tag rows;
// pressing "Remove tag Dog" removes that tag once, leaves Cat and Panda, and
// must not open the popover (a press on a control inside the trigger used to be
// swallowed dismissing the popover instead of removing a tag).
test("T-006 removes the tag on the first press without opening the popover", async () => {
  const app = await openCase("autocomplete/multiple-tags");

  expect(app.count("role:row")).toBe(3);

  await app.press("label:Remove tag Dog");
  await settle(app);

  const removed = callsOf(app, "remove");

  expect(removed).toHaveLength(1);
  expect(removed[0][0]).toEqual(["dog"]);
  expect(app.shows("role:row[Dog]")).toBe(false);
  expect(app.shows("role:row[Cat]")).toBe(true);
  expect(app.shows("role:row[Panda]")).toBe(true);
  expect(autocomplete.getListbox(app)).toBe(false);
});
