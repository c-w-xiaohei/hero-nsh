import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import * as select from "../../testers/select";

/*
 * Mobile assertions for the Select adapt unit (C+B+F(消费); sheet 输入场景
 * 参与 G), one test per row of adapt-sheets/select.md §4 that the
 * ios/android targets can observe: M-001 … M-005, M-008, M-010, M-011,
 * M-013, M-014, M-016 … M-019 (M-015's hover row in
 * `select.mobile.web.test.tsx`). The `platform:"ios"` host-derived half, the sheet dismissal
 * chains and the `app.drag` press-cancel (M-006, M-007, M-009, M-012) live in
 * `select.mobile.headless.test.tsx` — web has none of those capabilities.
 *
 * The fixture is `harness/select.fixtures.tsx`, driven by `host.params`:
 * `input` / `width` / `density` feed the `EnvironmentScope`, `presentation` /
 * `nonmodal` / `kbdDismiss` parameterize `Select.Popover`, `kbd` mounts the
 * input scenario, `narrow` shrinks the trigger under 44pt, `keepopen` selects
 * `selectionMode="multiple"`, `hover`/`layout`/`ctx2` switch the probes.
 *
 * The `input:"pointer"` + `width:"regular"` default this file injects is
 * load-bearing the way the old `platform:"windows"` + 1024×768 pin was:
 * without it the host defaults `input` to touch on native targets and every
 * pointer-default assertion inverts under the suite (the _common.md
 * convention, switch M-001/3/4's precedent). `open()` platform/width/height
 * options are rejected on ios/android, so the desktop-parity environment
 * comes from `EnvironmentScope` params instead; M-015's hover row lives in
 * `select.mobile.web.test.tsx` (`app.hover` is desktop/web-only).
 *
 * Every assertion reads what `nsh/test` can observe — `shows`, `count`,
 * `texts`, `enabled`, `onLayout` bounds and the `app.storage()` probe calls:
 * `events`, `selectionChange`, `openChange`, `clear`, `hover`, `layout`,
 * `ctx-*` (trigger seam), `ctx2-*` (clear-button seam) and `pan`
 * (`SheetContentPanContext` key counts). `hitSlop` the view prop has no read
 * channel (sheet §6 host gap): the assertions read the seam's computed
 * `hitSlop` accessor and the unchanged `onLayout` bounds instead.
 */

function openSelect(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../select.fixtures.tsx", {
    clock: {},
    host: {
      params: {
        case: caseName,
        input: "pointer",
        width: "regular",
        ...params,
      },
    },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };
type Point = { x: number; y: number };

type CtxState = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: Point | null;
  hitSlop: Edges | null;
  bounds?: { width: number; height: number };
  enabled: boolean;
};

type CtxEnv = { enabled: boolean; hitSlop: Edges | null };
type PanRecord = {
  /** The retained carrier branch the record came from (`SelectCarrierContext`). */
  carrier: "panel" | "sheet" | "fullscreen" | null;
  panKeys: number;
  scrollKeys: number;
  keyboardDismissMode: string | null;
};
type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function lastOf<T>(app: App, name: string): T {
  const recorded = callsOf(app, name);
  return recorded[recorded.length - 1][0] as T;
}

/** The OS the fixture's `env` probe reports; the Android overlay-registry
 * gap in M-017 branches on it (the popover unit's `hostOs` convention). */
function hostOs(app: App): string {
  const last = callsOf(app, "env").at(-1)?.[0] as { os?: string } | undefined;
  return last?.os ?? "";
}

/** The `events` probe's string payloads, in order: "down"/"up"/"press". */
function eventArgs(app: App): string[] {
  return callsOf(app, "events").map((c) => c[0] as string);
}

/** The seam's `isPressed` edges as the `ctx-pressed` probe recorded them. */
function seamEdges(app: App, prefix = "ctx"): boolean[] {
  return callsOf(app, `${prefix}-pressed`).map(
    (c) => (c[0] as { seam: boolean }).seam,
  );
}

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const list = layouts(app, name);
  return list[list.length - 1];
}

