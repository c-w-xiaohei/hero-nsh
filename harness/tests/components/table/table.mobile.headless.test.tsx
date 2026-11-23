import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the table adapt unit — the rows
 * of adapt-sheets/table.md §4 that need what only the headless engine
 * proves: M-006's held-press channel sampling (`dragAndHold`), M-008's
 * drag arbitration against the horizontal Scroll's native recognizer
 * (`app.drag` drives the responder chain only here — on web the
 * synthesized drag does not drive the Scroll recognizer, the same
 * boundary slider/sheet-handoff §5 registered) and M-013's
 * `open({platform:"ios"})` host derivation.
 *
 * The fixture is `harness/table.fixtures.tsx` — same `case` surface as
 * `table.mobile.test.tsx` (`ctx-probe`, `resizable`, `layout`), with
 * `input`/`density` injection or the ios host's own derivation.
 */

type Params = Record<string, string>;

function openTable(
  caseName: string,
  params: Params = {},
  options: { platform?: "windows" | "ios"; width?: number; height?: number } = {},
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
type ScrollCall = { x: number; y: number };
type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function resizeKinds(app: App): string[] {
  return callsOf(app, "resize").map((c) => (c[0] as ResizeCall).kind);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const list = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
  return list[list.length - 1];
}

describe("table mobile (headless)", () => {
  // adapt-sheets/table.md M-006 headless half: a held press on a row
  // reads the seam mid-hold — `isPressed` true, `pressed` driven toward
  // 1, an origin recorded — then settles on release.
  test("M-006 headless: a held press samples the seam mid-hold", async () => {
    const app = await openTable("ctx-probe", { input: "touch" });

    // The seam belongs to the row: a press resolved onto the cell view
    // (`text:Ada`) never reaches the row's press channel on this host
    // (measured — no down/up bubble), so the hold lands on the row view.
    await app.dragAndHold("id:row-one", { x: 0, y: 0 });
    await app.waitUntil(() =>
      callsOf(app, "ctx-state").some(
        (c) => (c[0] as CtxState).seamPressed === true,
      ),
    );
    const held = callsOf(app, "ctx-state")
      .map((c) => c[0] as CtxState)
      .filter((s) => s.seamPressed === true)
      .at(-1)!;
    expect(held.enabled).toBe(true);
    expect(held.origin).not.toBeNull();
    await app.drop();

    // The released seam settles: the last edge for the cell is rest.
    await app.waitUntil(() =>
      callsOf(app, "ctx-pressed")
        .map((c) => c[0] as { id: string; pressed: boolean })
        .filter((e) => e.id === "cell-one")
        .at(-1)?.pressed === false,
    );
  }, 120_000);

  // adapt-sheets/table.md M-008 (A-005/A-007): the arbitration matrix on
  // the `resizable` case under injected touch —
  //
  //   resizer + horizontal drag → the JS pan claims: onResizeStart →
  //     onResize* → onResizeEnd, the width moves with dx and the
  //     horizontal container's offset.x never advances (the resizer
  //     wins the horizontal claim over the Scroll it lives inside).
  //   cell + horizontal drag    → no JS claim exists on a row, so the
  //     horizontal Scroll's native recognizer takes the gesture:
  //     offset.x advances, nothing selects and no resize fires.
  //   resizer + vertical drag   → shouldClaim fails on a |dy|-dominant
  //     first frame: zero `onResize*` calls and the outer vertical
  //     Scroll's offset.y advances (the gesture is yielded, not stuck).
  test("M-008 touch: resizer wins horizontal, rows yield to scroll, vertical yields", async () => {
    const app = await openTable("resizable", { input: "touch" });

    // A horizontal drag on the resizer claims the gesture: the full
    // resize sequence lands and the width follows dx.
    await app.drag("label:Resize member", { x: 40, y: 0 });
    const kinds = resizeKinds(app);
    expect(kinds[0]).toBe("start");
    expect(kinds).toContain("move");
    expect(kinds.at(-1)).toBe("end");
    const endWidths = callsOf(app, "resize")
      .map((c) => c[0] as ResizeCall)
      .filter((r) => r.kind === "end")
      .at(-1)!;
    const nameWidth = endWidths.widths.find(([k]) => k === "name")?.[1];
    expect(nameWidth).toBeGreaterThan(240);
    // The claim held against the container's own horizontal scroll:
    // offset.x stayed at rest for the whole drag.
    const scrollCalls = callsOf(app, "scroll").map((c) => c[0] as ScrollCall);
    expect(scrollCalls.every((s) => s.x === 0)).toBe(true);
    // And nothing sorted or selected off the resize gesture.
    expect(callsOf(app, "selection")).toHaveLength(0);

    // A horizontal drag on a cell has no JS claim — the container's
    // native recognizer takes it: offset.x advances while selection and
    // resize stay silent.
    const resizeBefore = callsOf(app, "resize").length;
    const scrollBefore = scrollCalls.length;
    await app.drag("text:Ada", { x: -60, y: 0 });
    await app.waitUntil(() =>
      callsOf(app, "scroll").some((c) => (c[0] as ScrollCall).x > 0),
    );
    const after = callsOf(app, "scroll").map((c) => c[0] as ScrollCall);
    expect(after.at(-1)!.x).toBeGreaterThan(0);
    expect(callsOf(app, "resize").length).toBe(resizeBefore);
    expect(callsOf(app, "selection")).toHaveLength(0);
    void scrollBefore;

    // A vertical drag on the resizer fails `shouldClaim` on the first
    // frame: no resize of any kind, and the gesture travels to the
    // outer vertical scroll instead.
    const resizeBeforeV = callsOf(app, "resize").length;
    await app.drag("label:Resize member", { x: 0, y: -80 });
    await app.waitUntil(() =>
      callsOf(app, "vscroll").some((c) => (c[0] as ScrollCall).y > 0),
    );
    expect(callsOf(app, "resize").length).toBe(resizeBeforeV);
    const v = callsOf(app, "vscroll").map((c) => c[0] as ScrollCall);
    expect(v.at(-1)!.y).toBeGreaterThan(0);
  }, 120_000);

  // adapt-sheets/table.md M-013 (A-002/A-004/A-005): `open({platform:"ios"})`
  // — no `EnvironmentScope` — derives `input==="touch"` from the host
  // itself: the touch cells reach 44 pt, the seam gate reads open, a row
  // press selects and a horizontal resizer drag reports the resize
  // sequence through the JS claim.
  test("M-013 ios host derivation: touch seams engage without an EnvironmentScope", async () => {
    const layout = await openTable("layout", {}, {
      platform: "ios",
      width: 390,
      height: 844,
    });
    await layout.waitUntil(() =>
      callsOf(layout, "layout").some(
        (c) => (c[0] as LayoutEntry).name === "cell-one",
      ),
    );
    expect(lastLayout(layout, "cell-one").height).toBeGreaterThanOrEqual(44);
    expect(lastLayout(layout, "column-role").height).toBeGreaterThanOrEqual(44);

    const ctx = await openTable("ctx-probe", {}, {
      platform: "ios",
      width: 390,
      height: 844,
    });
    // `ctx-env` samples twice — a mount edge before the scope settles and
    // the settled read — so the assertion reads the last sample per id.
    const cellEnv = callsOf(ctx, "ctx-env")
      .map((c) => c[0] as CtxEnv)
      .filter((e) => e.id === "cell-one")
      .at(-1)!;
    expect(cellEnv.enabled).toBe(true);
    const resizerEnv = lastOf<ResizerSample>(ctx, "resizer-env");
    expect(resizerEnv.enabled).toBe(true);
    expect(resizerEnv.handlerKeys).toBeGreaterThan(0);

    await ctx.press("id:row-one");
    await ctx.waitUntil(() => callsOf(ctx, "selection").length >= 1);
    expect(callsOf(ctx, "selection")).toEqual([[["one"]]]);

    const resizable = await openTable("resizable", {}, {
      platform: "ios",
      width: 390,
      height: 844,
    });
    await resizable.drag("label:Resize member", { x: 40, y: 0 });
    const kinds = resizeKinds(resizable);
    expect(kinds[0]).toBe("start");
    expect(kinds.at(-1)).toBe("end");
  }, 120_000);
});
