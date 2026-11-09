import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only CloseButton cases: they move the keyboard focus with Tab, which the
 * web target does and the Windows window does not ("Real hosts" in the loop
 * brief). Keeping them in a `.web.` file is what lets the Windows run skip
 * them without weakening the assertion anywhere.
 *
 * T-010 is the ported focus-visible case. X-001 / X-002 cover `isPending`,
 * which port sheet 4b listed no case for: RAC's contract is focusable while
 * press and hover are blocked, and NSH only keeps that if pending stays out of
 * `accessibilityState.disabled`.
 */

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:129
// Rewritten port (port sheet T-010): `data-focus-visible` is not projected, so
// the case reads the public focus callbacks and the render prop that drives the
// ring. Tab focuses the button (onFocus, then onFocusChange(true), and the
// render prop switches to "Focus visible"); the next Tab blurs it (onBlur,
// onFocusChange(false), back to "Close"). The ring itself is paint, checked
// against R-006.
test("T-010 supports focus-visible via keyboard", async () => {
  const app = await openScenario("close-button/focus.split", { platform: "web" });

  expect(app.shows("text:Close")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocus")).toHaveLength(1);
  expect(callsOf(app, "onFocusChange")).toEqual([[true]]);
  expect(app.shows("text:Focus visible")).toBe(true);

  await app.keyboard.press("tab");
  expect(callsOf(app, "onBlur")).toHaveLength(1);
  expect(callsOf(app, "onFocusChange")).toEqual([[true], [false]]);
  expect(app.shows("text:Close")).toBe(true);
});

/*
 * Pending is a Tab stop: RAC's `isPending` "disables press and hover events
 * while retaining focusability" (react-aria-components/src/Button.tsx:89-93;
 * port sheet §1.2, §2 and R-008 say the same). NSH drops a view whose
 * `accessibilityState.disabled` is true from the focus system, so reporting
 * pending there removed it from the Tab order and from `autoFocus`.
 *
 * Regression evidence: src/components/close-button/close-button-root.tsx:342-352
 * (measured before the fix: Tab skipped the pending button — the next button
 * took focus, pending onFocus 0 / other 1 — and autoFocus never fired onFocus).
 */
test("X-001 isPending keeps the Tab stop and autoFocus while press and hover stay blocked", async () => {
  const app = await openScenario("close-button/pending.split", { platform: "web" });

  // autoFocus on a pending button: the mount effect still calls focus().
  await app.wait(100);
  expect(callsOf(app, "onFocusAuto")).toHaveLength(1);
  expect(callsOf(app, "onBlurAuto")).toHaveLength(0);

  // First Tab: the second pending button is a stop like any other, and the
  // auto-focused one blurs.
  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocusTab")).toHaveLength(1);
  expect(callsOf(app, "onBlurAuto")).toHaveLength(1);

  // Second Tab: focus moves past it, so it sits in the middle of the order.
  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocusOther")).toHaveLength(1);
  expect(callsOf(app, "onBlurTab")).toHaveLength(1);

  await app.press("role:button[Pending close]");
  expect(callsOf(app, "onPress")).toHaveLength(0);

  await app.hover("role:button[Pending close]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(0);
  expect(callsOf(app, "onHoverChange")).toHaveLength(0);
});

/*
 * The look half of the same contract: a pending button keeps the blocked look
 * and gets no hover look. The render prop is what drives those classes, and
 * the plain `Other` button proves hover really works in this app, so
 * "Pending: idle" cannot pass by accident. The opacity 0.5 / not-allowed /
 * pointer-events-none declarations themselves are paint, checked against R-008.
 */
test("X-002 isPending blocks press, hover and the hover look", async () => {
  const app = await openScenario("close-button/pending.split", { platform: "web" });

  expect(app.shows("text:Pending: idle")).toBe(true);

  await app.press("role:button[Pending close]");
  expect(callsOf(app, "onPress")).toHaveLength(0);

  await app.hover("role:button[Pending close]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(0);
  expect(callsOf(app, "onHoverChange")).toHaveLength(0);
  expect(app.shows("text:Pending: idle")).toBe(true);

  // The control: the same step on a plain button does enter hover.
  await app.hover("role:button[Other close]");
  expect(callsOf(app, "onHoverStartOther")).toHaveLength(1);
});
