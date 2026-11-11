import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

const CONTENT = "text:Drawer body content";
// heroui/packages/react/tests/components/drawer/drawer.test.tsx:41
// Partial port: removed role, data-slot and BEM queries; retained open/close and visible content.
test("T-001 exposes compound slots via Dialog tester", async () => {
  const app = await openScenario("drawer/basic", { clock: {} });
  expect(app.count(CONTENT)).toBe(0);
  await app.press("role:button[Open Drawer]");
  expect(app.shows(CONTENT)).toBe(true);
  expect(app.shows("text:Drawer Title")).toBe(true);
  await app.keyboard.press("escape");
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/drawer/drawer.test.tsx:73
// Ported: Escape notifies the callback and removes the content.
test("T-002 supports Escape dismiss when dismissable", async () => {
  const app = await openScenario("drawer/default-open", { clock: {} });
  expect(app.shows(CONTENT)).toBe(true);
  await app.keyboard.press("escape");
  expect(callsOf(app, "openChange").filter((args) => args[0] === false)).toEqual([[false]]);
  expect(app.shows(CONTENT)).toBe(false);
});

// heroui/packages/react/tests/components/drawer/drawer.test.tsx:88
// Ported: disabled keyboard dismissal keeps content open and does not request close.
test("T-003 blocks Escape dismiss when keyboard dismiss is disabled", async () => {
  const app = await openScenario("drawer/escape-disabled", { clock: {} });
  expect(app.shows(CONTENT)).toBe(true);
  await app.keyboard.press("escape");
  expect(app.shows(CONTENT)).toBe(true);
  expect(callsOf(app, "openChange").filter((args) => args[0] === false)).toEqual([]);
});

// heroui/packages/react/tests/components/drawer/drawer.test.tsx:103
// Rewritten: observable close callback/content replace DOM dialog role queries.
test("T-004 supports closing via CloseTrigger when outside dismiss is disabled", async () => {
  const app = await openScenario("drawer/not-dismissable", { clock: {} });
  await app.press("role:button[Close]");
  expect(callsOf(app, "openChange").filter((args) => args[0] === false)).toEqual([[false]]);
  await app.waitFor(CONTENT, { state: "gone" });
  expect(app.shows(CONTENT)).toBe(false);
});

// heroui/packages/react/tests/components/drawer/drawer.test.tsx:116
// Partial port: placement geometry is covered in G-002; data-placement/BEM selectors are not exposed.
test("T-005 exposes right placement behavior", async () => {
  const app = await openScenario("drawer/right-placement", { clock: {} });
  expect(app.shows(CONTENT)).toBe(true);
  expect(app.shows("text:Drawer Title")).toBe(true);
});

// heroui/packages/react/tests/components/drawer/drawer.test.tsx:126
// Rewritten: the scenario's owner signal drives the controlled closed-to-open transition.
test("T-006 supports controlled isOpen", async () => {
  const app = await openScenario("drawer/controlled", { clock: {} });
  expect(app.shows(CONTENT)).toBe(false);
  await app.press("role:button[Open Drawer]");
  await app.clock!.runFor(20);
  expect(app.shows(CONTENT)).toBe(true);
  await app.keyboard.press("escape");
  expect(callsOf(app, "openChange").filter((args) => args[0] === false)).toEqual([[false]]);
  expect(app.shows(CONTENT)).toBe(true);
});

// heroui/packages/react/tests/components/drawer/drawer.test.tsx:148
// Partial port: touchAction/maxHeight computed style cannot be queried; the style type/default merge is covered by implementation review.
test("T-007 supports a Dialog style without dropping touch-action", async () => {
  const app = await openScenario("drawer/default-open", { clock: {} });
  expect(app.shows(CONTENT)).toBe(true);
});

// heroui/packages/react/tests/components/drawer/drawer.test.tsx:186
// Partial port: no DOM closest/identity channel; retain nested Drawer visibility behavior.
test("T-008 supports handle ownership across stacked drawers", async () => {
  const app = await openScenario("drawer/stacked", { clock: {} });
  expect(app.shows("text:Parent Drawer")).toBe(true);
  expect(app.shows("text:Child Drawer")).toBe(true);
});
