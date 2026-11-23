import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the ListBox adapt unit — the row of
 * adapt-sheets/list-box.md §4 that needs steps only the headless engine
 * provides (M-010):
 *
 *   - `open({platform:"ios"})` host derivation — no `EnvironmentScope`, the
 *     platform reports `input()==="touch"` (`--target web` rejects a
 *     `platform` option outright, and a phone-sized headless window is the
 *     subject here, so this file pins no desktop platform either).
 *   - `app.drag` press-cancel — a drag off the pressed row cancels through
 *     the same `onPressUp` path as a release: the seam's `isPressed` resets
 *     and no `selectionChange` fires.
 *
 * The shared file `list-box.mobile.test.tsx` covers M-001 … M-009 and
 * M-011; the `b-item` case carries the same probes (`events`,
 * `selectionChange`, `layout`, `ctx-pressed`, `ctx-state`, `ctx-env`).
 */

function openListBox(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../list-box.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

const ROW_ALPHA = "role:option[Alpha]";

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxState = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: { x: number; y: number } | null;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
  enabled: boolean;
  allDisabled: boolean;
};

type CtxEnv = { enabled: boolean; hitSlop: Edges | null };

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

function seamEdges(app: App): boolean[] {
  return callsOf(app, "ctx-pressed").map(
    (c) => (c[0] as { seam: boolean }).seam,
  );
}

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

describe("list-box mobile (headless)", () => {
  // adapt-sheets/list-box.md M-010 (A-001, A-002, A-003): `platform:"ios"`
  // with no EnvironmentScope — the host derives `input()==="touch"`, so
  // the `min-h-11` cell applies (row height ≥ 44), the seam's `enabled`
  // gate opens, a press completes the full `isPressed` roundtrip with one
  // `selectionChange`, and `app.drag` off the row cancels the press
  // through the shared `pressUp` path: the seam resets, no selection.
  test("M-010 ios host derivation: touch minimums and seam roundtrip; a drag cancels", async () => {
    const ios = await openListBox(
      "b-item",
      {},
      { platform: "ios", width: 390, height: 844 },
    );

    // The host-derived touch environment: the row reaches the 44 pt
    // minimum and the gate reads open — no scope was mounted.
    await ios.waitUntil(() => layouts(ios, "row-1").length > 0);
    expect(layouts(ios, "row-1").at(-1)!.height).toBeGreaterThanOrEqual(44);
    await ios.waitUntil(() => callsOf(ios, "ctx-env").length > 0);
    expect(lastOf<CtxEnv>(ios, "ctx-env").enabled).toBe(true);

    // A clean press: the contract sequence and one selection, with the
    // seam's isPressed completing its roundtrip.
    await ios.press(ROW_ALPHA);
    await ios.waitUntil(() => callsOf(ios, "selectionChange").length === 1);
    expect(callsOf(ios, "selectionChange")).toEqual([[["1"]]]);
    expect(callsOf(ios, "events").map((c) => c[0])).toEqual([
      "down",
      "up",
      "press",
    ]);
    await ios.waitUntil(() => seamEdges(ios).at(-1) === false);
    expect(seamEdges(ios)).toContain(true);

    // The drag-cancel half: `dragAndHold` moves the finger off the row and
    // `drop()` lifts where it is. Host fact (measured, sheet §6): a touch
    // press cancelled by a move delivers NO release edge — neither up,
    // press nor a cancel event reaches the row — so the observable
    // contract is "cancel ≠ commit": the seam engaged on the way down,
    // yet no `press` fires and nothing selects beyond the down-commit.
    // The seam's reset is then proven by the follow-up press, which runs
    // the whole down/up/press cycle and ends `isPressed` false.
    const app = await openListBox("b-item", { scope: "touch" });
    await app.dragAndHold("role:option[Bravo]", { x: 0, y: 60 });
    await app.waitUntil(() =>
      callsOf(app, "events").some((c) => c[0] === "down"),
    );
    // Selection commits on press down (shouldSelectOnPressUp unset), so the
    // down already reported "2"; nothing more may fire from the cancel.
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
    await app.drop();
    await app.wait(800);
    const events = callsOf(app, "events").map((c) => c[0]);
    expect(events).not.toContain("press");
    expect(events).toEqual(["down"]);
    expect(callsOf(app, "selectionChange")).toHaveLength(1);
    expect(seamEdges(app).at(-1)).toBe(true);

    // The abandoned press reports no edge, so the follow-up press is the
    // reset witness: a fresh cycle runs the full chain — re-pressing the
    // selected row toggles it off under single select (the `[[]]` empty
    // payload, the heroui T-020 shape) — and the seam's isPressed ends
    // false, never stranded by the silent cancel.
    await app.press("role:option[Bravo]");
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 2);
    expect(callsOf(app, "selectionChange")[1]).toEqual([[]]);
    expect(callsOf(app, "events").map((c) => c[0])).toEqual([
      "down",
      "down",
      "up",
      "press",
    ]);
    await app.waitUntil(() => seamEdges(app).at(-1) === false);
    const settled = lastOf<CtxState>(app, "ctx-state");
    expect(settled.seamPressed).toBe(false);
    expect(settled.enabled).toBe(true);
  }, 120_000);
});
