import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Kobalte 0.13.14 regression cases for ToggleButton / ToggleGroup, per port
 * sheet 4b (T-024 … T-028, T-032, T-033, T-036). They cover the selection
 * primitives this unit borrows (`createToggleState`, `createListState`,
 * `createSelectableItem`), rewritten to HeroUI's API: `pressed` / `defaultValue`
 * become `isSelected` / `defaultSelected`, and the group's string payload
 * becomes the `Set` contract (`onSelectionChange`).
 *
 * Partial ports: Kobalte asserts `aria-pressed` / `data-pressed` twice for the
 * same state; the render-prop text keeps one of each pair, because nsh/test
 * cannot read aria state. The roving `tabindex` assertions are not carried
 * over: RAC does not express member focus with `tabindex` at all, and the
 * difference is registered in the port sheet's section 8.
 *
 * Keyboard cases (T-029, T-030, T-035) move focus with Tab and live in
 * toggle-button.kobalte.web.test.tsx. T-031 (Home / End) and T-034 (focus the
 * selected item on first Tab) are deleted in 4b: neither is HeroUI behaviour.
 *
 * Every case waits for the first frame after `open` before it reads, on what it
 * reads first: on `--target web` `open` can resolve before the app's first
 * commit, and a read straight after it sees an empty screen. The waits only
 * delay the reads — every assertion still runs and can still fail.
 */

// kobalte/packages/core/src/toggle-button/toggle-button.test.tsx:10
// Partial port (port sheet T-024): one of the two same-meaning attributes is
// kept, as the rendered text.
test("T-024 can be default selected (uncontrolled)", async () => {
  const app = await openScenario("toggle-button/default-selected.split");
  await app.waitFor("role:button[Button on]");

  expect(app.shows("role:button[Button on]")).toBe(true);
});

// kobalte/packages/core/src/toggle-button/toggle-button.test.tsx:23
// Partial port (port sheet T-025): the controlled value, the single callback and
// the parent that ignores it; the duplicate attribute reads fold into the text.
test("T-025 can be controlled", async () => {
  const app = await openScenario("toggle-button/controlled-on.split");
  await app.waitFor("text:Button on");

  expect(app.shows("text:Button on")).toBe(true);

  await app.press("role:button[Button on]");
  expect(callsOf(app, "onChange")).toEqual([[false]]);
  // The parent never wrote the new value back, so the button stays selected.
  expect(app.shows("text:Button on")).toBe(true);
});

// kobalte/packages/core/src/toggle-button/toggle-button.test.tsx:46
// Partial port (port sheet T-026): the off state, read as text.
test("T-026 should have correct attributes when the toggle button is off (not selected)", async () => {
  const app = await openScenario("toggle-button/render-props.split");
  await app.waitFor("text:Bold off");

  expect(app.shows("text:Bold off")).toBe(true);
});

// kobalte/packages/core/src/toggle-button/toggle-button.test.tsx:57
// Partial port (port sheet T-027): the on state, read as text.
test("T-027 should have correct attributes when the toggle button is on (selected)", async () => {
  const app = await openScenario("toggle-button/default-selected.split");
  await app.waitFor("text:Button on");

  expect(app.shows("text:Button on")).toBe(true);
});

// kobalte/packages/core/src/toggle-group/toggle-group.test.tsx:26
// Rewritten port (port sheet T-028): Kobalte's default is single selection, so
// HeroUI's single mode (radiogroup / radio) carries the same behaviour, and the
// callback's string payload becomes a `Set` read back as a sorted array.
test("T-028 can have a default value", async () => {
  const app = await openScenario("toggle-button-group/animals.split");
  await app.waitFor("role:radiogroup");

  expect(app.shows("role:radiogroup")).toBe(true);
  expect(app.count("role:radiogroup >> role:radio")).toBe(3);
  expect(callsOf(app, "onSelectionChange")).toHaveLength(0);
  expect(app.shows("text:Cats on")).toBe(true);
  expect(app.shows("text:Dogs off")).toBe(true);
  expect(app.shows("text:Dragons off")).toBe(true);

  await app.press("role:radio[Dragons off]");
  expect(callsOf(app, "onSelectionChange")).toHaveLength(1);
  expect(callsOf(app, "onSelectionChange")).toEqual([[["dragons"]]]);
  expect(app.shows("text:Dogs off")).toBe(true);
  expect(app.shows("text:Cats off")).toBe(true);
  expect(app.shows("text:Dragons on")).toBe(true);
});

// kobalte/packages/core/src/toggle-group/toggle-group.test.tsx:227
// Rewritten port (port sheet T-032): single selection, read as text.
test("T-032 supports using click to change state", async () => {
  const app = await openScenario("toggle-button-group/click-single.split");
  await app.waitFor("text:Dogs off");

  expect(app.shows("text:Dogs off")).toBe(true);

  await app.press("role:radio[Cats off]");
  expect(app.shows("text:Cats on")).toBe(true);
  expect(app.shows("text:Dogs off")).toBe(true);

  await app.press("role:radio[Dogs off]");
  expect(app.shows("text:Dogs on")).toBe(true);
  expect(app.shows("text:Cats off")).toBe(true);
});

// kobalte/packages/core/src/toggle-group/toggle-group.test.tsx:266
// Rewritten port (port sheet T-033): multiple selection keeps both pressed.
test("T-033 multi-select", async () => {
  const app = await openScenario("toggle-button-group/multi-click.split");
  await app.waitFor("text:Cats off");

  expect(app.shows("text:Cats off")).toBe(true);

  await app.press("role:button[Cats off]");
  expect(app.shows("text:Cats on")).toBe(true);

  await app.press("role:button[Dogs off]");
  expect(app.shows("text:Dogs on")).toBe(true);
  expect(app.shows("text:Cats on")).toBe(true);
});

// kobalte/packages/core/src/toggle-group/toggle-group.test.tsx:353
// Rewritten port (port sheet T-036): the disabled member cannot be selected and
// reports no selection change.
test("T-036 disabled item should be be pressed", async () => {
  const app = await openScenario("toggle-button-group/item-disabled.split");
  await app.waitFor("role:radio[Cats off]");

  await expect(app.press("role:radio[Cats off]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });
  expect(callsOf(app, "onSelectionChange")).toHaveLength(0);
  expect(app.shows("text:Cats off")).toBe(true);
});
