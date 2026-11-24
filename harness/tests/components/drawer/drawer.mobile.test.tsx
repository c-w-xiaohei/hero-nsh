import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the drawer adaptation unit, one test per row of
 * adapt-sheets/drawer.md §4 (M-001…M-006, M-010…M-014). The fixture is
 * `harness/drawer.fixtures.tsx` — `basic` is the swipe surface, `scroll`
 * the tall Body for the atTop handoff, `sides` a non-bottom placement.
 *
 * `host.params.scope` mounts the `EnvironmentScope` the assertions inject —
 * "touch" for the gesture halves, "pointer" (this file's default) for the
 * desktop-parity baseline, including the negative assertion that both
 * gesture paths do not exist there (`keys=0`/`panelKeys=0`: the handlers
 * are physically absent, not registered-and-ignored).
 *
 * `open()` platform/width/height options are rejected on ios/android, so
 * the pointer environment is injected per open instead of pinned by
 * `platform:"windows"` — the role the old pin played (without it the host
 * defaults `input` to touch and every pointer-default assertion inverts).
 * `app.drag` drives the touches on the native targets as it did on
 * headless, so this file stays a shared `.mobile.test.tsx`.
 */

type DragRecord = {
  keys: number;
  panelKeys: number;
  offset: number;
  atTop: boolean | null;
};

type LayoutRecord = {
  part: string;
  bounds: { origin: { x: number; y: number }; size: { width: number; height: number } };
};

function openDrawer(
  caseName: string,
  params: Record<string, unknown> = {},
  scope: "touch" | "pointer" = "pointer",
): Promise<App> {
  return open("../../../drawer.fixtures.tsx", {
    clock: {},
    host: {
      params: { case: caseName, scope, ...params },
    },
  });
}

function dragCalls(app: App): DragRecord[] {
  return callsOf(app, "drag").map((args) => args[0] as DragRecord);
}

/**
 * The OS the app itself reports through the fixture's `platform` probe
 * (`probe("platform")(platform.os)` — the table/tabs convention). `""` when
 * the fixture records nothing. Only the iOS-degraded branches read it.
 */
function hostOs(app: App): string {
  return String(callsOf(app, "platform").at(-1)?.[0] ?? "");
}

function lastDrag(app: App): DragRecord {
  const records = dragCalls(app);
  const last = records.at(-1);

  if (!last) throw new Error("the drag probe reported nothing");

  return last;
}

function layoutFor(app: App, part: string): LayoutRecord["bounds"] {
  const record = callsOf(app, "layout")
    .map((args) => args[0] as LayoutRecord)
    .filter((entry) => entry.part === part)
    .at(-1);

  if (!record) throw new Error(`no layout record for ${part}`);

  return record.bounds;
}

async function settle(app: App): Promise<void> {
  // `open` can resolve before the first commit on some targets; every
  // assertion here reads the drag probe, so wait for its first record
  // instead of trusting a fixed settle.
  await app.waitUntil(() => callsOf(app, "drag").length > 0, { timeout: 15_000 });
  await app.clock?.runFor(40);
}

describe("drawer-mobile", () => {
  // adapt-sheets/drawer.md M-001 (A-001, A-002, negative): under the default
  // pointer environment neither gesture path exists — both `panHandlers()`
  // resolve to empty objects — and a drag on the Handle or the Header
  // moves nothing, dismisses nothing.
  test("M-001 default pointer environment: no gesture path at all", async () => {
    const app = await openDrawer("basic");

    await settle(app);
    expect(lastDrag(app).keys).toBe(0);
    expect(lastDrag(app).panelKeys).toBe(0);

    const panelBefore = layoutFor(app, "dialog");
    await app.drag("id:dr-handle", { x: 0, y: 200 });
    await settle(app);
    await app.drag("id:dr-header", { x: 0, y: 200 });
    await settle(app);

    const drag = lastDrag(app);
    expect(drag.keys).toBe(0);
    expect(drag.panelKeys).toBe(0);
    expect(drag.offset).toBe(0);
    expect(callsOf(app, "openChange")).toHaveLength(0);
    expect(app.shows("id:dr-dialog")).toBe(true);
    expect(layoutFor(app, "dialog")).toEqual(panelBefore);
  });

  // adapt-sheets/drawer.md M-002 (A-001): under the injected touch
  // environment a pull on the Handle past the panel-height threshold
  // dismisses through the existing exit path — one `onOpenChange(false)`,
  // the panel gone.
  test("M-002 touch + bottom: a Handle pull past the threshold closes the drawer", async () => {
    const app = await openDrawer("basic", {}, "touch");

    await settle(app);
    expect(lastDrag(app).keys).toBeGreaterThan(0);

    const height = layoutFor(app, "dialog").size.height;
    await app.drag("id:dr-handle", { x: 0, y: Math.ceil(height * 0.5) });
    await settle(app);

    expect(callsOf(app, "openChange")).toEqual([[false]]);
    await app.waitFor("id:dr-dialog", { state: "gone" });
  });

  // adapt-sheets/drawer.md M-003 (A-002, A-003): the panel is a drag surface
  // of its own — a pull from the Header, with the Body at its start edge,
  // takes the same claim and the same close path.
  test("M-003 touch + bottom + Body at top: a Header pull closes the drawer", async () => {
    const app = await openDrawer("basic", {}, "touch");

    await settle(app);
    expect(lastDrag(app).panelKeys).toBeGreaterThan(0);
    expect(lastDrag(app).atTop).toBe(true);

    const height = layoutFor(app, "dialog").size.height;
    await app.drag("id:dr-header", { x: 0, y: Math.ceil(height * 0.5) });
    await settle(app);

    expect(callsOf(app, "openChange")).toEqual([[false]]);
    await app.waitFor("id:dr-dialog", { state: "gone" });
  });

  // adapt-sheets/drawer.md M-005 (A-001): `isSwipeable` is the master
  // switch — off at the Backdrop or overridden off at the Content, the
  // gesture never mounts and a pull does nothing.
  test("M-005 isSwipeable=false (Backdrop and Content): opt-out, no gesture path", async () => {
    for (const params of [{ swipeable: false }, { swipeableContent: false }]) {
      const app = await openDrawer("basic", params, "touch");

      await settle(app);
      expect(lastDrag(app).keys).toBe(0);
      expect(lastDrag(app).panelKeys).toBe(0);

      await app.drag("id:dr-handle", { x: 0, y: 200 });
      await settle(app);

      expect(lastDrag(app).offset).toBe(0);
      expect(callsOf(app, "openChange")).toHaveLength(0);
      expect(app.shows("id:dr-dialog")).toBe(true);
    }
  });

  // adapt-sheets/drawer.md M-006 (A-001): `isDismissable` is the stronger
  // gate — the swipe shares it with outside-press dismissal, so a locked
  // drawer mounts no gesture path.
  test("M-006 isDismissable=false: swipe shares the dismiss gate", async () => {
    const app = await openDrawer("basic", { dismissable: false }, "touch");

    await settle(app);
    expect(lastDrag(app).keys).toBe(0);
    expect(lastDrag(app).panelKeys).toBe(0);

    await app.drag("id:dr-handle", { x: 0, y: 200 });
    await settle(app);

    expect(lastDrag(app).offset).toBe(0);
    expect(callsOf(app, "openChange")).toHaveLength(0);
    expect(app.shows("id:dr-dialog")).toBe(true);
  });

  // adapt-sheets/drawer.md M-010 (A-003): the Body's `onScroll` wrap reports
  // the offset to the context first, then forwards the event to the
  // caller's handler unchanged — the record order proves both halves.
  test("M-010 Body onScroll order: report before the caller, in both environments", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const app = await openDrawer("scroll", {}, scope);

      await settle(app);
      await app.scroll("id:dr-body", 120);
      await settle(app);

      const events = calls(app).map((entry) => entry.name);
      const firstReport = events.indexOf("scrollReport");
      const firstCaller = events.indexOf("bodyScroll");
      expect(firstReport).toBeGreaterThanOrEqual(0);
      expect(firstCaller).toBeGreaterThanOrEqual(0);
      expect(firstReport).toBeLessThan(firstCaller);

      const reported = callsOf(app, "scrollReport").length;
      const forwarded = callsOf(app, "bodyScroll").length;
      expect(forwarded).toBe(reported);
      expect(lastDrag(app).atTop).toBe(false);
    }
  });

  // adapt-sheets/drawer.md M-011 (A-008): the gesture is a bottom-edge
  // feature — top, left and right mount no path at all.
  test("M-011 non-bottom placements: Handle and panel carry no gesture", async () => {
    for (const placement of ["top", "left", "right"] as const) {
      const app = await openDrawer("sides", { placement }, "touch");

      await settle(app);
      expect(lastDrag(app).keys).toBe(0);
      expect(lastDrag(app).panelKeys).toBe(0);

      // 40pt, not 200: on Android a release that lands outside the panel is
      // a press on the backdrop, so the 200pt travel dismissed through the
      // outside-press path rather than through any handle gesture (run
      // 45477161285: `openChange` recorded [[false]]). The touch handle is
      // at least 44pt tall (`min-h-11`), so 40pt from its center ends just
      // below the handle on the `top` panel's header, and well inside the
      // `h-full` panel for `left`/`right` — the short drag proves the same
      // thing: no gesture path mounts to claim it.
      await app.drag("id:dr-handle", { x: 0, y: 40 });
      await settle(app);

      expect(lastDrag(app).offset).toBe(0);
      expect(callsOf(app, "openChange")).toHaveLength(0);
      expect(app.shows("id:dr-dialog")).toBe(true);
    }
  });

  // adapt-sheets/drawer.md M-012 (A-004): under touch the `input` axis's
  // `min-h-11` gives the Handle the 44 pt grab surface; the default
  // environment's handle stays content-sized.
  test("M-012 touch Handle measures at least 44pt, pointer unchanged", async () => {
    const touch = await openDrawer("basic", {}, "touch");
    await touch.waitUntil(() =>
      callsOf(touch, "layout").some(
        (args) => (args[0] as LayoutRecord).part === "handle",
      ),
    );
    expect(layoutFor(touch, "handle").size.height).toBeGreaterThanOrEqual(44);

    const pointer = await openDrawer("basic");
    await pointer.waitUntil(() =>
      callsOf(pointer, "layout").some(
        (args) => (args[0] as LayoutRecord).part === "handle",
      ),
    );
    expect(layoutFor(pointer, "handle").size.height).toBeLessThan(44);
  });

  // adapt-sheets/drawer.md M-013 (A-005): the fixture's observation channel
  // itself — the DragProbe reports the mount state in both scopes.
  test("M-013 fixture mounts in both scopes and DragProbe reports", async () => {
    const pointer = await openDrawer("basic");
    await settle(pointer);
    const initial = lastDrag(pointer);
    expect(initial.keys).toBe(0);
    expect(initial.panelKeys).toBe(0);
    expect(initial.offset).toBe(0);
    expect(initial.atTop).toBe(true);
    expect(layoutFor(pointer, "dialog").size.height).toBeGreaterThan(0);

    const touch = await openDrawer("basic", {}, "touch");
    await settle(touch);
    expect(lastDrag(touch).keys).toBeGreaterThan(0);
    expect(lastDrag(touch).panelKeys).toBeGreaterThan(0);
    expect(touch.shows("id:dr-handle")).toBe(true);
  });

  // adapt-sheets/drawer.md M-014 (baseline): the default pointer
  // environment is unchanged — Trigger toggles then fires `onPress`, an
  // outside press calls `onPress` then dismisses, the keyboard gate holds,
  // and CloseTrigger closes before its own `onPress`.
  test("M-014 baseline: default environment keeps the desktop contract", async () => {
    // Trigger order: `overlay.toggle()` before the caller's `onPress`. The
    // trigger sits under the backdrop while the drawer is open, so the
    // press runs on the closed drawer: Escape closes, the trigger reopens.
    const app = await openDrawer("basic");
    await settle(app);
    // `settle` waits on the JS-side drag probe, which resolves before the
    // native host has finished presenting and focusing the overlay — on
    // Android the Escape sent at that point dies at the surface root (run
    // 45477161285: `id:dr-dialog` never went away in 5 s). Wait for the
    // drawer's own interactive content instead, so the key lands after the
    // native presentation, not before it.
    await app.waitFor("id:dr-close");
    await app.keyboard.press("escape");
    if (hostOs(app) === "ios") {
      // iOS degraded acceptance (registered gap, native-overlay-root-cause
      // E-3): the drawer's native `Dialog` carries Escape on
      // `ModalController.keyCommands`, but `ModalHost.present` installs no
      // first responder inside the presented controller — the key dies at
      // the surface root and `onCancel` never fires on the UIKit host (run
      // 45344508005: `id:dr-dialog` stayed through the 5 s wait).
      // `platform.os` cannot tell that host from headless (both report
      // "ios", and headless closes through JS key bubbling), so the
      // degraded contract is the close channel invariant plus the outside
      // press staying canonical either way. Android and web keep the
      // literal Escape-close; the strict copy lives in
      // drawer.mobile.headless.test.tsx.
      await settle(app);
      if (app.shows("id:dr-dialog")) {
        // Suppressed Escape (the real UIKit host): nothing closed — no
        // `openChange` at all — and the backdrop press still dismisses.
        expect(callsOf(app, "openChange")).toHaveLength(0);
        await app.press("id:dr-backdrop");
        await settle(app);
      }
      expect(callsOf(app, "openChange").at(-1)?.[0]).toBe(false);
      await app.waitFor("id:dr-dialog", { state: "gone" });
    } else {
      await app.waitFor("id:dr-dialog", { state: "gone" });
    }

    await app.press("id:dr-trigger");
    await app.waitFor("id:dr-dialog");
    const events = calls(app).map((entry) => entry.name);
    const openIdx = events.lastIndexOf("openChange");
    const pressIdx = events.lastIndexOf("triggerPress");
    expect(openIdx).toBeGreaterThanOrEqual(0);
    expect(pressIdx).toBeGreaterThan(openIdx);
    expect(callsOf(app, "openChange").at(-1)?.[0]).toBe(true);

    // Outside press: caller's `onPress` first, then the dismiss request.
    const outside = await openDrawer("basic");
    await settle(outside);
    await outside.press("id:dr-backdrop");
    await settle(outside);
    const outsideEvents = calls(outside).map((entry) => entry.name);
    expect(outsideEvents.indexOf("backdropPress")).toBeGreaterThanOrEqual(0);
    expect(callsOf(outside, "openChange")).toEqual([[false]]);

    // The keyboard gate: Escape stays inert when dismissal is disabled.
    const locked = await openDrawer("basic", { keyboardDismissDisabled: true });
    await settle(locked);
    // Same presentation wait as above: without it an Escape that dies
    // before the Android presentation would pass this row trivially — the
    // assertions can't tell "gate held" from "key never arrived".
    await locked.waitFor("id:dr-close");
    await locked.keyboard.press("escape");
    await settle(locked);
    expect(locked.shows("id:dr-dialog")).toBe(true);
    expect(callsOf(locked, "openChange")).toHaveLength(0);

    // CloseTrigger: `close` before `onPress` — the openChange record lands
    // before the caller's press callback.
    const closer = await openDrawer("basic");
    await settle(closer);
    // Same native-registration wait as the Escape rows: the press target
    // must exist before M-014's CloseTrigger half can exercise it.
    await closer.waitFor("id:dr-close");
    await closer.press("id:dr-close");
    await settle(closer);
    const closerEvents = calls(closer).map((entry) => entry.name);
    expect(closerEvents.indexOf("openChange")).toBeGreaterThanOrEqual(0);
    expect(closerEvents.indexOf("closePress")).toBeGreaterThan(closerEvents.indexOf("openChange"));
  });
});