/** Every recorded `ctx-state` sample sits at the seam's rest values. */
function expectStatesAtRest(app: App, name = "ctx-state"): void {
  for (const call of callsOf(app, name)) {
    const s = call[0] as CtxState;
    expect(s.seamPressed).toBe(false);
    expect(s.pressed).toBeLessThan(0.5);
    expect(s.scale).toBe(1);
    expect(s.origin).toBeNull();
  }
}

/** The most recent `pan` probe record for one carrier copy. Every retained
 * carrier branch mounts its own copy of the popover's children, so three
 * probes run at once; `carrier` picks the branch under assertion — the sheet
 * copy is the only one inside `SheetDialog`, the other two always answer −1. */
function panFor(app: App, carrier: PanRecord["carrier"]): PanRecord {
  const recorded = callsOf(app, "pan")
    .map((c) => c[0] as PanRecord)
    .filter((p) => p.carrier === carrier);
  return recorded[recorded.length - 1];
}

describe("select mobile", () => {
  // adapt-sheets/select.md M-001 (A-004, A-013): the default pointer
  // environment mounts the panel carrier — `sel-pop-panel` appears,
  // `sel-pop-sheet` / `sel-pop-dialog` never do — the listbox shows, and
  // `onOpenChange(true)` records exactly once. Desktop zero drift.
  test("M-001 default environment opens the panel carrier", async () => {
    const app = await openSelect("states");

    expect(app.count("id:sel-pop-panel")).toBe(0);
    expect(app.count("id:sel-pop-sheet")).toBe(0);
    expect(app.count("id:sel-pop-dialog")).toBe(0);

    await app.press("id:select-trigger");

    expect(app.count("id:sel-pop-panel")).toBe(1);
    expect(app.count("id:sel-pop-sheet")).toBe(0);
    expect(app.count("id:sel-pop-dialog")).toBe(0);
    expect(app.shows("role:listbox")).toBe(true);
    expect(app.shows("role:option[Florida]")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/select.md M-002 (A-007, A-008, 负断言): under the default
  // pointer environment the press/toggle chain is verbatim — `events`
  // orders `down→up→press`, `openChange` fires once — and no touch-only
  // artifact exists: every seam channel stays at rest, `hitSlop` computes
  // `undefined`, and the `SheetDialog`'s content pan, reachable only while
  // a sheet carrier is mounted, resolves zero props under pointer.
  test("M-002 default environment keeps the verbatim chain and no touch seam", async () => {
    const app = await openSelect("states");
    await app.clock!.runFor(1600);

    await app.press("id:select-trigger");
    expect(eventArgs(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "openChange")).toEqual([[true]]);

    await app.waitUntil(() => callsOf(app, "ctx-state").length >= 2);
    expectStatesAtRest(app);
    expect(seamEdges(app)).toEqual([false]);
    expect(lastOf<CtxState>(app, "ctx-state").hitSlop).toBeNull();
    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);

    // On-demand read after the press: the channels are still at rest
    // (a gated press raises no `isPressed` edge to schedule another sample).
    // The sampler is unreachable while the popover is open — a modal
    // carrier's underlay swallows every flow press into "dismiss" on every
    // host, and on Android the earlier in-popover copy had no native view at
    // all (the popover unit's registered overlay-registry gap; the query
    // resolved to the hidden flow copy, whose tap dismissed the popover and
    // starved `ctx-channels`, run's 5s timeout). The read therefore runs
    // after closing: a second press on the covered trigger lands on the
    // underlay on the modal carriers, and the trigger's own toggle takes the
    // same close on the hosts that hit-test the logical tree — either way
    // `ctx-channels` reports the post-press state.
    await app.press("id:select-trigger");
    await app.waitFor("role:listbox", { state: "gone" });
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxState>(app, "ctx-channels");
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBeLessThan(0.5);
    expect(channels.scale).toBe(1);
    expect(channels.origin).toBeNull();
    expect(channels.enabled).toBe(false);

    // The new gesture path is physically absent under pointer: pin the
    // sheet carrier in the default environment and the content pan still
    // resolves no handler keys (the pan's `enabled` gate reads `input`).
    const pinned = await openSelect("states", { presentation: "sheet" });
    await pinned.press("id:select-trigger");
    await pinned.waitUntil(() => callsOf(pinned, "pan").length > 0);
    const pan = panFor(pinned, "sheet");
    expect(pan.panKeys).toBe(0);
    expect(pan.scrollKeys).toBe(0);
  });

  // adapt-sheets/select.md M-003 (A-003, A-005): injected `input:"touch"` +
  // `width:"compact"` resolves `auto` to the sheet carrier — `sel-pop-sheet`
  // mounts, the other carriers never do — with the list rows and the `✓`
  // indicator inside it, and `onOpenChange(true)` once.
  test("M-003 injected touch+compact resolves auto to the sheet carrier", async () => {
    const app = await openSelect("states-default", {
      input: "touch",
      width: "compact",
    });

    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-sheet");

    expect(app.count("id:sel-pop-sheet")).toBe(1);
    expect(app.count("id:sel-pop-panel")).toBe(0);
    expect(app.count("id:sel-pop-dialog")).toBe(0);
    expect(app.shows("role:listbox")).toBe(true);
    expect(app.shows("role:option[Florida]")).toBe(true);
    expect(app.count("role:listbox >> text:✓")).toBe(1);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/select.md M-004 (A-002, A-005, A-006): an explicit pin wins
  // over the auto rule in both directions — `"sheet"` mounts the Sheet
  // carrier and `"fullscreen"` the dialog carrier even under pointer, while
  // `"panel"` keeps the anchored overlay under injected touch+compact.
  test("M-004 explicit presentation pin beats the auto rule", async () => {
    const pinnedSheet = await openSelect("states", { presentation: "sheet" });
    await pinnedSheet.press("id:select-trigger");
    await pinnedSheet.waitFor("id:sel-pop-sheet");
    expect(pinnedSheet.count("id:sel-pop-sheet")).toBe(1);
    expect(pinnedSheet.count("id:sel-pop-panel")).toBe(0);
    expect(pinnedSheet.count("id:sel-pop-dialog")).toBe(0);
    expect(pinnedSheet.shows("role:listbox")).toBe(true);

    const pinnedDialog = await openSelect("states", {
      presentation: "fullscreen",
    });
    await pinnedDialog.press("id:select-trigger");
    expect(pinnedDialog.count("id:sel-pop-dialog")).toBe(1);
    expect(pinnedDialog.count("id:sel-pop-sheet")).toBe(0);
    expect(pinnedDialog.count("id:sel-pop-panel")).toBe(0);
    expect(pinnedDialog.shows("role:listbox")).toBe(true);

    const pinnedPanel = await openSelect("states", {
      presentation: "panel",
      input: "touch",
      width: "compact",
    });
    await pinnedPanel.press("id:select-trigger");
    expect(pinnedPanel.count("id:sel-pop-panel")).toBe(1);
    expect(pinnedPanel.count("id:sel-pop-sheet")).toBe(0);
    expect(pinnedPanel.count("id:sel-pop-dialog")).toBe(0);
  });

  // adapt-sheets/select.md M-005 (A-003): `isNonModal` suppresses the
  // non-panel resolutions under `auto` — the upstream non-panel carriers
  // are always modal, so touch+compact + `nonmodal` still mounts the panel
  // carrier with its underlay-free chain.
  test("M-005 isNonModal suppresses auto sheet resolution", async () => {
    const app = await openSelect("states", {
      input: "touch",
      width: "compact",
      nonmodal: "1",
    });

    await app.press("id:select-trigger");
    expect(app.count("id:sel-pop-panel")).toBe(1);
    expect(app.count("id:sel-pop-sheet")).toBe(0);
    expect(app.count("id:sel-pop-dialog")).toBe(0);
    expect(app.shows("role:listbox")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/select.md M-008 (A-005, G 参与): the sheet carrier mounts
  // `SheetDialog`, so under touch the `SheetContentPanContext` resolves real
  // handler keys and the paired scroll carries
  // `keyboardDismissMode:"interactive"` — the input scenario's keyboard
  // cooperation channel. Under pointer the same mounted context resolves
  // zero keys; on the other carriers it is not supplied at all (−1).
  test("M-008 the sheet carrier supplies the content pan and the interactive dismiss channel", async () => {
    const touch = await openSelect("states", {
      input: "touch",
      width: "compact",
      kbd: "1",
    });
    await touch.press("id:select-trigger");
    await touch.waitFor("id:sel-pop-sheet");
    await touch.waitUntil(() => callsOf(touch, "pan").length > 0);
    const touchPan = panFor(touch, "sheet");
    expect(touchPan.panKeys).toBeGreaterThanOrEqual(1);
    expect(touchPan.scrollKeys).toBeGreaterThanOrEqual(1);
    expect(touchPan.keyboardDismissMode).toBe("interactive");
    expect(touch.shows("label:Search options")).toBe(true);
    expect(touch.count("role:listbox")).toBe(1);

    const pointer = await openSelect("states", { presentation: "sheet" });
    await pointer.press("id:select-trigger");
    await pointer.waitUntil(() => callsOf(pointer, "pan").length > 0);
    const pointerPan = panFor(pointer, "sheet");
    expect(pointerPan.panKeys).toBe(0);
    expect(pointerPan.scrollKeys).toBe(0);
    expect(pointerPan.keyboardDismissMode).toBeNull();

    const panel = await openSelect("states", { presentation: "panel" });
    await panel.press("id:select-trigger");
    await panel.waitUntil(() => callsOf(panel, "pan").length > 0);
    // The panel copy never sees a `SheetContentPanContext` (−1); the
    // retained sheet copy still resolves its mounted context (0 under
    // pointer), so the assertion names the panel branch, not "the rest".
    expect(panFor(panel, "panel").panKeys).toBe(-1);
  });

  // adapt-sheets/select.md M-010 (A-006): the fullscreen carrier centers the
  // dialog box — its bounds hug neither the bottom edge nor the trigger —
  // an outside press closes through the underlay with one
  // `onOpenChange(false)`, and row selection / multi-select keep the panel
  // carrier's semantics.
  test("M-010 fullscreen centers the dialog, dismisses outside, keeps selection semantics", async () => {
    const app = await openSelect("items-outside", {
      presentation: "fullscreen",
      layout: "1",
    });

    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-dialog");
    expect(app.count("id:sel-pop-sheet")).toBe(0);
    expect(app.count("id:sel-pop-panel")).toBe(0);

    // Centered, not bottom-anchored: the box's vertical centre sits near
    // the `stage` root's centre (the window-sized column the fixture mounts
    // under `layout=1`), far from its bottom edge.
    await app.waitUntil(
      () => layouts(app, "pop").length > 0 && layouts(app, "stage").length > 0,
    );
    const box = lastLayout(app, "pop");
    const stage = lastLayout(app, "stage");
    expect(box.height).toBeGreaterThan(0);
    const centerY = box.y + box.height / 2;
    expect(Math.abs(centerY - (stage.y + stage.height / 2))).toBeLessThan(80);
    expect(box.y + box.height).toBeLessThan(stage.y + stage.height - 12);

    // Row selection closes a single select, as the panel carrier does.
    await app.press("role:option[Two]");
    expect(callsOf(app, "selectionChange")).toEqual([["2"]]);
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
    expect(select.triggerShows(app, "Two")).toBe(true);
    await app.clock!.runFor(120);

    // Outside press closes through the underlay.
    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-dialog");
    await app.press("id:outside");
    await app.waitFor("id:sel-pop-dialog", { state: "gone" });
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true], [false]]);
    await app.clock!.runFor(120);

    // Multiple selection stays open on the dialog carrier too.
    const multi = await openSelect("items-multiple", {
      presentation: "fullscreen",
    });
    await multi.press("id:select-trigger");
    await multi.waitFor("id:sel-pop-dialog");
    await multi.press("role:option[Two]");
    expect(callsOf(multi, "selectionChange")).toEqual([[["2"]]]);
    expect(multi.count("id:sel-pop-dialog")).toBe(1);
    expect(callsOf(multi, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/select.md M-011 (A-007): injected touch — one `app.press`
  // produces exactly one `openChange` and the `down→up→press` sequence, and
  // the seam's `isPressed` completes a true→false round-trip. The `narrow`
  // trigger (<44pt) computes a non-null `hitSlop` (all four sides ≥0);
  // the standard trigger reaches 44pt through `min-h-11`, so its `hitSlop`
  // accessor answers `undefined` (sheet §6: the accessor, not the prop).
  test("M-011 injected touch: one toggle, one round-trip, hitSlop only below the target", async () => {
    const app = await openSelect("states", {
      input: "touch",
      width: "compact",
    });

    await app.press("id:select-trigger");
    expect(eventArgs(app)).toEqual(["down", "up", "press"]);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
    await app.waitUntil(() => seamEdges(app).at(-1) === false);
    expect(seamEdges(app)).toContain(true);
    expect(seamEdges(app)).toHaveLength(3);

    await app.waitUntil(() => callsOf(app, "ctx-state").length >= 4);
    const state = lastOf<CtxState>(app, "ctx-state");
    // The standard trigger is ≥44pt tall under touch (`min-h-11`), so the
    // residual slop is `undefined`.
    expect(state.hitSlop).toBeNull();
    expect(state.enabled).toBe(true);
    expect(state.seamPressed).toBe(false);

    const narrow = await openSelect("states", {
      input: "touch",
      narrow: "1",
    });
    await narrow.waitUntil(() => callsOf(narrow, "ctx-env").length > 0);
    await narrow.waitUntil(() => callsOf(narrow, "ctx-state").length > 0);
    const narrowState = lastOf<CtxState>(narrow, "ctx-state");
    expect(narrowState.hitSlop).not.toBeNull();
    expect(narrowState.hitSlop!.top).toBeGreaterThanOrEqual(0);
    expect(narrowState.hitSlop!.right).toBeGreaterThanOrEqual(0);
    expect(narrowState.hitSlop!.bottom).toBeGreaterThanOrEqual(0);
    expect(narrowState.hitSlop!.left).toBeGreaterThanOrEqual(0);
  });

  // adapt-sheets/select.md M-013 (A-008): injected touch — the ClearButton's
  // hit view keeps its painted bounds (24pt, hitSlop is invisible growth)
  // while its seam computes a non-null `hitSlop`; pressing it clears once
  // and reports `selectionChange` with the trigger's `focusTrigger` chain
  // unchanged (the `clear`/`selectionChange` probes, verbatim).
  test("M-013 clear button keeps its box, computes slop and clears once under touch", async () => {
    const app = await openSelect("states-clear", {
      input: "touch",
      ctx2: "1",
    });

    await app.waitUntil(() => callsOf(app, "ctx2-state").length > 0);
    const state = lastOf<CtxState>(app, "ctx2-state");
    // The 24pt hit box: well under the 44pt minimum, so slop exists and the
    // measured bounds stay painted-size.
    expect(state.bounds).toBeDefined();
    expect(state.bounds!.width).toBe(24);
    expect(state.bounds!.height).toBe(24);
    expect(state.hitSlop).not.toBeNull();
    expect(state.hitSlop!.top).toBeGreaterThanOrEqual(0);
    expect(state.hitSlop!.right).toBeGreaterThanOrEqual(0);

    await app.press("id:select-clear-button");
    expect(callsOf(app, "clear")).toHaveLength(1);
    expect(callsOf(app, "selectionChange")).toEqual([[null]]);
  });

  // adapt-sheets/select.md M-014 (A-008): the empty and disabled gates are
  // part of `enabled` — no press path exists to report, so `clear` /
  // `selectionChange` never fire and every clear-seam channel stays at
  // rest, on both environments.
  test("M-014 empty and disabled clear buttons fire nothing and stay at rest", async () => {
    for (const input of ["", "touch"] as const) {
      const params: Record<string, string> = { ctx2: "1" };
      if (input) {
        params.input = input;
        params.width = "compact";
      }

      const empty = await openSelect("states-clear-empty", params);
      try {
        await empty.press("id:select-clear-button");
      } catch {
        // A `pointer-events-none` view may reject the step; what matters is
        // that nothing fired.
      }
      await empty.clock!.runFor(300);
      expect(callsOf(empty, "clear")).toHaveLength(0);
      expect(callsOf(empty, "selectionChange")).toHaveLength(0);
      if (callsOf(empty, "ctx2-state").length > 0) {
        expectStatesAtRest(empty, "ctx2-state");
        expect(lastOf<CtxEnv>(empty, "ctx2-env").enabled).toBe(false);
      }

      const disabled = await openSelect("states-disabled", params);
      await expect(
        disabled.press("id:select-clear-button"),
      ).rejects.toMatchObject({ code: "ERR_NSH_TEST_DISABLED" });
      expect(callsOf(disabled, "clear")).toHaveLength(0);
      expect(callsOf(disabled, "selectionChange")).toHaveLength(0);
      if (callsOf(disabled, "ctx2-state").length > 0) {
        expect(lastOf<CtxEnv>(disabled, "ctx2-env").enabled).toBe(false);
      }
    }
  });

  // adapt-sheets/select.md M-015 (A-009): injected touch — the JS hover
  // state never engages: the `hov` marker never renders, no `hover` record
  // appears, while the raw `enter`/`leave` mouse callbacks still forward.
  // Under pointer the same steps set and clear the flag as before.
  // `app.hover` is desktop/web-only — the row lives in
  // select.mobile.web.test.tsx.

  // adapt-sheets/select.md M-016 (A-001): `density="compact"` tightens the
  // root `gap` and the trigger `px`/`py` — the root and trigger boxes are
  // measurably smaller than the default-density mounts, which are verbatim
  // the pre-axis values.
  test("M-016 compact density tightens the root gap and trigger padding", async () => {
    const baseline = await openSelect("items", { layout: "1" });
    await baseline.waitUntil(() => layouts(baseline, "root").length > 0);
    const baseRoot = lastLayout(baseline, "root");
    const baseTrigger = lastLayout(baseline, "trigger");

    const compact = await openSelect("items", {
      layout: "1",
      density: "compact",
    });
    await compact.waitUntil(() => layouts(compact, "root").length > 0);
    const compactRoot = lastLayout(compact, "root");
    const compactTrigger = lastLayout(compact, "trigger");

    expect(compactRoot.height).toBeLessThan(baseRoot.height);
    expect(compactTrigger.width).toBeLessThan(baseTrigger.width);
  });

  // adapt-sheets/select.md M-017 (A-010, F 消费): the `items` data path and
  // the static path produce the same `selectionChange` payload shape and
  // the same unmounted-key `textValue` read-back on both environments — the
  // collection consumption the popover's persistent mount protects.
  // 4 opens × the ~5s native host relaunch each — over the 30s default.
  test("M-017 items and static paths select identically on both environments", async () => {
    for (const input of ["", "touch"] as const) {
      const params: Record<string, string> = {};
      if (input) {
        params.input = input;
        params.width = "compact";
      }
      const injected = input === "touch";

      // Dynamic path (`items` on ListBox → data-driven collection).
      const items = await openSelect("states-items", params);
      await items.press("id:select-trigger");
      await items.waitFor("role:option[California]");
      await items.press("role:option[California]");
      expect(callsOf(items, "selectionChange")).toEqual([["california"]]);
      expect(select.triggerShows(items, "California")).toBe(true);

      // Static path: select a row, then select a different one and check
      // the unmounted-key `textValue` read-back through `Select.Value`.
      const statics = await openSelect("states", params);
      await statics.press("id:select-trigger");
      await statics.waitFor("role:option[Florida]");
      await statics.press("role:option[Florida]");
      expect(callsOf(statics, "selectionChange")).toEqual([["florida"]]);
      await statics.clock!.runFor(120);
      await statics.press("id:select-trigger");
      // The re-presentation race, plus the Android overlay-registry gap: the
      // modal unit measures the overlay's native views registering after its
      // container, so wait for the press target — on Android the re-shown
      // carrier's option rows may never re-register at all (run's M-017:
      // `role:option[Texas]` had no native view while its row text was on
      // screen, the popover unit's registered gap). The Android half presses
      // the option's own row text — scoped to the resolved carrier so a
      // hidden retained copy cannot win the query — which bubbles to the
      // item's press chain; every other host presses the option by role.
      // The asserted channel — `selectionChange` + the `Select.Value`
      // read-back — is identical.
      if (hostOs(statics) === "android") {
        const carrier = injected ? "id:sel-pop-sheet" : "id:sel-pop-panel";
        await statics.waitFor(`${carrier} >> text:Texas`);
        await statics.press(`${carrier} >> text:Texas`);
      } else {
        await statics.waitFor("role:option[Texas]");
        await statics.press("role:option[Texas]");
      }
      expect(callsOf(statics, "selectionChange")).toEqual([
        ["florida"],
        ["texas"],
      ]);
      expect(select.triggerShows(statics, "Texas")).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/select.md M-018 (baseline): the default environment is
  // byte-identical — trigger toggle, Escape close, outside-press close,
  // single-select close-on-selection, multiple staying open, non-modal
  // having no underlay, `isKeyboardDismissDisabled` blocking Escape, a
  // disabled root refusing the press, the deprecated `onChange` alias, the
  // `value` alias, `disabledKeys` and `disallowEmptySelection`. 8 opens ×
  // the ~5s native host relaunch each — over the 30s default.
  test("M-018 default-environment baseline: toggle, dismissals, selection rules, aliases", async () => {
    const app = await openSelect("items-outside");

    // Toggle open → outside press closes once.
    await app.press("id:select-trigger");
    expect(callsOf(app, "openChange")).toEqual([[true]]);
    await app.press("id:outside");
    await app.waitFor("role:listbox", { state: "gone" });
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);

    // Reopen → Escape closes once more.
    await app.press("id:select-trigger");
    await app.keyboard.press("escape");
    await app.waitFor("role:listbox", { state: "gone" });
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true], [false]]);

    // Single selection closes the list; multiple keeps it open.
    await app.press("id:select-trigger");
    await app.press("role:option[Two]");
    expect(callsOf(app, "selectionChange")).toEqual([["2"]]);
    await app.clock!.runFor(120);
    expect(app.shows("role:listbox")).toBe(false);
    expect(callsOf(app, "openChange")).toEqual([
      [true],
      [false],
      [true],
      [false],
      [true],
      [false],
    ]);

    const multi = await openSelect("items-multiple");
    await multi.press("id:select-trigger");
    await multi.press("role:option[Two]");
    expect(callsOf(multi, "selectionChange")).toEqual([[["2"]]]);
    expect(multi.shows("role:listbox")).toBe(true);
    expect(callsOf(multi, "openChange")).toEqual([[true]]);

    // Non-modal: no underlay, a press on the trigger itself toggles closed.
    const nonModal = await openSelect("items-outside", { nonmodal: "1" });
    await nonModal.press("id:select-trigger");
    expect(nonModal.shows("role:listbox")).toBe(true);
    await nonModal.press("id:outside");
    await nonModal.waitFor("role:listbox", { state: "gone" });
    expect(callsOf(nonModal, "openChange")).toEqual([[true], [false]]);

    // isKeyboardDismissDisabled blocks Escape on the panel carrier.
    const kb = await openSelect("items", { kbdDismiss: "1" });
    await kb.press("id:select-trigger");
    await kb.keyboard.press("escape");
    await kb.clock!.runFor(200);
    expect(kb.shows("role:listbox")).toBe(true);
    expect(callsOf(kb, "openChange")).toEqual([[true]]);

    // Disabled root: the press is refused and nothing opens.
    const disabled = await openSelect("items-disabled");
    await expect(
      disabled.press("id:select-trigger"),
    ).rejects.toMatchObject({ code: "ERR_NSH_TEST_DISABLED" });
    expect(disabled.shows("role:listbox")).toBe(false);
    expect(callsOf(disabled, "openChange")).toHaveLength(0);

    // Alias path: `onChange` reports the selection, `value` holds it.
    const alias = await openSelect("states-plain");
    await alias.press("id:select-trigger");
    await alias.press("role:option[Texas]");
    expect(callsOf(alias, "selectionChange")).toEqual([["texas"]]);

    // disallowEmptySelection keeps the selection non-empty on re-press.
    const disallow = await openSelect("items-disallow-empty");
    await disallow.press("id:select-trigger");
    await disallow.press("role:option[Two]");
    expect(select.triggerShows(disallow, "Two")).toBe(true);
    expect(disallow.shows("role:listbox >> text:✓")).toBe(true);

    // disabledKeys: the row is inert.
    const disabledKeys = await openSelect("items-disabled-keys");
    await disabledKeys.press("id:select-trigger");
    await expect(
      disabledKeys.press("role:option[Two]"),
    ).rejects.toMatchObject({ code: "ERR_NSH_TEST_DISABLED" });
    expect(callsOf(disabledKeys, "selectionChange")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/select.md M-019 (A-013, A-014): the fixture machinery
  // itself — the dual environments mount, the params switch the carrier,
  // and every probe (`sel-pop-*`, `layout`, `events`, `ctx-*`, `ctx2-*`,
  // `pan`, `ctx-sample`) answers.
  test("M-019 fixture: environments, params and every probe mount and answer", async () => {
    for (const input of ["", "touch"] as const) {
      const params: Record<string, string> = { layout: "1" };
      if (input) {
        params.input = input;
        params.width = "compact";
      }

      const app = await openSelect("states-clear", { ...params, ctx2: "1" });
      expect(app.shows("id:select-trigger")).toBe(true);

      // The on-demand samplers answer while the field is closed — the
      // sampled contexts live on the trigger seam, not the popover, and a
      // press while open can never reach a flow element (the modal underlay
      // swallows it; on Android the in-popover copy had no native view at
      // all — the registered overlay-registry gap that timed this row out).
      await app.press("id:ctx-sample");
      await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
      await app.press("id:ctx2-sample");
      await app.waitUntil(() => callsOf(app, "ctx2-channels").length > 0);

      await app.press("id:select-trigger");
      expect(eventArgs(app)).toEqual(["down", "up", "press"]);
      expect(callsOf(app, "layout").length).toBeGreaterThan(0);
      expect(callsOf(app, "ctx-env").length).toBeGreaterThan(0);
      expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(input === "touch");
      expect(callsOf(app, "ctx2-env").length).toBeGreaterThan(0);
      await app.waitUntil(() => callsOf(app, "pan").length > 0);
      // touch+compact resolves the sheet carrier → the pan context exists;
      // the panel carrier supplies none.
      if (input === "touch") {
        expect(panFor(app, "sheet").panKeys).toBeGreaterThanOrEqual(1);
      } else {
        expect(panFor(app, "panel").panKeys).toBe(-1);
      }
    }

    // The carrier probes discriminate under injection and pins.
    const injected = await openSelect("states", {
      input: "touch",
      width: "compact",
    });
    await injected.press("id:select-trigger");
    await injected.waitFor("id:sel-pop-sheet");
    expect(injected.count("id:sel-pop-panel")).toBe(0);

    const dialog = await openSelect("states", { presentation: "fullscreen" });
    await dialog.press("id:select-trigger");
    expect(dialog.count("id:sel-pop-dialog")).toBe(1);

    const narrow = await openSelect("states", { narrow: "1", layout: "1" });
    await narrow.waitUntil(() => layouts(narrow, "trigger").length > 0);
    const narrowBox = lastLayout(narrow, "trigger");
    expect(narrowBox.width).toBe(40);
    expect(narrowBox.height).toBeLessThan(44);

    const keepopen = await openSelect("items", {
      keepopen: "1",
      input: "touch",
      width: "compact",
    });
    await keepopen.press("id:select-trigger");
    await keepopen.waitFor("id:sel-pop-sheet");
    await keepopen.press("role:option[Two]");
    expect(keepopen.count("id:sel-pop-sheet")).toBe(1);
    expect(keepopen.count("role:listbox >> text:✓")).toBe(1);
    // 5 opens × the ~5s native host relaunch each — logged past the 30s
    // default on iOS (run 45344508005).
  }, 120_000);
});
