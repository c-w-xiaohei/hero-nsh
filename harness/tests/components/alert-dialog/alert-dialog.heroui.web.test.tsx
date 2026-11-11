/*
 * Web-only AlertDialog cases (port sheet 4b: T-004 … T-006, T-008). The sheet
 * puts the browser suite on `--target web`: their upstream assertions read
 * focus state, document scroll lock and computed animations, and the kept
 * behavior is the open/close chain those states ride on. Nothing here asserts
 * focus, so the Windows host gap (NSH 0.4.0 gives no keyboard focus to a
 * non-Input view) is not the reason for the target; the sheet's run matrix is.
 *
 * T-007 ("opens with an opacity and transform only animation") is a 转截图 row:
 * animationName and animated-property lists are computed style / Web Animation
 * API reads, which `nsh test` has no channel for. It produces no test.
 */

import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

const BODY = "text:This action cannot be undone.";
const HEADING = "text:Delete project permanently?";
const TRIGGER = "role:button[Delete Project]";
const CLOSE_TRIGGER = "role:button[Close]";

// heroui/packages/react/tests/components/alert-dialog/alert-dialog.test.tsx:93
// Ported (port sheet T-004): with `isKeyboardDismissDisabled={false}` Escape
// reaches the native Dialog, the root reports `false`, and the dialog goes.
test("T-004 supports Escape dismiss when keyboard dismiss is enabled", async () => {
  const app = await openScenario("alert-dialog/keyboard-dismiss", {
    platform: "web",
    clock: {},
  });

  expect(app.shows(BODY)).toBe(true);

  await app.keyboard.press("escape");

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toEqual([[false]]);

  await app.waitFor(BODY, { state: "gone" });
  expect(app.shows(BODY)).toBe(false);
});

// heroui/packages/react/tests/components/alert-dialog/alert-dialog.browser.test.tsx:14
// Partial port (port sheet T-005): `isDocumentScrollLocked()`, the two
// `activeElement` containment checks and the Tab step are host / DOM reads with
// no `nsh test` channel (§8: focus trap, focus restore and scroll lock belong
// to the native layer). Kept: the trigger opens the dialog.
test("T-005 supports focus trap and scroll lock while open", async () => {
  const app = await openScenario("alert-dialog/basic", { platform: "web", clock: {} });

  await app.press(TRIGGER);

  expect(app.shows(BODY)).toBe(true);
  expect(app.shows(HEADING)).toBe(true);
});

// heroui/packages/react/tests/components/alert-dialog/alert-dialog.browser.test.tsx:29
// Partial port (port sheet T-006): the trigger's `toHaveFocus` and the
// `isDocumentScrollLocked() === false` check are the host's focus and document
// state (§8). Kept: the trigger opens the dialog, Escape leaves it open
// (default `isKeyboardDismissDisabled`), and CloseTrigger closes it.
test("T-006 supports blocked Escape and CloseTrigger with focus restore", async () => {
  const app = await openScenario("alert-dialog/basic", { platform: "web", clock: {} });

  await app.press(TRIGGER);
  expect(app.shows(BODY)).toBe(true);

  await app.keyboard.press("escape");
  await app.clock!.runFor(20);
  expect(app.shows(BODY)).toBe(true);

  await app.press(CLOSE_TRIGGER);
  await app.waitFor(BODY, { state: "gone" });
  expect(app.shows(BODY)).toBe(false);
});

// heroui/packages/react/tests/components/alert-dialog/alert-dialog.browser.test.tsx:69
// Partial port (port sheet T-008): `data-exiting`, `animationFillMode` and the
// keyframe properties are DOM / computed-style reads and are deleted. Kept, as
// the sheet asks: the dialog is still on screen while it closes, and gone once
// the exit has run — presence read with the manual clock, which is the
// observable an exit hold carries. Read against the parts as they stand, the
// layer leaves within a frame of the close (measured on the web target), so the
// holding half is the component side of this row, not the test's.
test("T-008 keeps the backdrop mounted until the container finishes closing", async () => {
  const app = await openScenario("alert-dialog/default-open", {
    platform: "web",
    clock: {},
  });

  expect(app.shows(BODY)).toBe(true);

  await app.press(CLOSE_TRIGGER);
  await app.clock!.runFor(20);

  expect(app.shows(BODY)).toBe(true);
  expect(app.count(HEADING)).toBe(1);

  await app.clock!.runFor(300);

  expect(app.shows(BODY)).toBe(false);
  expect(app.count(HEADING)).toBe(0);
});
