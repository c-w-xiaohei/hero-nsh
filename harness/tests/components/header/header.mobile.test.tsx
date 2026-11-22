import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the header adapt unit, one test per row of
 * adapt-sheets/header.md §4 (M-001…M-006). Header is action A: no `input` or
 * `density` axis, no gesture, no presentation — every assertion compares the
 * injected environment against the pointer baseline and finds it identical.
 *
 * The fixture is `harness/header.fixtures.tsx`: `basic` mounts the bare
 * Header and `attributed` adds testID="section-header", both under
 * `EnvironmentScope` driven by `host.params.input` / `host.params.density`.
 * Absent params leave the host-derived environment — pointer + default
 * density on headless and web — which is the desktop-parity baseline every
 * assertion compares against. `platform:"windows"` pins the pointer host on
 * both targets so the phone-engine default-input derivation cannot invert
 * the suite headless (adapt-sheets/header.md M-006, the switch M-001/3/4
 * lesson).
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
    platform: "windows",
    width: 1024,
    height: 768,
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
    const app = await openHeader("basic");

    expect(app.shows("text:Actions")).toBe(true);
    expect(app.texts()).toContain("Actions");
    const style = app.spanStyle("text:Actions");
    expect(style.fontSize).toBe(12);
    expect(style.fontWeight).toBe(500);
    expect(style.color).toBe(MUTED_LIGHT);

    const attributed = await openHeader("attributed");
    expect(attributed.shows("id:section-header")).toBe(true);
  });

  // adapt-sheets/header.md M-002 (A-001, A-002): injected `input="touch"` —
  // Header realizes no `input` cell, so the same tree's shows/texts/
  // spanStyle/onLayout bounds are identical to the default environment.
  test("M-002 injected touch: rendering and bounds are identical to the pointer baseline", async () => {
    const plain = await openHeader("basic");
    const touch = await openHeader("basic", { input: "touch" });

    expect(touch.shows("text:Actions")).toBe(plain.shows("text:Actions"));
    expect(touch.texts()).toEqual(plain.texts());
    expect(touch.spanStyle("text:Actions")).toEqual(
      plain.spanStyle("text:Actions"),
    );
    expect(await boxSet(touch)).toEqual(await boxSet(plain));

    const touchAttr = await openHeader("attributed", { input: "touch" });
    expect(touchAttr.shows("id:section-header")).toBe(true);
  });

  // adapt-sheets/header.md M-003 (A-001): injected `density="compact"` (with
  // touch) — the component table has no density cell, so the preset produces
  // no class difference: bounds and resolved style equal the baseline.
  test("M-003 injected compact density: bounds and style are identical to the baseline", async () => {
    const plain = await openHeader("basic");
    const compact = await openHeader("basic", {
      input: "touch",
      density: "compact",
    });

    expect(await boxSet(compact)).toEqual(await boxSet(plain));
    expect(compact.spanStyle("text:Actions")).toEqual(
      plain.spanStyle("text:Actions"),
    );
  });

  // adapt-sheets/header.md M-004 (A-004): injected touch — the bare Text is
  // not a press target: `app.press` resolves no pressable view and rejects,
  // which is itself the "no press path" evidence; the text stays on screen
  // and the only probe calls are the layout reports.
  test("M-004 injected touch: no press path — press rejects and the text is unchanged", async () => {
    const app = await openHeader("attributed", { input: "touch" });
    await boxSet(app);

    await expect(app.press("id:section-header")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    expect(app.shows("id:section-header")).toBe(true);
    expect(app.shows("text:Actions")).toBe(true);
    // No component-owned callback exists, so nothing beyond the layout
    // reports can record.
    expect(callsOf(app, "layout").length).toBeGreaterThan(0);
  });

  // adapt-sheets/header.md M-005 (A-005): the `ScopedMobile` wrapper takes
  // effect without changing the part — under `input="touch"` +
  // `density="compact"` the attributed case's testID and resolved style are
  // identical to the default environment.
  test("M-005 ScopedMobile injection: attributed case is identical under touch + compact", async () => {
    const plain = await openHeader("attributed");
    const scoped = await openHeader("attributed", {
      input: "touch",
      density: "compact",
    });

    expect(scoped.shows("id:section-header")).toBe(true);
    expect(scoped.spanStyle("text:Actions")).toEqual(
      plain.spanStyle("text:Actions"),
    );
    expect(await boxSet(scoped)).toEqual(await boxSet(plain));
  });

  // adapt-sheets/header.md M-006 (A-006): the desktop pin — every open in
  // this file passes `platform:"windows", width:1024, height:768`, and with
  // no env params the full M-001 assertion set holds; the file runs on
  // headless and `--target web` with the same outcome, so the pointer
  // default is not inverted by the phone-engine derivation.
  test("M-006 desktop pin: M-001 assertions hold with no environment injection", async () => {
    const app = await openHeader("basic");

    expect(app.shows("text:Actions")).toBe(true);
    expect(app.texts()).toContain("Actions");
    const style = app.spanStyle("text:Actions");
    expect(style.fontSize).toBe(12);
    expect(style.fontWeight).toBe(500);
    expect(style.color).toBe(MUTED_LIGHT);
    expect(await boxSet(app)).not.toHaveLength(0);
  });
});
