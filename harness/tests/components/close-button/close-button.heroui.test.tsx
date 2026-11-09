import { expect, open, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * HeroUI 3.2.7 regression cases for CloseButton, per port sheet 4b
 * (T-001 … T-003, T-005 … T-007, T-009, T-011, T-012).
 *
 * T-004 is deleted there: it reads a label the React Aria `ButtonContext`
 * provider supplies, and NSH has no Provider slots. T-005 keeps only its
 * explicit-label half for the same reason. The cases that read `data-hovered`,
 * `data-pressed`, `data-focus-visible` or BEM classes observe the same state
 * through the public callbacks and render props instead (D18).
 *
 * The press-hold case (T-008) uses `dragAndHold` and lives in the `.headless.`
 * file; the keyboard-focus case (T-010) moves focus with Tab and lives in the
 * `.web.` file ("Real hosts" in the loop brief).
 */

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:29
test("T-001 renders with default Close accessible name", async () => {
  const app = await openScenario("close-button/basic");

  expect(app.shows("role:button[Close]")).toBe(true);
});

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:35
// Partial port (port sheet T-002): upstream also asserts the BEM block class
// and `data-slot="close-button"`, which D18 drops. The default icon stays: it
// is the sub-part the third assertion checks, identified by its own testID. A
// missing icon or a second one fails it.
test("T-002 exposes the default icon sub-part", async () => {
  const app = await openScenario("close-button/basic");

  expect(app.shows("id:close-button-icon")).toBe(true);
  expect(app.count("id:close-button-icon")).toBe(1);
});

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:44
test("T-003 supports overriding aria-label", async () => {
  const app = await openScenario("close-button/label");

  expect(app.shows("role:button[Dismiss dialog]")).toBe(true);
});

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:71
// Partial port (port sheet T-005): upstream compares an explicit label with a
// label the ButtonContext slot supplies. NSH has no Provider slots, so the
// shared scenario passes `slot` (a HeroUI prop) with an explicit label and the
// case keeps the half that is observable: the explicit label wins over the
// default "Close". A dropped label falls back to "Close" and fails it.
test("T-005 prefers an explicit aria-label", async () => {
  const app = await openScenario("close-button/slot");

  expect(app.shows("role:button[Dismiss]")).toBe(true);
});

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:92
// Rewritten port (port sheet T-006): `data-testid` is not projected, so the
// NSH-only fixture puts `testID="close"` on the root instead.
test("T-006 supports a test identity on the root", async () => {
  const app = await open("../../../close-button.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: "attributed" } },
  });

  expect(app.shows("id:close")).toBe(true);
});

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:98
// Rewritten port (port sheet T-007): `data-hovered` is not projected. The
// public hover callbacks carry the same state: the pointer enters once, then
// moves to the other button and the first one leaves. The background change
// itself is paint, checked against R-014.
test("T-007 supports hover state", async () => {
  const app = await openScenario("close-button/hover");

  await app.hover("role:button[Close]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(1);
  expect(callsOf(app, "onHoverChange")).toEqual([[true]]);

  await app.hover("role:button[Other]");
  expect(callsOf(app, "onHoverEnd")).toHaveLength(1);
  expect(callsOf(app, "onHoverChange")).toEqual([[true], [false], [true]]);
});

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:120
test("T-009 calls onPress on click", async () => {
  const app = await openScenario("close-button/press");

  await app.press("role:button[Close]");
  expect(callsOf(app, "onPress")).toHaveLength(1);
});

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:138
// Rewritten port (port sheet T-011): `toBeDisabled()` becomes `enabled()`, and
// the `data-disabled` attribute's observable meaning is the same disabled
// state. `user.click` becomes `app.press`, which the host rejects because the
// view is disabled; the probe then proves `onPress` never ran. All three
// upstream assertions stay.
test("T-011 supports disabled state and blocks press", async () => {
  const app = await openScenario("close-button/disabled");

  expect(app.enabled("role:button[Close]")).toBe(false);

  await expect(app.press("role:button[Close]")).rejects.toMatchObject({
    code: "ERR_NSH_TEST_DISABLED",
  });

  expect(callsOf(app, "onPress")).toHaveLength(0);
});

// heroui/packages/react/tests/components/close-button/close-button.test.tsx:151
// Rewritten port (port sheet T-012): `data-hovered` is not projected, so the
// case reads the public callback. RAC's useHover does not enter while the
// button is disabled, and the implementation returns before setting the state.
test("T-012 exposes no hover state when disabled", async () => {
  const app = await openScenario("close-button/disabled");

  await app.hover("role:button[Close]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(0);
});
