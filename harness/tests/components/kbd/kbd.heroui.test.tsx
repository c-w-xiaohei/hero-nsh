import { expect, test } from "nsh/test";
import { openScenario } from "../../helpers/open-scenario";

// heroui/packages/react/tests/components/kbd/kbd.test.tsx:6
test("T-001 renders abbreviated key and content", async () => {
  const app = await openScenario("kbd/basic");

  expect(app.shows("text:⌘")).toBe(true);
  expect(app.shows("text:K")).toBe(true);
});

// heroui/packages/react/tests/components/kbd/kbd.test.tsx:18
// Rewritten port (port sheet T-002): upstream asserts the abbr's `title`
// attribute, which NSH has no channel for. R-004 maps the same label to the
// host tooltip (and accessibilityHint). The visible channel is asserted:
// resting the pointer on the abbreviation shows "Command". Measured on the
// headless windows platform: the host tooltip enters the view tree after its
// half-second delay, so this is a full port of the observable behavior.
test("T-002 exposes a title label for the abbreviated key", async () => {
  const app = await openScenario("kbd/title");

  await app.hover("text:⌘");
  await app.waitFor("text:Command", { timeout: 2000 });

  expect(app.shows("text:Command")).toBe(true);
});

// heroui/packages/react/src/components/kbd/kbd.tsx:49-51
// Root renders `{children}` directly inside <kbd>, so `<Kbd>Esc</Kbd>` shows
// the bare string. The port must read the root's children through
// renderChildren at the placement inside the Provider: strings and numbers
// become Text instead of disappearing inside a View.
test("X-001 renders bare text and numeric root children", async () => {
  const text = await openScenario("kbd/probe-root-text");
  expect(text.shows("text:Esc")).toBe(true);

  const numeric = await openScenario("kbd/probe-numeric");
  expect(numeric.shows("text:42")).toBe(true);
});
