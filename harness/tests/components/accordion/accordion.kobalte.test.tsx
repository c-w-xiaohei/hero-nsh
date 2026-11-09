import { expect, open, test } from "nsh/test";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { expandedCalls, panelText, trigger } from "../../testers/accordion";

/*
 * Kobalte 0.13.14 regression cases for Accordion that a pointer can drive,
 * ported to HeroUI's API and to NSH's view model, per port sheet 4b
 * (T-016 … T-018, T-023, T-025, T-026, T-028, T-029, T-031).
 *
 * Kobalte's props do not exist in HeroUI: `value` / `defaultValue` become
 * `expandedKeys` / `defaultExpandedKeys`, `onChange` becomes `onExpandedChange`,
 * and `multiple` becomes `allowsMultipleExpanded`. `collapsible` has no
 * counterpart because HeroUI's single mode always collapses on a second press
 * (RAC `useDisclosureGroupState.toggleKey`), so the Kobalte cases that relied on
 * "cannot collapse by default" are not ported (T-024) and the collapsible ones
 * keep their shape without the prop.
 *
 * aria-expanded has no query in `nsh/test`: a closed panel's content is clipped
 * away, so the content check stands in for it. The assertions upstream left
 * commented out ("content is no longer in the document") become real here.
 *
 * The cases that need Tab, Return or Space are in accordion.kobalte.web.test.tsx
 * (T-022, T-027, T-030) because of the approved Windows host gap.
 */

const TRIGGER_ONE = "Trigger one";
const TRIGGER_TWO = "Trigger two";

function openFixture(name: string, options_: ScenarioOptions = {}) {
  const { params, ...rest } = options_;

  return open("../../../accordion.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...rest,
    host: { params: { case: name, ...params } },
  });
}

