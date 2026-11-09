import { expect, open, test } from "nsh/test";
import type { ScenarioOptions } from "../../helpers/open-scenario";
import { focusTrail, itemExpandedCalls, panelText } from "../../testers/accordion";

/*
 * HeroUI 3.2.7 regression case for Accordion that needs Tab to move the
 * keyboard focus, per port sheet 4b (T-004).
 *
 * Why this file is `.web.`: NSH 0.4.0's Win32 host gives keyboard focus only to
 * an Input — Tab walks text fields, a click focuses only an Input, `ref.focus()`
 * on a view is a no-op and Return / Space do not activate a focused view
 * (`crates/nsh-platform-windows/src/input.rs:997-1053`, `mount.rs:440`;
 * `crates/nsh-core/src/props.rs:365`). This case starts with Tab on a trigger
 * and then activates it with Return and Space, so a real Windows window cannot
 * drive it. Approved difference "Windows keyboard focus and activation (NSH
 * 0.4.0 host gap)", port sheet section 8. macOS and the web both move focus
 * with Tab, so nothing is hidden on a target where it could work.
 *
 * `nsh/test` cannot read focus or aria-expanded: the fixture records a focus
 * event per trigger and the item's `onExpandedChange`, and the closed panel
 * clips its content off screen.
 */

const TRIGGER_ONE = "How do I place an order?";
const PANEL_ONE = "Browse our products and proceed to checkout.";

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

// heroui/packages/react/tests/components/accordion/accordion.test.tsx:90
// Rewritten port (port sheet T-004): `toHaveFocus` becomes the fixture's focus
// probe, the two aria-expanded assertions become the content checks around the
// keys, and the item's own callback proves the order `true` then `false`.
test("T-004 supports expanding a panel via keyboard (Enter/Space)", async () => {
  const app = await openFixture("default", { platform: "web" });

  await app.keyboard.press("tab");
  expect(focusTrail(app)[0]).toBe("faq-1");
  expect(panelText(app, PANEL_ONE)).toBe(false);

  await app.keyboard.press("enter");
  expect(panelText(app, PANEL_ONE)).toBe(true);

  await app.keyboard.press("space");
  expect(panelText(app, PANEL_ONE)).toBe(false);

  expect(itemExpandedCalls(app)).toEqual([[true], [false]]);
});
