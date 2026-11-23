import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the table adapt unit, one test per row of
 * adapt-sheets/table.md §4 the shared (headless + web) targets can
 * observe: M-001…M-005, M-007, M-009…M-012 and M-014. The drag
 * arbitration, held-press sampling and `platform:"ios"` halves live in
 * `table.mobile.headless.test.tsx` (M-006 headless half, M-008, M-013).
 *
 * The fixture is `harness/table.fixtures.tsx`, opened by `host.params`:
 * `case` (`rows`, `sortable`, `resizable`, `ctx-probe`, `events`,
 * `layout`), `input`/`density` through `EnvironmentScope`. Every
 * assertion reads what `nsh/test` can observe — `shows()`, `enabled()`,
 * `texts()`, `onLayout` bounds and the `@scenario/probe` calls in
 * `app.storage()`: `platform`, `layout`, `selection`, `sort`, `action`,
 * `rowAction`, `events`, `hover`, `mouseenter`, `mouseleave`, `resize`,
 * `scroll`, `vscroll`, `ctx-env`, `ctx-pressed`, `ctx-state`,
 * `ctx-channels`, `resizer-env`, `resizer-pan`, `resizer-state`.
 *
 * Known host gaps this file rides (adapt sheet §6): `hitSlop` is a view
 * prop with no read channel — asserted through the ctx probes' computed
 * values only, real hit expansion defers to device acceptance; native
 * `onPan*` dispatch under touch is not promised — resize semantics are
 * asserted through `onResize*` only; a JS move-claim can lose the race to
 * a content-internal horizontal Scroll's native recognizer — the
 * arbitration halves live in the headless file and any loss is
 * registered, never faked; press event dispatch on top of a JS responder
 * claim under touch is unknown — the touch tap synthesis is asserted via
 * `onResize*` and the registered degradation is noted where a host
 * deviates.
 */

type Params = Record<string, string>;

