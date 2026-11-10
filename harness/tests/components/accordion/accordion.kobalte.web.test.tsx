import { expect, open, test } from "nsh/test";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { focusTrail, itemExpandedCalls, panelText } from "../../testers/accordion";

/*
 * Kobalte 0.13.14 regression cases for Accordion that need Tab to move the
 * keyboard focus and Return to activate it, ported to HeroUI's API and to NSH's
 * view model, per port sheet 4b (T-022, T-027, T-030).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). Every case here moves focus with Tab, so
 * a real Windows window cannot drive them. Approved difference "Windows keyboard
 * focus and activation (NSH 0.4.0 host gap)", port sheet section 8. macOS and
 * the web both move focus with Tab; the pointer cases stay in
 * accordion.kobalte.test.tsx.
 *
 * `document.activeElement` has no query, so the fixture records a focus event
 * per trigger and `kobalte-plain` puts a pressable station after the accordion:
 * Tab off the last trigger lands there, which is how "focus left the group" is
 * observable instead of being an absent event.
 */

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

// kobalte/packages/core/src/accordion/accordion.test.tsx:184
// Rewritten port (port sheet T-022): the focus trail replaces
// `document.activeElement`, and a pressable station after the accordion stands
// in for "focus is on none of the three items". Kobalte's `autoFocus` start is
// the first Tab, since NSH focuses nothing before it.
test("T-022 allows users to navigate accordion headers through the tab key", async () => {
  const app = await openFixture("kobalte-plain", { platform: "web" });

  await app.keyboard.press("tab");
  expect(focusTrail(app)).toEqual(["one"]);

  await app.keyboard.press("tab");
  expect(focusTrail(app)).toEqual(["one", "two"]);

  await app.keyboard.press("shift+tab");
  expect(focusTrail(app)).toEqual(["one", "two", "one"]);

  await app.keyboard.press("tab");
  expect(focusTrail(app)).toEqual(["one", "two", "one", "two"]);

  await app.keyboard.press("tab");
  expect(focusTrail(app)).toEqual(["one", "two", "one", "two", "three"]);

  await app.keyboard.press("tab");

  const left = focusTrail(app);

  expect(left).toHaveLength(6);
  expect(left[5]).not.toBe("one");
  expect(left[5]).not.toBe("two");
  expect(left[5]).not.toBe("three");

  await app.keyboard.press("shift+tab");
  expect(focusTrail(app)).toEqual(["one", "two", "one", "two", "three", "after", "three"]);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:296
// Rewritten port (port sheet T-027): single mode already collapses on a second
// press, so no `collapsible` prop is needed. aria-expanded becomes the content
// check and `document.activeElement` the focus probe; the commented-out "content
// one is gone" is a real assertion here.
test("T-027 should allows users to open and close accordion item with enter / space key if collapsible", async () => {
  const app = await openFixture("kobalte-default", { platform: "web" });

  await app.keyboard.press("tab");

  expect(panelText(app, "Content one")).toBe(true);
  expect(focusTrail(app)).toEqual(["one"]);

  await app.keyboard.press("enter");

  expect(panelText(app, "Content one")).toBe(false);
  expect(itemExpandedCalls(app)[0][0]).toBe(false);

  await app.keyboard.press("enter");

  expect(panelText(app, "Content one")).toBe(true);
  expect(itemExpandedCalls(app)[1][0]).toBe(true);
  expect(itemExpandedCalls(app)).toHaveLength(2);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:370
// Rewritten port (port sheet T-030): the same with allowsMultipleExpanded. The
// item's own callback reports the boolean; the commented-out "content one is
// gone" is a real assertion here.
test("T-030 should allows users to open and close accordion item with enter / space key if multiple", async () => {
  const app = await openFixture("kobalte-multiple-default", { platform: "web" });

  await app.keyboard.press("tab");

  expect(panelText(app, "Content one")).toBe(true);
  expect(focusTrail(app)).toEqual(["one"]);

  await app.keyboard.press("enter");

  expect(panelText(app, "Content one")).toBe(false);
  expect(itemExpandedCalls(app)[0][0]).toBe(false);

  await app.keyboard.press("enter");

  expect(panelText(app, "Content one")).toBe(true);
  expect(itemExpandedCalls(app)[1][0]).toBe(true);
  expect(itemExpandedCalls(app)).toHaveLength(2);
});
