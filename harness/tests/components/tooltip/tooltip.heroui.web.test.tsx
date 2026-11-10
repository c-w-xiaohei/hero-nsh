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

import { expect, open, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

const TIP = "text:Hover tip";

function sameShot(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

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

// No upstream row: the review found that the `Tooltip.Trigger` part had no
// case of its own. React Aria's `useFocusable` makes it a Tab stop, so keyboard
// focus on the part opens its tip, exactly as on the Button trigger of T-007.
test("X-005 opens from the Tooltip.Trigger part on focus", async () => {
  const app = await openScenario("tooltip/trigger", { platform: "web", clock: {} });

  await app.keyboard.press("tab");
  await app.clock!.runFor(20);

  expect(app.shows("text:Trigger tip")).toBe(true);
});

// heroui/packages/styles/components/tooltip.css:10-11,31-37; reviewed
// evidence: the upstream browser test checks entry/exit animation metadata at
// tooltip.browser.test.tsx:30-77. Web screenshots are the available paint
// channel: compare the open resting frame with the in-flight entry and exit
// frames, then the settled closed frame. Distinct pixels prove the opacity and
// transform states actually transition; manual time brackets their duration.
test("T-007/T-008 animate entry and exit paint on the web target", async () => {
  const app = await openScenario("tooltip/basic", { platform: "web", clock: {} });
  const closed = await app.screenshot();

  await app.hover("role:button[Hover me]");
  await app.clock!.runFor(20);
  const entering = await app.screenshot();
  await app.clock!.runFor(180);
  const open = await app.screenshot();
  expect(sameShot(entering, closed)).toBe(false);
  expect(sameShot(open, entering)).toBe(false);

  await app.keyboard.press("escape");
  await app.clock!.runFor(30);
  const exiting = await app.screenshot();
  await app.clock!.runFor(120);
  const gone = await app.screenshot();
  expect(sameShot(exiting, open)).toBe(false);
  expect(sameShot(gone, exiting)).toBe(false);
});

// tmp/vendor/react-spectrum/packages/react-aria-components/src/Tooltip.tsx:194-205;
// positioning props must reach the rendered tooltip; a screenshot comparison
// is used because NSH exposes neither computed styles nor Overlay bounds.
test("X-006 crossOffset changes the rendered tooltip placement", async () => {
  const render = async (variant: string) => {
    const app = await open("../../../tooltip.fixtures.tsx", {
      platform: "web",
      width: 1024,
      height: 768,
      host: { params: { case: "position-props", variant } },
    });
    return app.screenshot();
  };
  expect(sameShot(await render("cross"), await render("default"))).toBe(false);
});

// tmp/vendor/react-spectrum/packages/react-aria-components/src/Tooltip.tsx:194-205;
// arrowBoundaryOffset must alter the arrow's boundary clamp, not be ignored.
test("X-007 arrowBoundaryOffset changes the rendered arrow clamp", async () => {
  const render = async (variant: string) => {
    const app = await open("../../../tooltip.fixtures.tsx", {
      platform: "web",
      width: 1024,
      height: 768,
      host: { params: { case: "position-props", variant } },
    });
    return app.screenshot();
  };
  expect(sameShot(await render("boundary"), await render("default"))).toBe(false);
});
