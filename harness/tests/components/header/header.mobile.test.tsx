import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the header adapt unit, one test per row of
 * adapt-sheets/header.md §4 (M-001…M-006). Header is action A: no `input` or
 * `density` axis, no gesture, no presentation — every assertion compares the
 * injected environment against the pointer baseline and finds it identical.
 *
 * The fixture is `harness/header.fixtures.tsx`: `basic` mounts the bare
 * Header and `attributed` adds testID="section-header", both under
 * `EnvironmentScope` driven by `host.params.input` / `host.params.density`.
 * The axes are always explicit — `input:"pointer"` is the desktop-parity
 * baseline every assertion compares against and `input:"touch"` the
 * injected mobile half — because the host-derived default differs per
 * target (touch on ios/android, pointer on desktop and web). No
 * `platform`/`width` open options: native targets fill the device screen
 * and reject them.
 */

// Resolved on the harness theme (theme/hero-nsh.theme.json), light muted.
const MUTED_LIGHT = "#71717aff";

type Box = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EnvParams = {
  input?: "pointer" | "touch";
  density?: "default" | "compact";
};

function openHeader(caseName: string, env: EnvParams = {}): Promise<App> {
  return open("../../../header.fixtures.tsx", {
    host: {
      params: {
        case: caseName,
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

/**
 * The laid-out boxes the fixture's `onLayout` probe recorded, as a sorted set
 * of distinct bounds. Header reports a single "header" box; repeat firings
 * collapse into the set so frame timing does not matter.
 */
async function boxSet(app: App): Promise<string[]> {
  await app.waitUntil(() => callsOf(app, "layout").length > 0);
  const keys = new Set<string>();
  for (const args of callsOf(app, "layout")) {
    const box = args[0] as Box;
    keys.add(
      JSON.stringify({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      }),
    );
  }
  return [...keys].sort();
}

describe("header mobile", () => {
  // adapt-sheets/header.md M-001 (基线): default environment — the desktop
  // pin lands on the pointer host and the header renders "Actions" with the
  // resolved `text-xs font-medium text-muted` style; `attributed` keeps the
  // testID channel, line for line the header.heroui.test.tsx T-001…T-003
  // baseline.
  test("M-001 default environment: content, resolved style and testID match the migration baseline", async () => {
    const app = await openHeader("basic", { input: "pointer" });

    expect(app.shows("text:Actions")).toBe(true);
    expect(app.texts()).toContain("Actions");
    const style = app.spanStyle("text:Actions");
    expect(style.fontSize).toBe(12);
    expect(style.fontWeight).toBe(500);
    expect(style.color).toBe(MUTED_LIGHT);

    const attributed = await openHeader("attributed", { input: "pointer" });
    expect(attributed.shows("id:section-header")).toBe(true);
  }, 120_000);

  // adapt-sheets/header.md M-002 (A-001, A-002): injected `input="touch"` —
  // Header realizes no `input` cell, so the same tree's shows/texts/
  // spanStyle/onLayout bounds are identical to the default environment.
  test("M-002 injected touch: rendering and bounds are identical to the pointer baseline", async () => {
    // Snapshot each app before the next open: a native open relaunches
    // the single host and invalidates every earlier App.
    const snap = async (app: App) => ({
      showsActions: app.shows("text:Actions"),
      texts: app.texts(),
      span: app.spanStyle("text:Actions"),
      boxes: await boxSet(app),
    });

    const plain = await openHeader("basic", { input: "pointer" });
    const plainSnap = await snap(plain);

    const touch = await openHeader("basic", { input: "touch" });
    const touchSnap = await snap(touch);

    expect(touchSnap).toEqual(plainSnap);

    const attrPlain = await openHeader("attributed", { input: "pointer" });
    const attrPlainSnap = await snap(attrPlain);
    const attrHeaderShown = attrPlain.shows("id:section-header");

    const attrTouch = await openHeader("attributed", { input: "touch" });
    const attrTouchSnap = await snap(attrTouch);
    const attrTouchHeaderShown = attrTouch.shows("id:section-header");

    expect(attrTouchHeaderShown).toBe(attrHeaderShown);
    expect(attrTouchSnap).toEqual(attrPlainSnap);
  }, 120_000);

  // adapt-sheets/header.md M-003 (A-001): injected `density="compact"` —
  // the component table has no density cell, so the preset produces
  // no class difference: bounds and resolved style equal the baseline.
  test("M-003 injected compact density: bounds and style are identical to the baseline", async () => {
    const plain = await openHeader("basic", { input: "pointer" });
    const plainBoxes = await boxSet(plain);
    const plainSpan = plain.spanStyle("text:Actions");

    const compact = await openHeader("basic", {
      input: "pointer",
      density: "compact",
    });

    expect(await boxSet(compact)).toEqual(plainBoxes);
    expect(compact.spanStyle("text:Actions")).toEqual(plainSpan);
  }, 120_000);

  // adapt-sheets/header.md M-004 (A-004): injected touch — the bare Text is
  // not a press target: `app.press` resolves no pressable view and rejects,
  // which is itself the "no press path" evidence; the text stays on screen
  // and the only probe calls are the layout reports.
  test("M-004 injected touch: no press path — press rejects and the text is unchanged", async () => {
    // One app at a time: the earlier App is dead the moment the next
    // `open()` relaunches the host, so each environment's press and reads
    // complete before the next open.
    for (const env of [
      { input: "pointer" },
      { input: "touch" },
    ] as EnvParams[]) {
      const app = await openHeader("attributed", env);
      await boxSet(app);
      const before = calls(app);

      await expect(app.press("id:section-header")).rejects.toMatchObject({
        code: "ERR_NSH_TEST_NOT_FOUND",
      });

      expect(app.shows("id:section-header")).toBe(true);
      expect(app.shows("text:Actions")).toBe(true);
      // No component-owned callback exists, so the probe record is untouched.
      expect(calls(app)).toEqual(before);
    }
  }, 120_000);

  // adapt-sheets/header.md M-005 (A-005): the `ScopedMobile` wrapper takes
  // effect without changing the part — under `input="touch"` +
  // `density="compact"` the attributed case's testID and resolved style are
  // identical to the default environment.
  test("M-005 ScopedMobile injection: attributed case is identical under touch + compact", async () => {
    const plain = await openHeader("attributed", { input: "pointer" });
    const plainSpan = plain.spanStyle("text:Actions");
    const plainBoxes = await boxSet(plain);

    const scoped = await openHeader("attributed", {
      input: "touch",
      density: "compact",
    });

    expect(scoped.shows("id:section-header")).toBe(true);
    expect(scoped.spanStyle("text:Actions")).toEqual(plainSpan);
    expect(await boxSet(scoped)).toEqual(plainBoxes);
  }, 120_000);

  // adapt-sheets/header.md M-006 (A-006): the pointer scope — what the old
  // desktop pin derived — is explicit now, and the full M-001 assertion set
  // holds under it on whatever host the file runs on.
  test("M-006 pointer baseline: M-001 assertions hold under the pointer scope", async () => {
    const app = await openHeader("basic", { input: "pointer" });

    expect(app.shows("text:Actions")).toBe(true);
    expect(app.texts()).toContain("Actions");
    const style = app.spanStyle("text:Actions");
    expect(style.fontSize).toBe(12);
    expect(style.fontWeight).toBe(500);
    expect(style.color).toBe(MUTED_LIGHT);
    expect(await boxSet(app)).not.toHaveLength(0);

    const attributed = await openHeader("attributed", { input: "pointer" });
    expect(attributed.shows("id:section-header")).toBe(true);
  }, 120_000);
});
