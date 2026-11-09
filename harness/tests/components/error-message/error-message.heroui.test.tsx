import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for ErrorMessage, per port sheet 4b
 * (T-001 … T-003). Upstream renders the component inside TagGroup and asserts
 * `data-slot` / BEM class names; both are dropped by D18, so the visible text,
 * its resolved style and the field registration carry the cases.
 *
 * T-002 and T-003 need the NSH-only fixture: TagGroup is not ported yet, and
 * the `FieldSlotsGate` it relies on has no NSH counterpart. The fixture
 * supplies the same `FieldErrorContext` channel TagGroup would.
 */

// The harness theme's light `danger` token: oklch(0.6532 0.2328 25.74) resolves
// to #ff383cff (theme/hero-nsh.theme.json; the same value the Label unit
// asserts for `text-danger`).
const DANGER = "#ff383cff";

function openCase(name: string) {
  return open("../../../error-message.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: name } },
  });
}

// heroui/packages/react/tests/components/error-message/error-message.test.tsx:18
// Partial port (port sheet T-001): the `data-slot="error-message"` and BEM
// `error-message` class assertions are dropped by D18. Their visible half
// becomes the resolved text style: the message shows with the danger color and
// text-xs (12 points, the Header unit asserts the same size).
test("T-001 should render the error message with its danger text style", async () => {
  const app = await openScenario("error-message/basic");

  expect(app.shows("text:Something went wrong")).toBe(true);

  const style = app.spanStyle("text:Something went wrong");

  expect(style.color).toBe(DANGER);
  expect(style.fontSize).toBe(12);
});

// heroui/packages/react/tests/components/error-message/error-message.test.tsx:28
// Partial port (port sheet T-002): the `data-slot="error-message"` assertion is
// dropped by D18. Upstream proves that TagGroup exposes the errorMessage slot;
// NSH has no slot collection and TagGroup is not ported, so the fixture renders
// the container's `FieldErrorContext` directly. What survives is the visible
// text plus its registration with the field root, the channel that replaces
// `slot="errorMessage"` -> `aria-describedby`.
test("T-002 should render inside a container that exposes the error message slot", async () => {
  const app = await openCase("in-container");

  expect(app.shows("text:Please select at least one category")).toBe(true);
  expect(callsOf(app, "error-message.registered")).toEqual([
    ["Please select at least one category"],
  ]);
});

// heroui/packages/react/tests/components/error-message/error-message.test.tsx:43
// Rewritten port (port sheet T-003): both visibility assertions are kept.
// Upstream flips a TagGroup selection through a row click; TagGroup is not
// ported, so the fixture flips an application signal with a pressable View and
// mounts ErrorMessage conditionally. The component takes no part in the
// decision, exactly as upstream.
test("T-003 should support gating by selection state inside a container", async () => {
  const app = await openCase("gated");

  expect(app.shows("text:Please select at least one category")).toBe(true);

  await app.press("id:clear");
  await app.waitUntil(() => !app.shows("text:Please select at least one category"));

  expect(app.shows("text:Please select at least one category")).toBe(false);
});
