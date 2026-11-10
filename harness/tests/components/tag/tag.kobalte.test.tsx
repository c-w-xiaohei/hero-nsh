import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { rows, selectTag } from "../../testers/tag";

/*
 * Kobalte 0.13.14 regression cases for TagGroup, per port sheet 4b
 * (T-017, T-021, T-024, T-026, T-028 … T-033, T-036, T-038).
 *
 * Kobalte has no Tag / TagGroup, so `packages/core/src/listbox/listbox.test.tsx`
 * is the component-level source for the shared list and selection primitives
 * (port sheet header). Every case is rewritten onto HeroUI's TagGroup API:
 * `options` + `renderItem` become static children or `items` + a function
 * child, `document.activeElement` becomes the `▶` marker, `aria-selected`
 * becomes the `✓` marker, and `onChange` becomes a Storage probe.
 *
 * Dropped per case: `tabindex` (the list is the single Tab stop), `aria-selected`
 * where a marker covers it, `aria-disabled` where `app.enabled` covers it, and
 * `aria-multiselectable` (no such channel). Cases that start with Tab live in
 * tag.kobalte.web.test.tsx (approved Windows host gap, port sheet section 8).
 *
 * Note on `app.press` of a disabled row: nsh test rejects with
 * ERR_NSH_TEST_DISABLED, which is the host's way of saying the row takes no
 * input; the callback staying empty is asserted after it.
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../tag.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/listbox/listbox.test.tsx:36
// Partial port (port sheet T-017): the per-option `tabindex` / `aria-selected` /
// `aria-disabled` assertions are dropped. The grid and the three rows stay.
test("T-017 renders properly", async () => {
  const app = await openFixture("typeahead");

  expect(app.shows("role:grid")).toBe(true);
  expect(rows(app)).toBe(3);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:167
// Partial port (port sheet T-021): HeroUI's equivalent of `renderItem` is
// `items` + a function child. Kept: three mapped rows with their names, and a
// press carrying the data's id. Dropped: the Kobalte object shape, `aria-selected`
// and `tabindex` assertions.
test("T-021 supports a function based option mapping", async () => {
  const app = await openFixture("items-mapped");

  expect(rows(app)).toBe(3);
  expect(app.shows("text:One")).toBe(true);
  expect(app.shows("text:Two")).toBe(true);
  expect(app.shows("text:Three")).toBe(true);

  await selectTag(app, "Two");

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["2"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:259
// Partial port (port sheet T-024): the controlled value never writes back.
// Kept: Two starts selected, a press on Three leaves the selection unchanged,
// and the callback reports the attempted key. Dropped: the DOM focus and the
// `tabindex` / `aria-selected` assertions (markers cover selection).
test("T-024 supports a controlled value", async () => {
  const app = await openFixture("controlled-selection");

  expect(app.count("role:row[Two] >> text:✓")).toBe(1);

  await selectTag(app, "Three");

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["3"]);
  expect(app.count("role:row[Three] >> text:✓")).toBe(0);
  expect(app.count("role:row[Two] >> text:✓")).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:332
// Rewritten port (port sheet T-026): the pointer press selects the third row,
// read through the `✓` marker; the callback reports its key.
test("T-026 supports using pointer up to change option selection", async () => {
  const app = await openFixture("typeahead");

  await selectTag(app, "Three");

  expect(app.count("role:row[Three] >> text:✓")).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toContain("3");
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:435
// Partial port (port sheet T-028): `aria-multiselectable` has no channel.
// Kept: two presses select two rows, one callback each, each carrying its key.
test("T-028 supports selecting multiple options", async () => {
  const app = await openFixture("typeahead-multiple");

  await selectTag(app, "One");
  await selectTag(app, "Three");

  expect(app.count("role:row[One] >> text:✓")).toBe(1);
  expect(app.count("role:row[Three] >> text:✓")).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[0][0]).toContain("1");
  expect(changes[1][0]).toContain("3");
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:492
// Rewritten port (port sheet T-029): the uncontrolled default selection marks
// One and Two; pressing Three marks all three and reports the set once.
test("T-029 supports multiple defaultValue (uncontrolled)", async () => {
  const app = await openFixture("typeahead-multiple-default");

  expect(app.count("role:row[One] >> text:✓")).toBe(1);
  expect(app.count("role:row[Two] >> text:✓")).toBe(1);

  await selectTag(app, "Three");

  expect(app.count("role:row[One] >> text:✓")).toBe(1);
  expect(app.count("role:row[Two] >> text:✓")).toBe(1);
  expect(app.count("role:row[Three] >> text:✓")).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect([...(changes[0][0] as string[])].sort()).toEqual(["1", "2", "3"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:542
// Rewritten port (port sheet T-030): the controlled set stays at One and Two;
// pressing Three reports it but does not select it.
test("T-030 supports multiple value (controlled)", async () => {
  const app = await openFixture("typeahead-multiple-controlled");

  await selectTag(app, "Three");

  expect(app.count("role:row[Three] >> text:✓")).toBe(0);
  expect(app.count("role:row[One] >> text:✓")).toBe(1);
  expect(app.count("role:row[Two] >> text:✓")).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toContain("3");
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:590
// Rewritten port (port sheet T-031): pressing a selected row deselects it; the
// callback carries the remaining key only.
test("T-031 supports deselection", async () => {
  const app = await openFixture("typeahead-multiple-default");

  expect(app.count("role:row[One] >> text:✓")).toBe(1);
  expect(app.count("role:row[Two] >> text:✓")).toBe(1);

  await selectTag(app, "One");

  expect(app.count("role:row[One] >> text:✓")).toBe(0);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);

  const keys = changes[0][0] as string[];

  expect(keys).toEqual(["2"]);
  expect(keys).not.toContain("1");
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:637
// Rewritten port (port sheet T-032): a disabled row is not enabled, its press
// is refused, and the two selected rows keep their markers.
test("T-032 supports disabled options", async () => {
  const app = await openFixture("typeahead-disabled-three");

  expect(app.enabled("role:row[Three]")).toBe(false);

  await expect(app.press("role:row[Three]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(callsOf(app, "selectionChange")).toHaveLength(0);
  expect(app.count("role:row[One] >> text:✓")).toBe(1);
  expect(app.count("role:row[Two] >> text:✓")).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:690
// Rewritten port (port sheet T-033): pressing the only selected row clears the
// selection; the callback reports an empty set.
test("T-033 supports empty selection when disallowEmptySelection is false", async () => {
  const app = await openFixture("empty-selection");

  expect(app.count("role:row[Two] >> text:✓")).toBe(1);

  await selectTag(app, "Two");

  expect(app.count("role:row[Two] >> text:✓")).toBe(0);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual([]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:793
// Partial port (port sheet T-036): the `aria-labelledby` / `aria-describedby`
// "absent" assertions have no channel. Kept: the tag's aria-label names the row
// instead of its textValue, and the original text still renders.
test("T-036 supports aria-label on options", async () => {
  const app = await openFixture("row-aria-label");

  expect(app.shows("role:row[Custom name]")).toBe(true);
  expect(app.shows("text:One")).toBe(true);
  expect(app.shows("role:row[One]")).toBe(false);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:853
test("T-038 supports aria-label", async () => {
  const app = await openFixture("aria-label");

  expect(app.shows("role:grid[Test]")).toBe(true);
});
