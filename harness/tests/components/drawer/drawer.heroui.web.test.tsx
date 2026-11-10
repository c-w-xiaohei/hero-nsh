/* Web-only: upstream browser cases require a web target; unsupported animation,
 * pointer capture, focus and document scroll-lock inspections are stated per case. */
import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

const CONTENT = "text:Drawer body content";

// heroui/packages/react/tests/components/drawer/drawer.browser.test.tsx:19
// Partial port: animationName and computed translate are unavailable; assert the visible open state.
test("T-009 runs the enter animation when the drawer opens", async () => {
  const app = await openScenario("drawer/basic", { platform: "web", clock: {} });
  await app.press("role:button[Open Drawer]");
  expect(app.shows(CONTENT)).toBe(true);
});

// heroui/packages/react/tests/components/drawer/drawer.browser.test.tsx:48
// Partial port for pointercancel variant: nsh/test cannot dispatch pointer events or inspect bounds/transitions.
test("T-010 recovers when pointercancel interrupts a drag", async () => {
  const app = await openScenario("drawer/default-open", { platform: "web", clock: {} });
  expect(app.shows(CONTENT)).toBe(true);
  expect(callsOf(app, "openChange").filter((args) => args[0] === false)).toEqual([]);
});

// heroui/packages/react/tests/components/drawer/drawer.browser.test.tsx:48
// Partial port for lostpointercapture variant: pointer capture and gesture sequences are not controllable in nsh/test.
test("T-010 recovers when lostpointercapture interrupts a drag", async () => {
  const app = await openScenario("drawer/default-open", { platform: "web", clock: {} });
  expect(app.shows(CONTENT)).toBe(true);
  expect(callsOf(app, "openChange").filter((args) => args[0] === false)).toEqual([]);
});

// heroui/packages/react/tests/components/drawer/drawer.browser.test.tsx:101
// Partial port: no synthetic child pointer-capture loss or per-frame transform/bounds query.
test("T-011 supports an in-progress drag when a child loses pointer capture", async () => {
  const app = await openScenario("drawer/default-open", { platform: "web", clock: {} });
  expect(app.shows(CONTENT)).toBe(true);
});

// heroui/packages/react/tests/components/drawer/drawer.browser.test.tsx:147
// Partial port: focus containment/restore and document scroll lock are host-owned and have no nsh/test query.
test("T-012 supports focus trap, scroll lock, and Escape focus restore", async () => {
  const app = await openScenario("drawer/basic", { platform: "web", clock: {} });
  await app.press("role:button[Open Drawer]");
  expect(app.shows(CONTENT)).toBe(true);
  await app.keyboard.press("escape");
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/drawer/drawer.browser.test.tsx:170
// Partial port: drag gesture and CSS transition animation are outside nsh/test's event/style surface.
test("T-013 runs the exit transition after a swipe-to-dismiss", async () => {
  const app = await openScenario("drawer/default-open", { platform: "web", clock: {} });
  expect(app.shows(CONTENT)).toBe(true);
});
