/*
 * The Windows host gap (loop brief, "Windows keyboard focus"): NSH 0.4.0's
 * Win32 host never gives a non-Input view keyboard focus, so the trigger press
 * does not focus the trigger and the dialog neither receives focus nor returns
 * it on Escape. This case asserts that focus handoff; it runs on the web
 * target, where a press moves focus.
 *
 * The shared file keeps the presence, animation and reopen cases.
 */

import { expect, test } from "nsh/test";
import { callsOf, calls } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

const CONTENT = "text:This is the popover content";

// heroui/packages/react/tests/components/popover/popover.browser.test.tsx:13
// Rewritten port (port sheet T-014): the DOM containment check becomes "the
// Dialog itself received focus". Focus must end on the trigger: a trigger that
// is focused and then blurred would still satisfy a presence count, so the
// last of the trigger's focus events has to be onFocus.
test("T-014 supports focus move into dialog and Escape restore", async () => {
  const app = await openScenario("popover/basic", { platform: "web", clock: {} });

  expect(callsOf(app, "triggerFocus")).toHaveLength(0);

  await app.press("role:button[Open popover]");

  expect(app.shows(CONTENT)).toBe(true);
  expect(callsOf(app, "dialogFocus").length).toBeGreaterThan(0);

  await app.keyboard.press("escape");
  await app.clock!.runFor(120);

  expect(app.count(CONTENT)).toBe(0);

  const focusEvents = calls(app)
    .filter((call) => call.name === "triggerFocus" || call.name === "triggerBlur")
    .map((call) => call.name);

  expect(focusEvents[focusEvents.length - 1]).toBe("triggerFocus");
});
