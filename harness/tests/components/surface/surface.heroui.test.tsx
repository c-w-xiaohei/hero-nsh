import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

// heroui/packages/react/tests/components/surface/surface.test.tsx:6
// Port (port sheet T-001): a bare string child must be wrapped in Text inside
// the Surface root, otherwise the View draws nothing.
test("T-001 should render children content", async () => {
  const app = await openScenario("surface/basic");
  expect(app.shows("text:Panel content")).toBe(true);
});

// heroui/packages/react/tests/components/surface/surface.test.tsx:12
// Partial port (port sheet T-002): the upstream case also asserts data-slot and
// the BEM block class, which D18 drops. The block's visible effect is its
// `text-foreground`; the transparent variant only sets a background, so its
// text color can only come from the base. The light theme's foreground token is
// oklch(0.2103 0.0059 285.89), which resolves to #18181bff.
test("T-002 should paint the transparent variant with the base text color", async () => {
  const app = await openScenario("surface/variants");
  expect(app.spanStyle("text:Transparent surface").color).toBe("#18181bff");
});

// Ref forwarding regression: this scenario passes no ref to Surface. NSH treats
// a plain `ref={local.ref}` with an undefined value as a ref store, which throws
// at mount on the web target and leaves the page empty (headless hides it). The
// forwarded callback ref renders the same children on every target.
test("X-002 renders a ref-less Surface on a real engine", async () => {
  const app = await openScenario("surface/basic");

  expect(app.shows("text:Panel content")).toBe(true);
});