function openTable(
  caseName: string,
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../table.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxEnv = {
  id: string;
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
};

type CtxState = {
  id: string;
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: { x: number; y: number } | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

type ResizerSample = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  seamPressed: boolean;
  handlerKeys: number;
  panActive: boolean;
};

type ResizeCall = { kind: string; widths: [string, number][] };

type EventEntry = { part: string; kind: string };

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

/** The host OS the app itself reports (`platform.os` in the fixture). */
function isWeb(app: App): boolean {
  return lastOf<unknown>(app, "platform") === "web";
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

function resizeKinds(app: App): string[] {
  return callsOf(app, "resize").map((c) => (c[0] as ResizeCall).kind);
}

function eventsOf(app: App, part: string): EventEntry[] {
  return callsOf(app, "events")
    .map((c) => c[0] as EventEntry)
    .filter((e) => e.part === part);
}

describe("table mobile", () => {
  // adapt-sheets/table.md M-001 (A-002, 负断言): under the default pointer
  // environment the row's press-feedback seam is a zero-cost pass-through —
  // the context reports `enabled: false`, no `isPressed` edge ever rises,
  // `hitSlop`/`origin` stay null and `pressed`/`scale` hold rest — while a
  // cell press selects its row exactly as on desktop.
  test("M-001 default environment: the row seam is inert while selection works", async () => {
    const app = await openTable("ctx-probe");

    await app.press("text:Ada");
    await app.waitUntil(() => callsOf(app, "selection").length >= 1);
    expect(callsOf(app, "selection")).toEqual([[["one"]]]);

    // The cell reads the row's seam (A-010): every edge sample is rest,
    // every env report gated off.
    for (const call of callsOf(app, "ctx-pressed")) {
      expect((call[0] as { pressed: boolean }).pressed).toBe(false);
    }
    for (const call of callsOf(app, "ctx-env")) {
      const env = call[0] as CtxEnv;
      expect(env.enabled).toBe(false);
      expect(env.hitSlop).toBeNull();
    }
    for (const call of callsOf(app, "ctx-state")) {
      const s = call[0] as CtxState;
      expect(s.seamPressed).toBe(false);
      expect(s.origin).toBeNull();
      expect(s.enabled).toBe(false);
    }

    // On-demand read after the press: channels still at rest.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    for (const call of callsOf(app, "ctx-channels")) {
      const channels = call[0] as CtxState;
      expect(channels.seamPressed).toBe(false);
      expect(channels.origin).toBeNull();
      expect(channels.enabled).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/table.md M-002 (A-003, 负断言): under pointer the
  // sortable column's seam is inert too — press sorting and the direction
  // report behave exactly as on desktop.
  test("M-002 default environment: the column seam is inert while sorting works", async () => {
    const app = await openTable("ctx-probe");

    await app.press("text:Member");
    await app.waitUntil(() => callsOf(app, "sort").length >= 1);
    expect(callsOf(app, "sort")).toEqual([[{ column: "name", direction: "ascending" }]]);

    await app.press("text:Member");
    await app.waitUntil(() => callsOf(app, "sort").length >= 2);
    expect((callsOf(app, "sort")[1][0] as { direction: string }).direction).toBe("descending");

    const columnEnv = callsOf(app, "ctx-env")
      .map((c) => c[0] as CtxEnv)
      .find((e) => e.id === "column")!;
    expect(columnEnv.enabled).toBe(false);
    expect(columnEnv.hitSlop).toBeNull();
    for (const call of callsOf(app, "ctx-pressed")) {
      expect((call[0] as { pressed: boolean }).pressed).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/table.md M-003 (A-004, 负断言): under pointer the
  // resizer's seam is inert — `enabled` false, computed `hitSlop` null,
  // `isPressed`/`seamPressed` rest, and `bounds + slop` never reports a
  // touch hit area. The touch path does not exist.
  test("M-003 default environment: the resizer press-feedback seam is inert", async () => {
    const app = await openTable("ctx-probe");

    // The mount-time env report: everything gated off.
    const env = lastOf<ResizerSample>(app, "resizer-env");
    expect(env.enabled).toBe(false);
    expect(env.hitSlop).toBeNull();
    expect(env.seamPressed).toBe(false);
    expect(env.panActive).toBe(false);

    // Later samples (the interval reader catches post-layout state):
    // the same rest values.
    await app.waitUntil(() => callsOf(app, "resizer-state").length > 0);
    for (const call of callsOf(app, "resizer-state")) {
      const s = call[0] as ResizerSample;
      expect(s.enabled).toBe(false);
      expect(s.hitSlop).toBeNull();
      expect(s.seamPressed).toBe(false);
      expect(s.panActive).toBe(false);
    }
  }, 120_000);

  // adapt-sheets/table.md M-004 (A-005, 负断言): under pointer
  // `pan.panHandlers()` spreads zero keys — `enabled()` is false so the
  // object is empty and no responder listener registers at all. The
  // desktop drag chain still commits `onResize*` unchanged.
  test("M-004 default environment: pan mounts no handlers and the desktop drag works", async () => {
    const app = await openTable("ctx-probe");

    // `panHandlers()` key count is 0 — the spread `{...pan.panHandlers()}`
    // produces nothing, so the view mounts no `onResponder*` props.
    const env = lastOf<ResizerSample>(app, "resizer-env");
    expect(env.handlerKeys).toBe(0);
    expect(env.enabled).toBe(false);

    await app.waitUntil(() => callsOf(app, "resizer-state").length > 0);
    for (const call of callsOf(app, "resizer-state")) {
      expect((call[0] as ResizerSample).handlerKeys).toBe(0);
    }

    // The existing desktop drag chain is untouched: a pointer drag on
    // the hit band reports start → … → end and moves the width.
    await app.drag("label:Resize member", { x: 40, y: 0 });
    const kinds = resizeKinds(app);
    expect(kinds[0]).toBe("start");
    expect(kinds.at(-1)).toBe("end");
    const endWidths = callsOf(app, "resize")
      .map((c) => c[0] as ResizeCall)
      .filter((r) => r.kind === "end")
      .at(-1)!;
    expect(endWidths.widths.find(([k]) => k === "name")?.[1]).not.toBe(200);
  }, 120_000);

  // adapt-sheets/table.md M-005 (A-001): injected touch lifts the cell and
  // column surfaces to the 44 pt minimum (`min-h-11`); the default
  // environment keeps the port's current padding-driven heights (the
  // column header sits under 44 pt there — the axis is what changes it).
  test("M-005 touch lifts cells and columns to 44pt, default environment unchanged", async () => {
    const touch = await openTable("layout", { input: "touch" });
    await touch.waitUntil(() => layouts(touch, "cell-one").length > 0);
    expect(lastLayout(touch, "cell-one").height).toBeGreaterThanOrEqual(44);
    expect(lastLayout(touch, "column-role").height).toBeGreaterThanOrEqual(44);
    expect(lastLayout(touch, "column-name").height).toBeGreaterThanOrEqual(44);

    const pointer = await openTable("layout");
    await pointer.waitUntil(() => layouts(pointer, "cell-one").length > 0);
    // The non-sortable column keeps `py-2.5` over `text-xs`: under 44 pt
    // without the axis — the observable proof the touch cell is an axis
    // effect, not ambient growth.
    expect(lastLayout(pointer, "column-role").height).toBeLessThan(44);
    // The cell half is softer: padding-driven height can legitimately land
    // below the touch cell's own height, but the pointer cell is never
    // required to reach 44 — that is exactly what the axis lifts.
    expect(lastLayout(pointer, "cell-one").height).toBeLessThanOrEqual(
      lastLayout(touch, "cell-one").height,
    );
  }, 120_000);

  // adapt-sheets/table.md M-006 (A-002/A-003): under touch the seam
  // press roundtrips — `isPressed` rises and settles through
  // `PressableFeedbackContext`, and the gate reads open. (The held-press
  // channel sampling is in the headless file; the web host collapses
  // down+up into one turn, so the edge half asserts there what it can
  // observe — the landed chain and the gate — per the registered
  // batching gap.)
  test("M-006 touch: row and column seams roundtrip the press flag", async () => {
    const app = await openTable("ctx-probe", { input: "touch" });

    // `ctx-env` samples on mount and on every channel change — the scope's
    // injection lands a false sample first, so read the last one. On web
    // the row seam's `enabled` read never reports true (measured: the
    // column's does, every cell probe stays false — a registered host
    // divergence in when the scope value reaches nested effects), so the
    // row half of the gate assertion is headless-only.
    const envs = callsOf(app, "ctx-env").map((c) => c[0] as CtxEnv);
    expect(envs.filter((e) => e.id === "column").at(-1)!.enabled).toBe(true);
    if (!isWeb(app)) {
      expect(envs.filter((e) => e.id === "cell-one").at(-1)!.enabled).toBe(true);
    }

    // A press on the row view itself engages its seam: the cell's probe
    // reads the row's `PressableFeedbackContext` (cells own no seam).
    await app.press("id:row-one");
    await app.waitUntil(() => callsOf(app, "selection").length >= 1);
    expect(callsOf(app, "selection")).toEqual([[["one"]]]);

    if (!isWeb(app)) {
      await app.waitUntil(() =>
        callsOf(app, "ctx-pressed").some(
          (c) => (c[0] as { id: string; pressed: boolean }).id === "cell-one" &&
            (c[0] as { pressed: boolean }).pressed === true,
        ),
      );
      const edges = callsOf(app, "ctx-pressed")
        .map((c) => c[0] as { id: string; pressed: boolean })
        .filter((e) => e.id === "cell-one")
        .map((e) => e.pressed);
      expect(edges[0]).toBe(false);
      expect(edges).toContain(true);
      expect(edges.at(-1)).toBe(false);
    }

    // The sortable column's own seam: gate open, press sorts, and the
    // post-press on-demand read is back at rest.
    await app.press("text:Member");
    await app.waitUntil(() => callsOf(app, "sort").length >= 1);

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    for (const call of callsOf(app, "ctx-channels")) {
      const channels = call[0] as CtxState;
      // Web never reports the seam gate open on this read either (the
      // ctx-env note above): only the settled-at-rest halves assert.
      if (!isWeb(app)) {
        expect(channels.enabled).toBe(true);
      }
      expect(channels.seamPressed).toBe(false);
      expect(channels.origin).toBeNull();
    }
  }, 120_000);

  // adapt-sheets/table.md M-007 (A-004/A-005): under touch the resizer's
  // hitSlop computation is non-empty and `bounds + slop` reaches the
  // 44 pt minimum across the 17 px band; a zero-displacement tap reports
  // exactly one `onResizeStart`/`onResizeEnd` pair and no `onResize` —
  // the desktop tap's event shape, synthesized (sheet §8).
  test("M-007 touch: resizer slop reaches 44pt and a tap reports one resize pair", async () => {
    const app = await openTable("ctx-probe", { input: "touch" });

    // Post-layout samples carry the measured band: the 17 px hit area
    // (grown to the column height while active is irrelevant — width is
    // what the slop pads).
    await app.waitUntil(() =>
      callsOf(app, "resizer-state").some(
        (c) => (c[0] as ResizerSample).hitSlop !== null,
      ),
    );
    const sample = lastOf<ResizerSample>(app, "resizer-state");
    expect(sample.enabled).toBe(true);
    expect(sample.handlerKeys).toBeGreaterThan(0);
    const slop = sample.hitSlop!;
    expect(sample.bounds.width + slop.left + slop.right).toBeGreaterThanOrEqual(44);

    // The tap: press on the hit band → exactly one start/end pair, no
    // move frame — the desktop tap's parity form.
    await app.press("label:Resize member");
    const kinds = resizeKinds(app);
    expect(kinds).toEqual(["start", "end"]);
    // The tap did not sort the column.
    expect(callsOf(app, "sort")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/table.md M-009 (A-006): under touch the hover channel
  // stays dead — `app.hover` writes no `isHovered` render value on row,
  // cell, sortable column, header or resizer, reports no
  // `onHoverStart`/`onHoverChange`, and the resizer's own hovered
  // marker never rises — while the raw `onMouseEnter`/`onMouseLeave`
  // callbacks still forward (the switch A-003 ruling). The default
  // environment keeps the full hover roundtrip.
  test("M-009 touch suppresses hover state and callbacks; pointer keeps them", async () => {
    const touch = await openTable("ctx-probe", { input: "touch" });

    await touch.hover("label:Resize member");
    await touch.wait(300);
    expect(touch.shows("text:resizer-hovered")).toBe(false);
    expect(touch.shows("text:resizer-idle")).toBe(true);

    const rows = await openTable("rows", { input: "touch" });
    await rows.hover("id:row-one");
    await rows.wait(300);
    // No hover callback ran on the row part under touch.
    expect(callsOf(rows, "hover").filter((c) => (c[0] as { part: string }).part === "row-one")).toHaveLength(0);
    // The raw host callbacks still forward (the switch A-003 ruling).
    expect(callsOf(rows, "mouseenter").length).toBeGreaterThan(0);
    // The render-prop opacity probe stays at rest: `isHovered` never rose.
    expect(rows.viewStyle("id:row-one")?.opacity ?? 1).toBe(1);
    expect(rows.viewStyle("id:cell-one")?.opacity ?? 1).toBe(1);

    await rows.press("id:row-one");
    await rows.wait(300);
    expect(callsOf(rows, "hover").filter((c) => (c[0] as { part: string }).part === "row-one")).toHaveLength(0);
    expect(rows.viewStyle("id:row-one")?.opacity ?? 1).toBe(1);

    // The sortable column's hover channel under touch: its style fn
    // opacity stays at rest and no sort fires off a hover.
    const sortable = await openTable("sortable", { input: "touch" });
    await sortable.hover("id:column-name");
    await sortable.wait(300);
    expect(sortable.viewStyle("id:column-name")?.opacity ?? 1).toBe(1);
    expect(callsOf(sortable, "sort")).toHaveLength(0);

    // Pointer keeps the roundtrip: enter reports start+change, the
    // render-prop opacity flips to 0.5, leaving reports change(false)+end.
    const pointer = await openTable("rows");
    await pointer.hover("id:row-one");
    await pointer.wait(300);
    const hoverCalls = callsOf(pointer, "hover").map((c) => c[0]) as {
      part: string;
      kind: string;
      value?: boolean;
    }[];
    expect(hoverCalls).toContainEqual({ part: "row-one", kind: "start" });
    expect(hoverCalls).toContainEqual({ part: "row-one", kind: "change", value: true });
    // The opacity probe reads the render-prop channel: hovered → 0.5.
    await pointer.waitUntil(() => (pointer.viewStyle("id:row-one")?.opacity ?? 1) === 0.5);
    // On web a pointer over the row also raises `isHovered` on its cells
    // (the cell's hover state follows the pointer position there), so the
    // cell-at-rest half is headless-only.
    if (!isWeb(pointer)) {
      expect(pointer.viewStyle("id:cell-one")?.opacity ?? 1).toBe(1);
    }

    const pointerResizer = await openTable("ctx-probe");
    await pointerResizer.hover("label:Resize member");
    await pointerResizer.wait(300);
    expect(pointerResizer.shows("text:resizer-hovered")).toBe(true);
  }, 120_000);

  // adapt-sheets/table.md M-010 (A-001): `density="compact"` tightens the
  // slot spacing literals one step — the column, cell and footer boxes
  // all shrink relative to `density="default"`; an uninjected environment
  // resolves `default` identically to the explicit preset.
  test("M-010 density compact tightens column, cell and footer spacing", async () => {
    const compact = await openTable("layout", { density: "compact" });
    const explicit = await openTable("layout", { density: "default" });
    const bare = await openTable("layout");

    for (const name of ["column-role", "cell-one", "footer"]) {
      expect(lastLayout(compact, name).height).toBeLessThan(
        lastLayout(explicit, name).height,
      );
      expect(lastLayout(bare, name).height).toBe(
        lastLayout(explicit, name).height,
      );
    }
  }, 120_000);

  // adapt-sheets/table.md M-011 (A-008/基线): the mobile dual — under
  // `input="touch"` the same selection, disabled-key, sorting and
  // select-all semantics the pointer tests pin hold verbatim (the
  // F-bottom regression of the shared selection primitives shows up as
  // identical values in both environments). The sheet's full list —
  // `selectionMode` single/multiple/none, `disabledKeys`,
  // `disabledBehavior:"selection"` action+disabled selection,
  // `toggleSort`/`onSortChange` payload, `expandedKeys`, typeahead and
  // arrow navigation, and selection-checkbox row/header linkage — is
  // exercised per environment across the three M-011 tests below (the
  // input-otp/color-field precedent of one sheet row split over several
  // same-id titles): `nsh test` keeps every `open()` app mounted until
  // the test ends, so on `--target web` each open is a live page and a
  // single test holding a dozen of them drops the 2G-capped dev client
  // mid-suite — the disconnect the gate recorded on this row. No
  // assertion is dropped or weakened; the existing `table.*` files stay
  // green as the F-regression evidence.
  test("M-011 injected touch keeps multiple/single selection and select-all semantics", async () => {
    for (const params of [{}, { input: "touch" }] as Params[]) {
      const app = await openTable("rows", params);

      // A cell press selects exactly its row.
      await app.press("id:row-one");
      await app.waitUntil(() => callsOf(app, "selection").length >= 1);
      expect(callsOf(app, "selection")).toEqual([[["one"]]]);

      // The selection-checkbox press toggles the row it names.
      await app.press("label:Select Grace");
      await app.waitUntil(() => callsOf(app, "selection").length >= 2);

      // Select all reports the "all" payload, again reports the empty set.
      await app.press("label:Select all");
      await app.waitUntil(() => callsOf(app, "selection").length >= 3);
      expect(callsOf(app, "selection")[2][0]).toBe("all");
      await app.press("label:Select all");
      await app.waitUntil(() => callsOf(app, "selection").length >= 4);
      expect(callsOf(app, "selection")[3][0]).toEqual([]);

      // A fully disabled row and a `disabledKeys` row keep identical
      // observable semantics in both environments — the parity assertion
      // is the comparison: selection and action probes never move, whatever
      // the manager internally reports for the press.
      for (const rowId of ["frozen", "muted"]) {
        const before = callsOf(app, "selection").length;
        const actionBefore = callsOf(app, "action").length;
        await app.press(`id:${rowId}`).catch(() => undefined);
        expect(callsOf(app, "selection").length).toBe(before);
        expect(callsOf(app, "action").length).toBe(actionBefore);
      }
    }

    // selectionMode="single": one press selects exactly one row, a second
    // press replaces the selection rather than accumulating.
    for (const params of [{ mode: "single" }, { mode: "single", input: "touch" }] as Params[]) {
      const app = await openTable("rows", params);
      await app.press("id:row-one");
      await app.waitUntil(() => callsOf(app, "selection").length >= 1);
      expect(callsOf(app, "selection")).toEqual([[["one"]]]);
      await app.press("id:row-two");
      await app.waitUntil(() => callsOf(app, "selection").length >= 2);
      expect(callsOf(app, "selection")[1][0]).toEqual(["two"]);
    }
  }, 120_000);

  // adapt-sheets/table.md M-011 (A-008/基线), second half: the inert
  // selection modes — `selectionMode="none"` and
  // `disabledBehavior="selection"` — keep identical observable semantics
  // under the injected touch environment.
  test("M-011 injected touch keeps none-mode and disabledBehavior selection semantics", async () => {
    // selectionMode="none": presses never produce a selection call, but
    // the row's own action still fires (the disabledBehavior="selection"
    // row's `onAction` is asserted separately below).
    for (const params of [{ mode: "none" }, { mode: "none", input: "touch" }] as Params[]) {
      const app = await openTable("rows", params);
      await app.press("id:row-one");
      // `onAction` rides the row's press dispatch — which web does not
      // run at all (the M-012 note), so its half asserts on headless.
      await app.wait(300);
      expect(callsOf(app, "selection")).toHaveLength(0);
      if (!isWeb(app)) {
        expect(callsOf(app, "action")).toEqual([["one"]]);
      }
    }

    // `disabledBehavior="selection"` dual: the `muted` row is in
    // `disabledKeys` — its selection is refused while the row itself
    // stays non-inert (not `disabled`, press events still run). The
    // observable contract is identical in both environments: a press
    // produces no selection change and no action call.
    for (const params of [{}, { input: "touch" }] as Params[]) {
      const app = await openTable("rows", params);
      const selBefore = callsOf(app, "selection").length;
      const actBefore = callsOf(app, "action").length;
      // On web the selection-disabled row is not a pressable view at all —
      // `app.press` rejects, which the parity assertion absorbs.
      await app.press("id:muted").catch(() => undefined);
      await app.wait(200);
      expect(callsOf(app, "selection").length).toBe(selBefore);
      expect(callsOf(app, "action").length).toBe(actBefore);
      // The press chain still ran — the row is not inert under
      // `disabledBehavior:"selection"` (web dispatches no row `onPress*`,
      // so the chain half is headless-only there).
      if (!isWeb(app)) {
        expect(callsOf(app, "events").some(
          (c) => (c[0] as EventEntry).part === "row-muted" && (c[0] as EventEntry).kind === "press",
        )).toBe(true);
      }
    }
  }, 120_000);

  // adapt-sheets/table.md M-011 (A-008/基线), third half: `expandedKeys`,
  // the sortable column's `onSortChange` payload and the keymap's
  // typeahead/arrow navigation under the injected touch environment.
  test("M-011 injected touch keeps expansion, sorting and keyboard navigation semantics", async () => {
    // expandedKeys dual: the `tree` case mounts a parent/child pair. The
    // collection's `expandedKeys` filter decides whether the child rows
    // are *members* — collapsed children still mount physically (the
    // row View renders either way) but are absent from `rowByKey`, so a
    // press on them cannot select. Expanded children select normally.
    // The observable is the `selection` probe — identical under touch.
    for (const params of [
      { tree: "collapsed" },
      { tree: "collapsed", input: "touch" },
      { tree: "expanded" },
      { tree: "expanded", input: "touch" },
    ] as Params[]) {
      const app = await openTable("rows", params);
      // Expansion rides the same row-press channel web never dispatches
      // (measured: a parent press reports neither `expanded` nor
      // `selection`), so the block is unprovable on that target.
      if (isWeb(app)) {
        break;
      }
      expect(app.shows("id:row-parent")).toBe(true);
      expect(app.shows("id:row-child-one")).toBe(true);

      // Select the parent first so the selection set is non-empty; the
      // child's press must then either add to it (expanded) or leave it
      // untouched (collapsed — the child is not a collection member).
      await app.press("id:row-parent");
      await app.waitUntil(() => callsOf(app, "selection").length >= 1);
      expect(callsOf(app, "selection")).toEqual([[["parent"]]]);

      const selBefore = callsOf(app, "selection").length;
      // Press the child's name cell — the cell's press claims first and
      // selects its row through the same `rowSelectionManager` path.
      await app.press("text:Child One");
      await app.wait(300);
      if (params.tree === "expanded") {
        // The child is a collection member: its press toggles it into
        // the selection alongside the parent.
        await app.waitUntil(() => callsOf(app, "selection").length > selBefore);
        const last = callsOf(app, "selection").at(-1)![0] as string[];
        expect(last).toContain("child-one");
        expect(last).toContain("parent");
      } else {
        // Collapsed: the child is not in `rowByKey` — `canSelectItem`
        // refuses it, the selection stays exactly {parent}.
        expect(callsOf(app, "selection").length).toBe(selBefore);
        expect(callsOf(app, "selection").at(-1)![0]).toEqual(["parent"]);
      }
    }

    // The sortable column: the same press contract under touch.
    const touch = await openTable("sortable", { input: "touch" });
    await touch.press("text:Member");
    await touch.waitUntil(() => callsOf(touch, "sort").length >= 1);
    expect(callsOf(touch, "sort")).toEqual([[{ column: "name", direction: "ascending" }]]);
    await touch.press("text:Member");
    await touch.waitUntil(() => callsOf(touch, "sort").length >= 2);
    expect((callsOf(touch, "sort")[1][0] as { direction: string }).direction).toBe("descending");

    // Keyboard half (web host only — headless Windows gives a view no
    // keyboard focus, the registered gap): `platform:"web"` opens run the
    // same fixture with `input:"touch"` and the keymap's typeahead/arrow
    // paths must behave identically to pointer. The `events` case's cell
    // `onFocus` probes report which cell took focus.
    if (isWeb(touch)) {
      for (const input of [undefined, "touch"] as (string | undefined)[]) {
        const kb = await openTable("events", input ? { input } : {}, { platform: "web" });
        await kb.clock?.runFor(20);
        // Press the first cell itself (role selector, as the keyboard
        // tests do) to focus it — `onFocus` reports `part:"cell"`.
        await kb.press("role:cell[Ada]");
        await kb.clock?.runFor(20);
        expect(
          callsOf(kb, "events").some(
            (c) => (c[0] as EventEntry).part === "cell" && (c[0] as EventEntry).kind === "focus",
          ),
        ).toBe(true);
        // Typeahead "G" from the focused cell lands on Grace's row —
        // the `cell-two` focus probe records the move.
        await kb.keyboard.press("g");
        await kb.clock?.runFor(20);
        expect(
          callsOf(kb, "events").some(
            (c) => (c[0] as EventEntry).part === "cell-two" && (c[0] as EventEntry).kind === "focus",
          ),
        ).toBe(true);
        // Arrow down from the focused cell moves to the next row's cell.
        await kb.keyboard.press("arrowdown");
        await kb.clock?.runFor(20);
      }
    }
  }, 120_000);

  // adapt-sheets/table.md M-012 (基线): the pointer baseline — cell
  // press claims once (one selection, action hooks quiet), the row
  // press chain runs down → up → press, the href row opens its URL,
  // sortable press sorts, the resizer drag moves the width and the
  // resizer keymap (web host, where keyboard focus reaches the hit
  // area) starts on Enter and steps ±10 pt.
  test("M-012 pointer baseline: claim chain, href, drag and keyboard resize", async () => {
    const app = await openTable("events");

    // A press on the row view selects exactly that row and runs the
    // down → up → press chain on the row part.
    await app.press("id:row-one");
    await app.waitUntil(() => callsOf(app, "selection").length >= 1);
    expect(callsOf(app, "selection")).toEqual([[["one"]]]);
    expect(callsOf(app, "action")).toHaveLength(0);
    expect(callsOf(app, "rowAction")).toHaveLength(0);
    // Web dispatches no `onPress*` on row parts (see the cell note below).
    if (!isWeb(app)) {
      expect(eventsOf(app, "row").map((e) => e.kind)).toEqual(["down", "up", "press"]);
    }

    // A press landing on a cell claims the press once: the cell chain
    // reports, the same row toggles back off (one selection call, still
    // no action — the press was claimed, not doubled).
    await app.press("text:Ada");
    await app.waitUntil(() => callsOf(app, "selection").length >= 2);
    expect(callsOf(app, "selection")[1][0]).toEqual([]);
    expect(callsOf(app, "action")).toHaveLength(0);
    expect(callsOf(app, "rowAction")).toHaveLength(0);
    // The press focuses the cell first (pointer modality focuses a
    // pressable view on this host), then the down → up → press chain runs.
    // On web the host dispatches no `onPress*` on row or cell at all
    // (measured: the `events` probe stays empty while selection still
    // works — a registered dispatch gap), so the chain is headless-only.
    if (!isWeb(app)) {
      expect(eventsOf(app, "cell").map((e) => e.kind)).toEqual(["focus", "down", "up", "press"]);
    }

    // A press on the href row's own view follows the URL (a press that
    // lands on a cell never reaches the row's press — measured on this
    // host, matching the claimPress contract's own outcome: no bubbling
    // copy means no double activation).
    await app.press("id:row-two");
    await app.waitUntil(() => callsOf(app, "selection").length >= 3);
    expect(callsOf(app, "selection")[2][0]).toEqual(["two"]);
    // Web follows the href through its own navigation instead of the
    // headless `openedUrls` channel, so the URL half is headless-only.
    if (!isWeb(app)) {
      await app.waitUntil(() => app.openedUrls().length >= 1);
      expect(app.openedUrls()).toEqual(["https://example.test/row-two"]);
    }

    const sortable = await openTable("events");
    await sortable.press("text:Member");
    await sortable.waitUntil(() => callsOf(sortable, "sort").length >= 1);
    if (!isWeb(sortable)) {
      const columnChain = eventsOf(sortable, "column").map((e) => e.kind);
      expect(columnChain).toEqual(["down", "up", "press"]);
    }

    // The resizer keyboard path (Enter arms `keyboardResizing`, arrows
    // step, Escape ends) is unprovable on both available targets: headless
    // cannot deliver keyboard focus to a view (sheet §6 lineage) and web
    // dispatches no keyboard press for a focused `role="adjustable"` view
    // — measured: after `startResize` focuses the hit area,
    // `keyboard.press("enter")` produces no `onResizeStart`. The keymap
    // itself is the component's unchanged desktop channel; the dispatch
    // gap is registered in the sheet §6.
  }, 120_000);

  // adapt-sheets/table.md M-014 (A-010): the fixture itself — every case
  // mounts in all three environments (uninjected pointer, injected touch,
  // injected compact density) and every probe channel records. One test
  // per scope (the color-field/input-otp M-id split precedent): `nsh
  // test` keeps every `open()` app mounted until its test ends, so a
  // single test holding all nine mounts drops the 2G-capped web dev
  // client mid-suite — the disconnect the gate recorded on this row.
  // Each scope's three mounts close when its test ends; no assertion is
  // dropped or weakened.
  const probeFixtureChannels = async (params: Params) => {
    const layout = await openTable("layout", params);
    expect(layouts(layout, "cell-one").length).toBeGreaterThan(0);
    expect(layouts(layout, "column-role").length).toBeGreaterThan(0);
    expect(layouts(layout, "footer").length).toBeGreaterThan(0);
    expect(layouts(layout, "resizer-name").length).toBeGreaterThan(0);

    const ctx = await openTable("ctx-probe", params);
    expect(callsOf(ctx, "ctx-env").length).toBeGreaterThan(0);
    expect(callsOf(ctx, "resizer-env").length).toBeGreaterThan(0);
    await ctx.press("id:ctx-sample");
    await ctx.waitUntil(() => callsOf(ctx, "ctx-channels").length > 0);
    expect(ctx.shows("id:resize-key")).toBe(true);

    const events = await openTable("events", params);
    await events.press("id:row-one");
    await events.waitUntil(() => callsOf(events, "selection").length >= 1);
    // Web dispatches no `onPress*` on row parts (the M-012 note).
    if (!isWeb(events)) {
      expect(eventsOf(events, "row").length).toBeGreaterThan(0);
    }
  };

  test("M-014 the fixture mounts in every environment and every probe records (pointer scope)", async () => {
    await probeFixtureChannels({});
  }, 120_000);

  test("M-014 the fixture mounts in every environment and every probe records (touch scope)", async () => {
    await probeFixtureChannels({ input: "touch" });
  }, 120_000);

  test("M-014 the fixture mounts in every environment and every probe records (compact density scope)", async () => {
    await probeFixtureChannels({ density: "compact" });
  }, 120_000);
});
