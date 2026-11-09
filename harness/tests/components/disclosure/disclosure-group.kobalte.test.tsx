import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Kobalte accordion cases that map onto DisclosureGroup, per port sheet 4b
 * (T-033 … T-035, T-040, T-042, T-043, T-045, T-046, T-048).
 *
 * The Kobalte fixture (`AccordionTest`) is three items named one / two / three
 * with triggers "Trigger one" … and bodies "Content one" …; `defaultValue` /
 * `value` become `defaultExpandedKeys` / `expandedKeys`, and `onChange`'s array
 * becomes a `Set` whose keys the probe writes in order.
 *
 * `aria-expanded` / `aria-controls` / the panel's `role` / `aria-labelledby`
 * have no NSH channel and are dropped as registered partial ports; visibility
 * of the body is the effect they stood for. The three Kobalte `it.skip` arrow /
 * Home / End cases (T-036 … T-038) are deleted: HeroUI's group has no roving
 * focus and binds no key, so porting them would add behaviour.
 */

const ONE = "role:button[Trigger one]";
const TWO = "role:button[Trigger two]";
const CONTENT_ONE = "text:Content one";
const CONTENT_TWO = "text:Content two";

function openCase(name: string): Promise<App> {
  return open("../../../disclosure.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// kobalte/packages/core/src/accordion/accordion.test.tsx:37
// Partial port (port sheet T-033): the per-item `aria-expanded`, the expanded
// item's `aria-controls`, and the panel's `role="region"` + `aria-labelledby`
// are dropped. Kept: three headers, each trigger, and the first body showing.
test("T-033 renders the three items properly", async () => {
  const app = await openCase("group-three-expanded");

  expect(app.count("role:header")).toBe(3);
  expect(app.shows(ONE)).toBe(true);
  expect(app.shows(TWO)).toBe(true);
  expect(app.shows("role:button[Trigger three]")).toBe(true);
  expect(app.shows(CONTENT_ONE)).toBe(true);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:63
// Partial port (port sheet T-034): the `aria-expanded` assertion is dropped;
// the default expanded body showing is kept.
test("T-034 can have a default expanded value", async () => {
  const app = await openCase("group-three-expanded");

  expect(app.shows(CONTENT_ONE)).toBe(true);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:76
// Partial port (port sheet T-035): four `aria-expanded` assertions are dropped.
// Kept: the controlled value shows the first body and clips the second, the
// press reports exactly ["two"] once, and the controlled value is not written
// back (the first body stays visible, the second stays clipped).
test("T-035 can be controlled", async () => {
  const app = await openCase("group-three-controlled");

  expect(app.shows(CONTENT_ONE)).toBe(true);
  expect(app.shows(CONTENT_TWO)).toBe(false);

  await app.press(TWO);

  expect(callsOf(app, "onExpandedChange")).toEqual([["two"]]);
  expect(callsOf(app, "onExpandedChange")).toHaveLength(1);
  expect(app.shows(CONTENT_ONE)).toBe(true);
  expect(app.shows(CONTENT_TWO)).toBe(false);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:214
// Partial port (port sheet T-040): three `aria-expanded` assertions are
// dropped. Kept: the first body shows after its trigger, pressing the second
// clips the first and shows the second (the source's commented-out
// `not.toBeVisible()` included).
test("T-040 toggles between different items when pressing a trigger", async () => {
  const app = await openCase("group-three");

  await app.press(ONE);
  expect(app.shows(CONTENT_ONE)).toBe(true);

  await app.press(TWO);
  expect(app.shows(CONTENT_ONE)).toBe(false);
  expect(app.shows(CONTENT_TWO)).toBe(true);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:252
// Partial port (port sheet T-042): HeroUI's single mode clears the set when the
// same item is pressed again (React Stately `toggleKey`), where Kobalte with
// `collapsible=false` keeps it open and stays silent. That replacement is named
// here: the second press reports an empty set, and the third reports ["two"].
test("T-042 calls onExpandedChange on every trigger press", async () => {
  const app = await openCase("group-three");

  await app.press(ONE);
  expect(callsOf(app, "onExpandedChange")).toEqual([["one"]]);

  await app.press(ONE);
  expect(callsOf(app, "onExpandedChange")).toEqual([["one"], []]);

  await app.press(TWO);
  expect(callsOf(app, "onExpandedChange")).toEqual([["one"], [], ["two"]]);
  expect(callsOf(app, "onExpandedChange")).toHaveLength(3);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:276
// Partial port (port sheet T-043): `collapsible` does not exist in HeroUI
// (single mode always collapses), so the fixture omits it. Two `aria-expanded`
// assertions are dropped; the three visibility steps remain, including the
// source's commented-out "closed is not visible".
test("T-043 toggles the same item when pressing its trigger", async () => {
  const app = await openCase("group-three-expanded");

  expect(app.shows(CONTENT_ONE)).toBe(true);

  await app.press(ONE);
  expect(app.shows(CONTENT_ONE)).toBe(false);

  await app.press(ONE);
  expect(app.shows(CONTENT_ONE)).toBe(true);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:327
// Partial port (port sheet T-045): three `aria-expanded` assertions are
// dropped; the three visibility steps remain, and the first body stays open
// while the second opens.
test("T-045 expands multiple items when pressing triggers", async () => {
  const app = await openCase("group-three-multiple");

  await app.press(ONE);
  expect(app.shows(CONTENT_ONE)).toBe(true);

  await app.press(TWO);
  expect(app.shows(CONTENT_TWO)).toBe(true);
  expect(app.shows(CONTENT_ONE)).toBe(true);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:350
// Partial port (port sheet T-046): two `aria-expanded` assertions are dropped;
// the three visibility steps remain for the multiple-mode collapse / expand.
test("T-046 toggles the same item when pressing its trigger if multiple", async () => {
  const app = await openCase("group-three-multiple-expanded");

  expect(app.shows(CONTENT_ONE)).toBe(true);

  await app.press(ONE);
  expect(app.shows(CONTENT_ONE)).toBe(false);

  await app.press(ONE);
  expect(app.shows(CONTENT_ONE)).toBe(true);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:399
// The array payload becomes the set's keys in iteration order: ["one"], then
// ["one", "two"], two calls.
test("T-048 calls onExpandedChange on multiple trigger presses", async () => {
  const app = await openCase("group-three-multiple");

  await app.press(ONE);
  expect(callsOf(app, "onExpandedChange")).toEqual([["one"]]);

  await app.press(TWO);
  expect(callsOf(app, "onExpandedChange")).toEqual([["one"], ["one", "two"]]);
  expect(callsOf(app, "onExpandedChange")).toHaveLength(2);
});
