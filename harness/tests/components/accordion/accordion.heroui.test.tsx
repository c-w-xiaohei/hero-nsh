import { expect, open, test } from "nsh/test";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { expandedCalls, itemExpandedCalls, panelText, trigger } from "../../testers/accordion";

/*
 * HeroUI 3.2.7 regression cases for Accordion, per port sheet 4b
 * (T-003 … T-008).
 *
 * Class strings and `data-*` attributes are D18 deletions, so the cases that
 * asserted `data-slot`, the BEM block or `data-expanded` (T-001, T-002, T-009,
 * T-010) have no case here. The aria-expanded assertions become what a user
 * sees: the panel content is on screen while the item is open and clipped away
 * while it is closed. The keyboard case T-004 lives in
 * accordion.heroui.web.test.tsx, because NSH 0.4.0's Win32 host moves focus
 * with Tab on macOS and the web only (approved difference, port sheet §8).
 */

const TRIGGER_ONE = "How do I place an order?";
const TRIGGER_TWO = "Can I modify my order?";
const TRIGGER_DISABLED = "Disabled question";

const PANEL_ONE = "Browse our products and proceed to checkout.";
const PANEL_TWO = "Yes, before it ships.";
const PANEL_DISABLED = "Never shown.";

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

// heroui/packages/react/tests/components/accordion/accordion.test.tsx:76
// Rewritten port (port sheet T-003): the two aria-expanded assertions become
// the content checks before and after the press; the callback payload is read
// from the fixture's group probe.
test("T-003 supports expanding a panel via its trigger", async () => {
  const app = await openFixture("default");

  expect(panelText(app, PANEL_ONE)).toBe(false);
  expect(expandedCalls(app)).toHaveLength(0);

  await trigger(app, TRIGGER_ONE);

  expect(panelText(app, PANEL_ONE)).toBe(true);
  expect(expandedCalls(app)[0][0]).toEqual(["faq-1"]);
});

// heroui/packages/react/tests/components/accordion/accordion.test.tsx:106
// Ported (port sheet T-005): the second press replaces the first key, so the
// first panel closes as the second opens.
test("T-005 supports single expanded item by default", async () => {
  const app = await openFixture("default");

  await trigger(app, TRIGGER_ONE);
  await trigger(app, TRIGGER_TWO);

  const changes = expandedCalls(app);

  expect(changes[changes.length - 1][0]).toEqual(["faq-2"]);
  expect(panelText(app, PANEL_ONE)).toBe(false);
  expect(panelText(app, PANEL_TWO)).toBe(true);
});

// heroui/packages/react/tests/components/accordion/accordion.test.tsx:120
// Ported (port sheet T-006): with allowsMultipleExpanded the first item stays
// open and the reported set holds both keys.
test("T-006 supports multiple expanded items with allowsMultipleExpanded", async () => {
  const app = await openFixture("multiple");

  await trigger(app, TRIGGER_ONE);
  await trigger(app, TRIGGER_TWO);

  const changes = expandedCalls(app);

  expect(panelText(app, PANEL_ONE)).toBe(true);
  expect(panelText(app, PANEL_TWO)).toBe(true);
  expect(changes[changes.length - 1][0]).toEqual(["faq-1", "faq-2"]);
});

// heroui/packages/react/tests/components/accordion/accordion.test.tsx:133
// Ported (port sheet T-007): the fixture flattens the reported `Set` into an
// array, so the payload is exactly the keys the group reports.
test("T-007 calls onExpandedChange with the expanded keys", async () => {
  const app = await openFixture("default");

  await trigger(app, TRIGGER_ONE);

  expect(expandedCalls(app)[0][0]).toEqual(["faq-1"]);
});

// heroui/packages/react/tests/components/accordion/accordion.test.tsx:143
// Rewritten port (port sheet T-008): `toBeDisabled` becomes `enabled()`, the
// rejected press proves the host blocks it, and aria-expanded becomes the panel
// content check. No callback runs, at the group or at the item.
test("T-008 supports disabled items without expanding", async () => {
  const app = await openFixture("default");
  const disabledTrigger = `role:button[${TRIGGER_DISABLED}]`;

  expect(app.enabled(disabledTrigger)).toBe(false);

  await expect(app.press(disabledTrigger)).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(panelText(app, PANEL_DISABLED)).toBe(false);
  expect(expandedCalls(app)).toHaveLength(0);
  expect(itemExpandedCalls(app)).toHaveLength(0);
});
