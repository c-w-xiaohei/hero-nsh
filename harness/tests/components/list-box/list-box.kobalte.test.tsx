import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { options, selectOption, selectedOptions } from "../../testers/list-box";

/*
 * Kobalte 0.13.14 regression cases for ListBox, ported to HeroUI's API and to
 * NSH's view model, per port sheet 4b (T-004 … T-025, T-027).
 *
 * Deleted rows are not repeated here: T-026 (Kobalte keeps the indicator
 * unmounted until selected; HeroUI's indicator is always mounted and hides the
 * checkmark with stroke-dashoffset, which no NSH query can read) and T-028
 * (`forceMount` is Kobalte's own prop). T-027's rewrite covers the visible
 * selected-indicator contract instead.
 *
 * Tab-dependent cases (T-005, T-006, T-010 … T-012, T-014, T-021, T-022, the
 * page keys and X-003) live in list-box.kobalte.web.test.tsx: they start with
 * Tab on the listbox, which NSH 0.4.0's Win32 host cannot do (approved
 * difference, port sheet section 8). The cases here drive the pointer or only
 * read the list, so they run on every target.
 *
 * `aria-label` on the fixture's items keeps the accessible name equal to the
 * row text while the marker changes, so `role:option[Two]` keeps naming the
 * same row after focus moves.
 */

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../list-box.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/listbox/listbox.test.tsx:36
// Partial port (port sheet T-004): the per-option tabindex and
// aria-selected="false" / aria-disabled="false" attribute assertions have no
// projection channel in NSH. Role, count, the three texts and the enabled
// state of every row are kept; selection and disabling are covered by their
// own behavior cases (T-010, T-014).
test("T-004 renders properly", async () => {
  const app = await openScenario("list-box/default");

  expect(app.shows("role:listbox[Users]")).toBe(true);
  expect(options(app)).toBe(3);
  expect(app.shows("text:Bob")).toBe(true);
  expect(app.shows("text:Fred")).toBe(true);
  expect(app.shows("text:Martha")).toBe(true);
  expect(app.enabled("role:option[Bob]")).toBe(true);
  expect(app.enabled("role:option[Fred]")).toBe(true);
  expect(app.enabled("role:option[Martha]")).toBe(true);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:133
// Rewritten port (port sheet T-007): Kobalte's optionValue / optionTextValue /
// optionDisabled / optionGroupChildren string mapping becomes HeroUI's dynamic
// collection: Root items is a group array and Section items is the group's
// children, with the fields mapped in the render function. Keys are proved on
// the second instance, whose isDisabled mapping is always false.
test("T-007 supports string based option mapping for object options", async () => {
  const app = await openFixture("items-section");

  expect(app.count("role:option")).toBe(3);
  expect(app.shows("text:One")).toBe(true);
  expect(app.shows("text:Two")).toBe(true);
  expect(app.shows("text:Three")).toBe(true);
  expect(app.enabled("role:option[One]")).toBe(true);
  expect(app.enabled("role:option[Three]")).toBe(true);
  expect(app.enabled("role:option[Two]")).toBe(false);
  await expect(app.press("role:option[Two]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  const keys = await openFixture("items-section", { params: { disabled: "none" } });

  await keys.press("role:option[One]");
  await keys.press("role:option[Two]");

  const changes = callsOf(keys, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[0][0]).toEqual(["1"]);
  expect(changes[1][0]).toEqual(["2"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:167
// Rewritten port (port sheet T-008): the same data, but the render function
// computes both the visible text and the key. The `1 — One` texts only appear
// if the function really reads each object.
test("T-008 supports function based option mapping for object options", async () => {
  const app = await openFixture("items-section-fn");

  expect(app.count("role:option")).toBe(3);
  expect(app.shows("text:1 — One")).toBe(true);
  expect(app.shows("text:2 — Two")).toBe(true);
  expect(app.shows("text:3 — Three")).toBe(true);
  expect(app.enabled("role:option[One]")).toBe(true);
  expect(app.enabled("role:option[Three]")).toBe(true);
  expect(app.enabled("role:option[Two]")).toBe(false);
  await expect(app.press("role:option[Two]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  const keys = await openFixture("items-section-fn", { params: { disabled: "none" } });

  await keys.press("role:option[One]");
  await keys.press("role:option[Two]");

  const changes = callsOf(keys, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[0][0]).toEqual(["1"]);
  expect(changes[1][0]).toEqual(["2"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:201
// Rewritten port (port sheet T-009): a string data source, where the item
// itself is the key and the text.
test("T-009 supports function based option mapping for string options", async () => {
  const app = await openFixture("items-string");

  expect(app.count("role:option")).toBe(3);
  expect(app.shows("text:One")).toBe(true);
  expect(app.shows("text:Two")).toBe(true);
  expect(app.shows("text:Three")).toBe(true);
  expect(app.enabled("role:option[One]")).toBe(true);
  expect(app.enabled("role:option[Three]")).toBe(true);
  expect(app.enabled("role:option[Two]")).toBe(false);
  await expect(app.press("role:option[Two]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  const keys = await openFixture("items-string", { params: { disabled: "none" } });

  await keys.press("role:option[One]");
  await keys.press("role:option[Two]");

  const changes = callsOf(keys, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[0][0]).toEqual(["One"]);
  expect(changes[1][0]).toEqual(["Two"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:332
// Ported (port sheet T-013): a direct press on the row. The press fires after
// the pointer lifts, which is what pointerup did upstream.
test("T-013 supports using pointer up to change option selection", async () => {
  const app = await openFixture("log");

  expect(selectedOptions(app)).toBe(0);

  await selectOption(app, "Three");

  expect(selectedOptions(app)).toBe(1);
  expect(app.count("role:option[Three] >> text:✓")).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["3"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:435
// Partial port (port sheet T-015): aria-multiselectable has no field in
// AccessibilityState. The two presses, the growing marker count and the two
// callback payloads are kept.
test("T-015 supports selecting multiple options", async () => {
  const app = await openFixture("multiple-log");

  expect(selectedOptions(app)).toBe(0);

  await selectOption(app, "One");
  expect(selectedOptions(app)).toBe(1);

  await selectOption(app, "Three");
  expect(selectedOptions(app)).toBe(2);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(2);
  expect(changes[0][0]).toEqual(["1"]);
  expect(changes[1][0]).toEqual(["1", "3"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:492
// Rewritten port (port sheet T-016): all seven upstream expectations become
// visible assertions: two markers, the third row unselected, then all three.
test("T-016 supports multiple defaultValue (uncontrolled)", async () => {
  const app = await openFixture("multiple-default");

  expect(app.count("role:option[One] >> text:✓")).toBe(1);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);
  expect(app.count("role:option[Three] >> text:✓")).toBe(0);

  await selectOption(app, "Three");

  expect(app.count("role:option[Three] >> text:✓")).toBe(1);
  expect(selectedOptions(app)).toBe(3);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toContain("1");
  expect(changes[0][0]).toContain("2");
  expect(changes[0][0]).toContain("3");
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:542
// Ported (port sheet T-017): the controlled selection stays as it was after a
// press, while the callback reports the new key.
test("T-017 supports multiple value (controlled)", async () => {
  const app = await openFixture("multiple-controlled");

  expect(app.count("role:option[One] >> text:✓")).toBe(1);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);

  await selectOption(app, "Three");

  expect(app.count("role:option[Three] >> text:✓")).toBe(0);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toContain("3");
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:590
// Ported (port sheet T-018): pressing a selected row removes it from the
// uncontrolled multiple selection.
test("T-018 supports deselection", async () => {
  const app = await openFixture("multiple-default");

  expect(app.count("role:option[One] >> text:✓")).toBe(1);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);

  await selectOption(app, "One");

  expect(app.count("role:option[One] >> text:✓")).toBe(0);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);
  expect(selectedOptions(app)).toBe(1);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual(["2"]);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:637
// Partial port (port sheet T-019): aria-disabled is dropped; the rejected
// press, the empty callback log and the two surviving selections are kept.
test("T-019 supports disabled options in a multiple list", async () => {
  const app = await openFixture("multiple-disabled");

  await expect(app.press("role:option[Three]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "selectionChange")).toHaveLength(0);

  expect(app.count("role:option[One] >> text:✓")).toBe(1);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);
  expect(app.count("role:option[Three] >> text:✓")).toBe(0);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:690
// Ported (port sheet T-020): disallowEmptySelection={false} lets the only
// selected row be deselected, and the callback receives an empty set.
test("T-020 supports empty selection when disallowEmptySelection is false", async () => {
  const app = await openFixture("empty-allowed");

  expect(app.count("role:option[Two] >> text:✓")).toBe(1);

  await selectOption(app, "Two");

  expect(app.count("role:option[Two] >> text:✓")).toBe(0);

  const changes = callsOf(app, "selectionChange");

  expect(changes).toHaveLength(1);
  expect(changes[0][0]).toEqual([]);
  expect(selectedOptions(app)).toBe(0);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:793
// Partial port (port sheet T-023): aria-label on the item replaces its name;
// the aria-labelledby / aria-describedby relation assertions have no channel.
test("T-023 supports aria-label on options", async () => {
  const app = await openFixture("aria-label-item");

  expect(app.shows("role:option[Item]")).toBe(true);
  expect(app.count("role:option")).toBe(1);
  expect(app.shows("text:One")).toBe(true);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:818
// Partial port (port sheet T-024): Label and Description still render inside
// the option; the two id relations are dropped (no cross-element references).
test("T-024 supports complex options with a label and a description", async () => {
  const app = await openFixture("label-description");

  expect(app.shows("text:Label")).toBe(true);
  expect(app.shows("text:Description")).toBe(true);
  expect(app.count("role:option")).toBe(1);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:853
// Ported (port sheet T-025): the root's aria-label names the list.
test("T-025 supports aria-label", async () => {
  const app = await openFixture("log");

  expect(app.shows("role:listbox[Options]")).toBe(true);
});

// kobalte/packages/core/src/listbox/listbox.test.tsx:886
// Rewritten port (port sheet T-027): `forceMount` does not exist in HeroUI
// (T-028 deleted); the visible selected-indicator contract is kept with a
// custom ✓ child, absent for the unselected row.
test("T-027 should display item indicator when selected", async () => {
  const app = await openFixture("indicator-selected");

  expect(selectedOptions(app)).toBe(1);
  expect(app.count("role:option[Two] >> text:✓")).toBe(1);
  expect(app.count("role:option[One] >> text:✓")).toBe(0);
});
