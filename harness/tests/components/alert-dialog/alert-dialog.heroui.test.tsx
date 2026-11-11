import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for AlertDialog, per port sheet 4b
 * (T-001 … T-003). Every case keeps its upstream file:line above it and its
 * title starts with the port-sheet id.
 *
 * The assertions follow SOP 3.2. `nsh test` has no DOM attribute, computed
 * style or role channel, so the `data-slot` lookups, the `role="alertdialog"`
 * check and the heading role are dropped as partial ports (the sheet names
 * which per row); what stays is the behavior chain: hidden at first, shown by
 * the trigger, the heading and body text are there, and the default dismissal
 * rules hold (Escape blocked, CloseTrigger closes).
 *
 * Presence is read after `waitFor` because a real host applies the close over a
 * frame or two.
 *
 * T-004, T-005, T-006 and T-008 live in `alert-dialog.heroui.web.test.tsx`
 * (the sheet's browser rows) and the Kobalte texts (T-009, T-010) in
 * `alert-dialog.kobalte.test.tsx`.
 */

const BODY = "text:This action cannot be undone.";
const HEADING = "text:Delete project permanently?";
const TRIGGER = "role:button[Delete Project]";
const CLOSE_TRIGGER = "role:button[Close]";

// heroui/packages/react/tests/components/alert-dialog/alert-dialog.test.tsx:33
// Partial port (port sheet T-001): seven `data-slot` assertions and the
// `role="alertdialog"` assertion are deletions (D18; NSH's accessibility role
// surface has no alertdialog, port sheet §8). Kept: absent before opening, the
// trigger opens it, the heading and body are visible, and CloseTrigger closes
// it (the upstream tester's `close()`).
test("T-001 exposes alertdialog role and compound slots", async () => {
  const app = await openScenario("alert-dialog/basic", { clock: {} });

  expect(app.count(BODY)).toBe(0);

  await app.press(TRIGGER);
  expect(app.shows(BODY)).toBe(true);
  expect(app.shows(HEADING)).toBe(true);

  await app.press(CLOSE_TRIGGER);
  await app.waitFor(BODY, { state: "gone" });
  expect(app.shows(BODY)).toBe(false);
});

// heroui/packages/react/tests/components/alert-dialog/alert-dialog.test.tsx:65
// Ported (port sheet T-002): `defaultOpen` shows the dialog; Escape is blocked
// by default (`isKeyboardDismissDisabled` defaults to true), so the dialog is
// still there and the root never reports a close.
test("T-002 supports blocked Escape by default", async () => {
  const app = await openScenario("alert-dialog/default-open", { clock: {} });

  expect(app.shows(BODY)).toBe(true);

  await app.keyboard.press("escape");
  await app.clock!.runFor(20);

  expect(app.shows(BODY)).toBe(true);
  expect(callsOf(app, "openChange").filter((args) => args[0] === false)).toEqual([]);
});

// heroui/packages/react/tests/components/alert-dialog/alert-dialog.test.tsx:80
// Ported (port sheet T-003): the CloseTrigger reports `false` to the root and
// the dialog goes away.
test("T-003 supports closing via CloseTrigger", async () => {
  const app = await openScenario("alert-dialog/default-open", { clock: {} });

  await app.press(CLOSE_TRIGGER);

  const closes = callsOf(app, "openChange").filter((args) => args[0] === false);

  expect(closes).toEqual([[false]]);

  await app.waitFor(BODY, { state: "gone" });
  expect(app.shows(BODY)).toBe(false);
});

// X-001. Evidence: src/components/alert-dialog/alert-dialog-backdrop.tsx:67-68,165-174 —
// the port accepts the public `isExiting` prop but its render values carry only
// `presence.isExiting`, so the prop is silently dropped. HeroUI does the opposite:
// heroui/packages/react/src/components/alert-dialog/alert-dialog.tsx:108-155
// hands `isExiting={isExiting || isExitingProp}` to ModalOverlay, whose render
// props (function children, className, style) therefore all see it.
//
// The scenario renders the overlay open (`defaultOpen`) with `isExiting` false,
// so the false half is the default state, then flips the prop through a Footer
// button. A render value that ignores the prop never leaves "backdrop-idle" /
// [false]; one that tracks it reads [true] on both handlers.
test("X-001 exposes the isExiting prop in the Backdrop render values", async () => {
  const app = await openScenario("alert-dialog/backdrop-render-values", { clock: {} });

  await app.clock!.runFor(20);

  expect(app.shows(HEADING)).toBe(true);
  expect(app.shows("text:backdrop-idle")).toBe(true);
  expect(callsOf(app, "backdropClassName").at(-1)).toEqual([false]);
  expect(callsOf(app, "backdropStyle").at(-1)).toEqual([false]);

  await app.press("role:button[Toggle exiting]");
  await app.waitFor("text:backdrop-exiting");
  await app.clock!.runFor(20);

  expect(app.shows("text:backdrop-exiting")).toBe(true);
  expect(app.shows("text:backdrop-idle")).toBe(false);
  expect(callsOf(app, "backdropClassName").at(-1)).toEqual([true]);
  expect(callsOf(app, "backdropStyle").at(-1)).toEqual([true]);
});
