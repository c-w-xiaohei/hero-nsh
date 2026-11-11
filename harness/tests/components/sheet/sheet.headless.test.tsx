import { expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * Headless-only Sheet cases (port sheet 4b): T-019, T-032, T-033, T-034.
 *
 * T-019/T-033/T-034 need `dragAndHold`: a `drag` release carries the flick
 * velocity that dismisses the sheet, while `drop()` lifts the finger where it
 * is. It runs headless and on Linux, not on the web target. T-032 presses the
 * backdrop paint layer: on the web target the hit test stops at the layout
 * carrier that covers it (measured for Modal's X-004), so the dismissal only
 * reaches the layer on the headless engine.
 *
 * The port sheet drops the pointer-cancel / lost-pointer-capture half of T-019
 * (§8: `onResponderTerminate` has no app step) and the pointer-capture, cursor
 * and scroll-lock assertions of T-033/T-034; `drop()` still verifies that the
 * drag does not leave the app stuck.
 */

const CONTENT = "text:Sheet content";
const TRIGGER = "role:button[Open sheet]";

type Layout = { name: string; x: number; y: number; width: number; height: number };

function layout(app: App, name: string): Layout {
  const entries = callsOf(app, "layout").filter((args) => (args[0] as Layout | undefined)?.name === name);
  const last = entries.at(-1)?.[0] as Layout | undefined;

  if (!last) throw new Error(`no layout was reported for ${name}`);

  return last;
}

function calls(app: App, name: string): unknown[] {
  return callsOf(app, name).map((args) => args[0]);
}

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:426
// Partial port (port sheet T-019): the mid-drag translation is a transform, and
// `onLayout` reports the layout frame (bounds in the parent), which does not
// move with a drag — the frame is `{0, 0}` for the Dialog on every placement and
// unchanged for the Content — so the “panel moved by 45 points” reading of
// `getBoundingClientRect` has no channel and is dropped (§8). Kept: a held drag
// released below the dismiss threshold (upstream's 45 points stay under it on a
// tall sheet; this content-sized panel dismisses past ~42, so 20 points) leaves
// the panel at its resting frame and the app is not stuck mid-drag (Done still
// closes). The two `pointercancel` / `lostpointercapture` variants stay dropped
// (no app step drives either).
test("T-019 supports recovery after a cancelled handle drag", async () => {
  const app = await openScenario("sheet/open", { clock: {} });

  await app.clock!.runFor(20);
  const rest = layout(app, "content");

  await app.dragAndHold("id:handle", { x: 0, y: 20 });
  await app.clock!.runFor(20);
  await app.drop();
  await app.clock!.runFor(20);

  const settled = layout(app, "content");

  expect(Math.abs(settled.y - rest.y)).toBeLessThan(2);
  expect(Math.abs(settled.height - rest.height)).toBeLessThan(2);
  expect(app.shows(CONTENT)).toBe(true);

  await app.press("role:button[Done]");
  await app.waitFor(CONTENT, { state: "gone" });
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:841
// Ported (port sheet T-032): the backdrop press dismisses when `isDismissable`
// is true and does nothing when it is false.
for (const isDismissable of [true, false]) {
  test(`T-032 supports outside dismissal and respects isDismissable (${isDismissable})`, async () => {
    const app = await openScenario(isDismissable ? "sheet/basic" : "sheet/locked-closed", {
      clock: {},
    });

    await app.press(TRIGGER);
    await app.clock!.runFor(20);
    expect(calls(app, "openChange")).toEqual([true]);

    await app.press("id:backdrop");
    await app.clock!.runFor(20);

    if (isDismissable) {
      await app.waitFor(CONTENT, { state: "gone" });
      expect(calls(app, "openChange")).toEqual([true, false]);
    } else {
      expect(app.shows(CONTENT)).toBe(true);
      expect(calls(app, "openChange")).toEqual([true]);
    }
  });
}

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:881
// Partial port (port sheet T-033): pointer capture, `data-dragging` and the
// scroll lock have no NSH channel (§8). Kept: unmounting the sheet mid-drag
// leaves an app that still takes presses and no sheet on screen.
test("T-033 supports unmount during a handle drag without leaving scroll locks or capture", async () => {
  const app = await openScenario("sheet/retained", { clock: {} });

  await app.clock!.runFor(20);

  await app.dragAndHold("id:handle", { x: 0, y: 35 });
  await app.clock!.runFor(20);

  await app.press("role:button[Unmount now]");
  await app.clock!.runFor(20);
  await app.drop();

  expect(app.shows("text:Details")).toBe(false);

  await app.press("role:button[Ping]");
  expect(callsOf(app, "ping").length).toBe(1);
});

// heroui/packages/react/tests/components/sheet/sheet.browser.test.tsx:905
// Partial port (port sheet T-034): `data-handle-dragging` and pointer capture
// are dropped (§8). Kept: closing retained content mid-drag keeps the panel, the
// release is clean, and reopening still works.
test("T-034 supports closing retained content during a handle drag", async () => {
  const app = await openScenario("sheet/retained", { clock: {} });

  await app.clock!.runFor(20);

  await app.dragAndHold("id:handle", { x: 0, y: 35 });
  await app.clock!.runFor(20);

  await app.press("role:button[Close sheet]");
  await app.clock!.runFor(20);
  await app.drop();

  await app.press(TRIGGER);
  await app.clock!.runFor(20);

  expect(app.shows("text:Retained body")).toBe(true);
  expect(app.value("id:retained-input")).toBe("Keep me");
  expect(calls(app, "animationEnd")).toEqual([true, false, true]);
});
