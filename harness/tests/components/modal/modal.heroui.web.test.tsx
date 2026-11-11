/*
 * Web-only Modal cases. The port sheet puts the browser suite (T-004 … T-007)
 * on `--target web`: their upstream assertions read focus state, scroll lock
 * and CSS animations, and the kept behavior is the same open/close chain that
 * those states ride on. Nothing here asserts focus, so the Windows host gap
 * (NSH 0.4.0 gives no keyboard focus to a non-Input view) is not the reason
 * for the target; the sheet's run matrix is.
 *
 * The retained-content case drives the backdrop's controlled `isOpen` from two
 * buttons, which is the NSH way to do what upstream does with `rerender`.
 */

import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

const CONTENT = "text:Modal body content";

// heroui/packages/react/tests/components/modal/modal.browser.test.tsx:16
// Partial port (port sheet T-004): the two node-identity assertions
// (`toBe(backdrop)` / `toBe(container)`) and the four `expect.poll` reads
// (animation count, computed `opacity` 0.8 / 0.9) have no channel in
// `nsh test`. Kept: the content is visible, closing hides it, reopening brings
// it back.
test("T-004 supports reopening a retained backdrop and container with their original opacity", async () => {
  const app = await openScenario("modal/retained", { platform: "web", clock: {} });

  expect(app.shows("text:Retained content")).toBe(true);

  await app.press("role:button[Hide retained]");
  await app.waitFor("text:Retained content", { state: "gone" });

  await app.press("role:button[Retained opener]");
  expect(app.shows("text:Retained content")).toBe(true);
});

// heroui/packages/react/tests/components/modal/modal.browser.test.tsx:40
// Partial port (port sheet T-005): the four focus / scroll-lock assertions
// (`isDocumentScrollLocked()` twice, `dialog.element().contains(activeElement)`
// twice, `toHaveFocus` once) belong to the host and cannot be queried. Kept:
// the trigger opens the dialog and Escape closes it.
test("T-005 supports focus trap, scroll lock, and Escape focus restore", async () => {
  const app = await openScenario("modal/basic", { platform: "web", clock: {} });

  await app.press("role:button[Open modal]");
  expect(app.shows(CONTENT)).toBe(true);

  await app.keyboard.press("escape");
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/modal/modal.browser.test.tsx:63
// Partial port (port sheet T-006): upstream has no bare `expect(` here — all
// three assertions are chained. Kept: the dialog shows after the trigger, is
// gone after CloseTrigger. Dropped: the trigger's `toHaveFocus`, which
// `nsh test` cannot query (port sheet §5.6, §8).
test("T-006 supports focus restore after CloseTrigger", async () => {
  const app = await openScenario("modal/basic", { platform: "web", clock: {} });

  await app.press("role:button[Open modal]");
  expect(app.shows(CONTENT)).toBe(true);

  await app.press("role:button[Close]");
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/modal/modal.browser.test.tsx:80
// Partial port (port sheet T-007): the four animation assertions (container
// `animationName` matching /^heroui-overlay-enter-105/, container animated
// properties `["opacity","transform"]`, backdrop `animationName`, backdrop
// properties `["opacity"]`) need `getAnimations` and computed styles. The
// entering phase is the host Dialog's fade plus our classList, with no CSS
// keyframes to read. Kept: the dialog appears after the trigger press.
test("T-007 opens with an opacity and transform only animation", async () => {
  const app = await openScenario("modal/basic", { platform: "web", clock: {} });

  await app.press("role:button[Open modal]");

  expect(app.shows(CONTENT)).toBe(true);
  expect(app.shows("text:Welcome")).toBe(true);
});
