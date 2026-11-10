import { expect, test } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Web-only Toolbar cases. Both translate upstream focus assertions into
 * `onFocus` probes (nsh/test cannot read focus), and both start with Tab, which
 * only the web target moves (a real Windows window does not — "Real hosts" in
 * the loop brief; the Windows host gap is a registered difference).
 *
 * Each waits for the first frame after `open` before it reads: on `--target web`
 * `open` can resolve before the app's first commit and a read straight after it
 * sees an empty screen. The wait only delays the read — every assertion still
 * runs and can still fail — and it uses `{ timeout: 15_000 }`, above nsh's own
 * 10 s app-start budget.
 */

// heroui/packages/react/tests/components/toolbar/toolbar.test.tsx:81
// Rewritten port (port sheet T-006): upstream asserts Undo has focus after Tab
// and Redo after ArrowRight. The probe records the focused control by name, so
// the array equality also carries the third upstream fact — Undo is not focused
// again once the pointer moves on.
test("T-006 supports keyboard arrow navigation between toolbar items", async () => {
  const app = await openScenario("toolbar/horizontal", { platform: "web" });
  await app.waitFor("role:button[Undo]", { timeout: 15_000 });

  await app.keyboard.press("tab");
  expect(callsOf(app, "focus")).toEqual([["Undo"]]);

  await app.keyboard.press("arrowright");
  expect(callsOf(app, "focus")).toEqual([["Undo"], ["Redo"]]);
});

// heroui/packages/react/tests/components/toolbar/toolbar.test.tsx:111
// Partial port (port sheet T-008): the two upstream aria assertions (the group
// has no aria-orientation, the toolbar has aria-orientation="horizontal") are
// dropped — `AccessibilityState` has no orientation field and nsh/test cannot
// read aria. The four behaviour assertions stay: Tab reaches Bold inside the
// group, ArrowRight + Space focuses and selects Italic, and another ArrowRight
// leaves the group and reaches Save.
test("T-008 supports nested group keyboard navigation without unsupported orientation attributes", async () => {
  const app = await openScenario("toolbar/nested-group", { platform: "web" });
  await app.waitFor("role:button[Bold]", { timeout: 15_000 });

  await app.keyboard.press("tab");
  expect(callsOf(app, "focus")).toEqual([["Bold"]]);

  await app.keyboard.press("arrowright");
  await app.keyboard.press("space");
  expect(callsOf(app, "focus")).toEqual([["Bold"], ["Italic"]]);
  expect(callsOf(app, "onSelectionChange")).toEqual([[["italic"]]]);

  await app.keyboard.press("arrowright");
  expect(callsOf(app, "focus")).toEqual([["Bold"], ["Italic"], ["Save"]]);
});
