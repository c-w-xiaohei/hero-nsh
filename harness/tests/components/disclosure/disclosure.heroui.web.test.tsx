import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-only Disclosure keyboard cases. Tab moves the keyboard focus and Return /
 * Space press the focused view on the web target; a real Windows window does
 * not do either (NSH 0.4.0 host gap, "Real hosts" in the loop brief). The
 * component keeps `focusable` and its focus handlers correct on every target;
 * this test just cannot run there yet.
 */

const BODY = "Hidden content revealed on expand.";
const TRIGGER = "role:button[Toggle content]";

function openCase() {
  return open("../../../disclosure.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: "default" } },
  });
}

// heroui/packages/react/tests/components/disclosure/disclosure.test.tsx:61
// Partial port (port sheet T-003): the three `aria-expanded` assertions are
// dropped (no attribute channel). Kept: Tab reaches the trigger (its onFocus
// probe fires), Return shows the body and Space clips it again.
test("T-003 supports expanding via keyboard (Enter/Space)", async () => {
  const app = await openCase();

  await app.keyboard.press("tab");
  expect(callsOf(app, "focus")).toHaveLength(1);

  await app.keyboard.press("enter");
  expect(app.shows(`text:${BODY}`)).toBe(true);

  await app.keyboard.press("space");
  expect(app.shows(`text:${BODY}`)).toBe(false);
});
