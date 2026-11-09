import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only Pagination case: it moves the keyboard focus with Tab, which the
 * web target does and the Windows window does not ("Real hosts" in the loop
 * brief). Nothing here is hidden from Windows by narrowing it: the pending
 * contract lives in RAC's Button, which every host implements the same way.
 *
 * X-001 covers `isPending`, which port sheet 4b listed no case for: RAC says
 * it blocks press and hover while keeping the button focusable, and reports
 * the value through the render props (react-aria-components/src/Button.tsx:
 * 89-93, 111-125). Pagination.Page reuses that contract.
 */

// src/components/pagination/create-pagination-pressable.ts:131
// src/components/pagination/pagination-button.tsx:53-136
// Measured before the fix: a pending link fired onPress, onHoverStart and
// onHoverChange, and its children function always received `isPending` false,
// because createPaginationPressable hard-coded `isPending: () => false`.
// Pending must stay out of `accessibilityState.disabled`: a disabled view is
// dropped from the focus system, so the pending link would lose the Tab stop
// and the autoFocus effect (close-button-root.tsx:198-199 is the same rule).
test("X-001 isPending blocks press and hover, keeps the Tab stop, and reaches the render props", async () => {
  const app = await openScenario("pagination/pending.split", { platform: "web" });

  // The render prop reads the prop, not a constant: both pending links show
  // "Pending" while the plain link below is not under test here.
  expect(app.shows("text:Pending: idle")).toBe(true);

  // autoFocus on a pending view: the mount effect still calls focus().
  await app.wait(100);
  expect(callsOf(app, "onFocusAuto")).toHaveLength(1);
  expect(callsOf(app, "onBlurAuto")).toHaveLength(0);

  // First Tab: the pending Previous is a stop like any other, and the
  // auto-focused pending link blurs.
  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocusPrev")).toHaveLength(1);
  expect(callsOf(app, "onBlurAuto")).toHaveLength(1);

  // Second Tab: focus moves past the pending ones, so they sit in the order.
  await app.keyboard.press("tab");
  expect(callsOf(app, "onFocusOther")).toHaveLength(1);
  expect(callsOf(app, "onBlurPrev")).toHaveLength(1);

  await app.press("role:button[Pending page]");
  expect(callsOf(app, "onPress")).toHaveLength(0);

  await app.press("role:button[Pending previous]");
  expect(callsOf(app, "onPressPrevious")).toHaveLength(0);

  await app.hover("role:button[Pending page]");
  expect(callsOf(app, "onHoverStart")).toHaveLength(0);
  expect(callsOf(app, "onHoverChange")).toHaveLength(0);
  expect(app.shows("text:Pending: idle")).toBe(true);

  // The control: the same step on a plain link does enter hover, so the
  // blocked hover above cannot pass because hover is broken in this app.
  await app.hover("role:button[Other page]");
  expect(callsOf(app, "onHoverStartOther")).toHaveLength(1);
});