// kobalte/packages/core/src/accordion/accordion.test.tsx:37
// Partial port (port sheet T-016): the aria-controls / aria-labelledby
// relations and the panel lookup by id are dropped (NSH has no id relations and
// the panel role differs, port sheet §8). Kept: three triggers, three headings,
// and defaultExpandedKeys expanding only the first panel.
test("T-016 renders properly", async () => {
  const app = await openFixture("kobalte-default");

  expect(app.count("role:button")).toBe(3);
  expect(app.shows(`role:button[${TRIGGER_ONE}]`)).toBe(true);
  expect(app.shows(`role:button[${TRIGGER_TWO}]`)).toBe(true);
  expect(app.shows("role:button[Trigger three]")).toBe(true);
  expect(app.count("role:header")).toBe(3);
  expect(panelText(app, "Content one")).toBe(true);
  expect(panelText(app, "Content two")).toBe(false);
  expect(panelText(app, "Content three")).toBe(false);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:63
// Ported (port sheet T-017): defaultExpandedKeys={["one"]} shows the first
// panel and leaves the others closed.
test("T-017 can have default expanded value", async () => {
  const app = await openFixture("kobalte-default");

  expect(panelText(app, "Content one")).toBe(true);
  expect(panelText(app, "Content two")).toBe(false);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:76
// Rewritten port (port sheet T-018): expandedKeys is held from outside, so the
// press reports the next keys and the rendering stays as the prop says. The
// final check is that the report did not come back as a second change.
test("T-018 can be controlled", async () => {
  const app = await openFixture("kobalte-controlled");

  expect(panelText(app, "Content one")).toBe(true);
  expect(panelText(app, "Content two")).toBe(false);
  expect(expandedCalls(app)).toHaveLength(0);

  await trigger(app, TRIGGER_TWO);

  expect(expandedCalls(app)).toHaveLength(1);
  expect(expandedCalls(app)[0][0]).toEqual(["two"]);
  expect(panelText(app, "Content one")).toBe(true);
  expect(panelText(app, "Content two")).toBe(false);
  expect(expandedCalls(app)).toHaveLength(1);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:214
// Rewritten port (port sheet T-023): the first press expands the first item,
// the second press replaces it. Upstream's commented-out "content one is gone"
// is a real assertion here.
test("T-023 should toggle between different accordion items when clicking a trigger", async () => {
  const app = await openFixture("kobalte-plain");

  await trigger(app, TRIGGER_ONE);

  expect(panelText(app, "Content one")).toBe(true);
  expect(expandedCalls(app)[0][0]).toEqual(["one"]);

  await trigger(app, TRIGGER_TWO);

  expect(panelText(app, "Content one")).toBe(false);
  expect(panelText(app, "Content two")).toBe(true);
  expect(expandedCalls(app)[1][0]).toEqual(["two"]);
  expect(expandedCalls(app)).toHaveLength(2);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:252
// Partial port (port sheet T-025): `onChange` becomes `onExpandedChange`. The
// upstream "pressing the same item again reports nothing" is Kobalte's
// disallowEmptySelection, which HeroUI does not have (port sheet §8), so the
// second half presses the next item instead.
test("T-025 should call 'onExpandedChange' when clicking a trigger", async () => {
  const app = await openFixture("kobalte-plain");

  await trigger(app, TRIGGER_ONE);
  expect(expandedCalls(app)[0][0]).toEqual(["one"]);

  await trigger(app, TRIGGER_TWO);
  expect(expandedCalls(app)[1][0]).toEqual(["two"]);
  expect(expandedCalls(app)).toHaveLength(2);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:276
// Rewritten port (port sheet T-026): HeroUI has no `collapsible` dimension —
// single mode collapses on a second press already, which is what the collapsible
// fixture asserted. The commented-out "content one is gone" is real here.
test("T-026 should toggle the same accordion item when clicking its trigger if collapsible", async () => {
  const app = await openFixture("kobalte-default");

  expect(panelText(app, "Content one")).toBe(true);

  await trigger(app, TRIGGER_ONE);

  expect(panelText(app, "Content one")).toBe(false);
  expect(expandedCalls(app)[0][0]).toEqual([]);

  await trigger(app, TRIGGER_ONE);

  expect(panelText(app, "Content one")).toBe(true);
  expect(expandedCalls(app)[1][0]).toEqual(["one"]);
  expect(expandedCalls(app)).toHaveLength(2);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:327
// Ported (port sheet T-028): with allowsMultipleExpanded both presses keep
// their panel open and the reported set holds both keys.
test("T-028 should expand multiple accordion items when clicking triggers", async () => {
  const app = await openFixture("kobalte-multiple");

  expect(panelText(app, "Content one")).toBe(false);
  expect(panelText(app, "Content two")).toBe(false);

  await trigger(app, TRIGGER_ONE);
  expect(panelText(app, "Content one")).toBe(true);

  await trigger(app, TRIGGER_TWO);
  expect(panelText(app, "Content two")).toBe(true);
  expect(panelText(app, "Content one")).toBe(true);
  expect(expandedCalls(app)[1][0]).toEqual(["one", "two"]);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:350
// Rewritten port (port sheet T-029): multiple mode with a default key, the same
// press twice collapses and reopens it. The commented-out "content one is gone"
// is real here.
test("T-029 should toggle the same accordion item when clicking its trigger if multiple", async () => {
  const app = await openFixture("kobalte-multiple-default");

  expect(panelText(app, "Content one")).toBe(true);

  await trigger(app, TRIGGER_ONE);

  expect(panelText(app, "Content one")).toBe(false);
  expect(expandedCalls(app)[0][0]).toEqual([]);

  await trigger(app, TRIGGER_ONE);

  expect(panelText(app, "Content one")).toBe(true);
  expect(expandedCalls(app)[1][0]).toEqual(["one"]);
  expect(expandedCalls(app)).toHaveLength(2);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:399
// Ported (port sheet T-031): the second key is appended to the set that already
// holds the first.
test("T-031 should call 'onChange' when clicking triggers", async () => {
  const app = await openFixture("kobalte-multiple");

  await trigger(app, TRIGGER_ONE);
  expect(expandedCalls(app)[0][0]).toEqual(["one"]);

  await trigger(app, TRIGGER_TWO);
  expect(expandedCalls(app)[1][0]).toEqual(["one", "two"]);
  expect(expandedCalls(app)).toHaveLength(2);
});
