/*
 * Tooltip's focus-open case runs on the web target only: NSH 0.4.0's Win32
 * host never gives a non-Input view keyboard focus and Tab walks text fields
 * only (loop brief, "Windows keyboard focus"), so the trigger would never be
 * focused and the tooltip could not open there. On the web target Tab moves
 * focus to the trigger Button, which is exactly what the upstream browser case
 * did with `.focus()`.
 *
 * The hover, closeDelay, disabled, arrow and Escape cases stay in the shared
 * tooltip.heroui.test.tsx.
 */

import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

const TIP = "text:Hover tip";

// heroui/packages/react/tests/components/tooltip/tooltip.browser.test.tsx:30
// Partial port (port sheet T-007): `animationName` and the animated-properties
// list have no NSH query (no computed style, no `getAnimations()`). The
// behavior the animation belongs to is kept: keyboard focus opens the tooltip.
test("T-007 opens on focus", async () => {
  const app = await openScenario("tooltip/basic", { platform: "web", clock: {} });

  await app.keyboard.press("tab");
  await app.clock!.runFor(20);

  expect(app.shows(TIP)).toBe(true);
});
