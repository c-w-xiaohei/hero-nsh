import { expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only Kobalte concertina cases (port sheet T-044, T-047): the focus step
 * is a real Tab and the activation is Return on the focused trigger, which only
 * the web target does (NSH 0.4.0 Windows host gap, "Real hosts" in the loop
 * brief). Every other step matches the sibling `disclosure-group.kobalte`
 * cases.
 */

const ONE = "role:button[Trigger one]";
const CONTENT_ONE = "text:Content one";

function openCase(name: string): Promise<App> {
  return open("../../../disclosure.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// kobalte/packages/core/src/accordion/accordion.test.tsx:296
// Partial port (port sheet T-044): `collapsible` does not exist in HeroUI
// (single mode always collapses), so the fixture omits it. Two `aria-expanded`
// assertions are dropped; kept: the focus probe, Return clipping the body
// (including the source's commented-out "closed is not visible"), and Return
// showing it again.
test("T-044 opens and closes an item with Return", async () => {
  const app = await openCase("group-three-expanded");

  expect(app.shows(CONTENT_ONE)).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "focus")).toEqual([["one"]]);

  await app.keyboard.press("enter");
  expect(app.shows(CONTENT_ONE)).toBe(false);

  await app.keyboard.press("enter");
  expect(app.shows(CONTENT_ONE)).toBe(true);
});

// kobalte/packages/core/src/accordion/accordion.test.tsx:370
// Partial port (port sheet T-047): the multiple-mode twin of T-044, with the
// same two dropped `aria-expanded` assertions.
test("T-047 opens and closes an item with Return in multiple mode", async () => {
  const app = await openCase("group-three-multiple-expanded");

  expect(app.shows(CONTENT_ONE)).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "focus")).toEqual([["one"]]);

  await app.keyboard.press("enter");
  expect(app.shows(CONTENT_ONE)).toBe(false);

  await app.keyboard.press("enter");
  expect(app.shows(CONTENT_ONE)).toBe(true);
});
