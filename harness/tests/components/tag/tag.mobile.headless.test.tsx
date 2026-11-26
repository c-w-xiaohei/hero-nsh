import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the tag adapt unit — the headless halves of
 * adapt-sheets/tag.md §4: `open({platform:"ios"})` host derivation (M-011)
 * and `dragAndHold`'s mid-hold / cancel-path seam reads (M-012) exist only
 * here; the `.web.` file carries the shared settle-state assertions.
 *
 * Fixture: `harness/tag.fixtures.tsx` — `case`, `scope` ("touch" injects the
 * `EnvironmentScope`), `probe` ("1" mounts the CtxProbe + `ctx-sample`).
 * `isPressed` is the feedback factory's gated flag; `ctx-state` is the
 * deferred sampler's report (pressed/scale/hitSlop/origin/bounds).
 */

type Params = Record<string, string>;

function openTag(
  caseName: string,
  params: Params = {},
  options: { platform?: "windows" | "ios"; width?: number; height?: number } = {},
): Promise<App> {
  return open("../../../tag.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxState = {
  tag?: string;
  pressed: number;
  scale: number;
  isPressed: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

type CtxChannels = Omit<CtxState, "tag">;

type CtxEnv = {
  tag?: string;
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
};

type LayoutEntry = { name: string; width: number; height: number };

function lastOf<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

function edges(app: App): boolean[] {
  return callsOf(app, "ctx-pressed").map((c) => c[0] as boolean);
}

function states(app: App): CtxState[] {
  return callsOf(app, "ctx-state").map((c) => c[0] as CtxState);
}

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

describe("tag mobile (headless)", () => {
  // adapt-sheets/tag.md M-011 (A-001/A-002, 宿主导出半): an ios host derives
  // `input()==="touch"` with no EnvironmentScope — the seam gate opens, the
  // `min-h-9` cell lifts the row and `hitSlop()` reports the expansion.
  test("M-011 ios host derivation: seam activates and min-h-9 applies without a scope", async () => {
    const app = await openTag("feedback-row", { probe: "1" }, {
      platform: "ios",
      width: 390,
      height: 844,
    });

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);

    // min-h-9: the row's measured height is at least 36 under the derived
    // touch environment.
    await app.waitUntil(() =>
      callsOf(app, "layout").some((c) => (c[0] as LayoutEntry).name === "news"),
    );
    expect(layoutFor(app, "news").height).toBeGreaterThanOrEqual(36);

    // The row is under 44 pt, so a post-layout sample reports the slop.
    await app.waitUntil(() => states(app).some((s) => s.hitSlop !== null));
    const slop = states(app).filter((s) => s.hitSlop !== null).at(-1)!.hitSlop!;
    expect(slop.top).toBeGreaterThan(0);

    // A press activates the same selection path as the scoped environment.
    await app.press("role:row[News]");
    await app.waitUntil(() => callsOf(app, "selectionChange").length === 1);
    expect(callsOf(app, "selectionChange")).toEqual([[["news"]]]);
  }, 120_000);

  // adapt-sheets/tag.md M-012 (A-002): a held finger raises the seam's
  // `isPressed` with `hitSlop` non-empty and `pressOrigin` recorded; release
  // inside completes the press (the selection fired on press-down, as RAC's
  // Tag selects on down) and cancel — a drag that leaves the row — resets
  // through the same `pressUp` path, clearing `pressOrigin` (cancel and end
  // share it on purpose). `app.wait`, not `waitUntil`, paces the hold: the
  // deferred samplers need real clock time while the finger is down —
  // `waitUntil`'s frame steps finish the polling budget before the +600 ms
  // samples land.
  test("M-012 injected touch: held press engages the seam, release commits, drag cancels clean", async () => {
    const app = await openTag("feedback-row", { scope: "touch", probe: "1" });

    // Hold on the row: the interval sampler reports the engaged state while
    // the finger is still down.
    await app.dragAndHold("role:row[News]", { x: 0, y: 0 });
    await app.wait(900);
    const heldList = states(app).filter((s) => s.isPressed);
    expect(heldList.length).toBeGreaterThan(0);
    const held = heldList.at(-1)!;
    expect(held.hitSlop).not.toBeNull();
    expect(held.origin).not.toBeNull();
    expect(held.enabled).toBe(true);

    // Release in place: the press completed (the press-down already
    // selected, the release is the same activation's end) and every channel
    // settles — edge flag back down, origin cleared.
    await app.drop();
    await app.wait(300);
    expect(callsOf(app, "selectionChange")[0]).toEqual([["news"]]);
    expect(edges(app).at(-1)).toBe(false);

    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const settled = lastOf<CtxChannels>(app, "ctx-channels");
    expect(settled.isPressed).toBe(false);
    expect(settled.origin).toBeNull();

    // The cancel path: a drag that leaves the row ends through the same
    // pressUp/mouse-leave reset — origin cleared, flag down.
    const cancel = await openTag("feedback-row", { scope: "touch", probe: "1" });
    await cancel.drag("role:row[News]", { x: 0, y: -80 });
    await cancel.wait(300);
    await cancel.press("id:ctx-sample");
    await cancel.waitUntil(() => callsOf(cancel, "ctx-channels").length > 0);
    const after = lastOf<CtxChannels>(cancel, "ctx-channels");
    expect(after.isPressed).toBe(false);
    expect(after.origin).toBeNull();
  }, 120_000);

  // The pointer-side negative half of M-012's premise (the web file's M-001
  // covers the same gate through settle reads): under the default environment
  // a held press leaves the seam completely untouched — no edge, no origin,
  // no hitSlop — while the selection path itself works. Headless only
  // because `dragAndHold` is.
  test("M-012 pointer control: a held press under the default environment engages nothing", async () => {
    const app = await openTag("feedback-row", { probe: "1" });

    await app.dragAndHold("role:row[News]", { x: 0, y: 0 });
    await app.wait(500);
    expect(edges(app).every((edge) => !edge)).toBe(true);
    for (const s of states(app)) {
      expect(s.isPressed).toBe(false);
      expect(s.origin).toBeNull();
      expect(s.hitSlop).toBeNull();
    }
    // The press-down already selected, as RAC's Tag does.
    expect(callsOf(app, "selectionChange")[0]).toEqual([["news"]]);

    await app.drop();
    await app.wait(300);
    // The whole round-trip stayed inert — no seam edge after release either.
    expect(edges(app).every((edge) => !edge)).toBe(true);
  }, 120_000);
});
