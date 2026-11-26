import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the avatar adapt unit, one test per row of
 * adapt-sheets/avatar.md §4 (M-001…M-007). The fixture is
 * `harness/avatar.fixtures.tsx`: entries geometry-overlap / geometry-ring /
 * geometry-grid / geometry-sizes / geometry-count, with `host.params.scope`
 * ("pointer"/"touch" → `EnvironmentScope input`) and `host.params.density`
 * ("compact" → `density="compact"`) injecting the environment (A-007).
 *
 * The host-derived environment differs per target — touch on ios/android,
 * pointer on desktop and web — so the desktop-parity baseline every
 * density/input row compares against injects `scope:"pointer"` explicitly.
 * The observation channel is what `nsh/test` sees: `onLayout` bounds records
 * for the geometry rows and `shows`/`texts` for the count and fallback rows.
 *
 * No `platform`/`width`/`height` open options: the native targets fill the
 * device screen and reject them.
 */

type LayoutCall = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EnvParams = {
  scope?: "touch" | "pointer";
  density?: "compact";
};

function openAvatar(fixture: string, env: EnvParams = {}): Promise<App> {
  return open("../../../avatar.fixtures.tsx", {
    host: {
      params: {
        fixture,
        ...(env.scope ? { scope: env.scope } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

function layouts(app: App): LayoutCall[] {
  return callsOf(app, "layout").map((args) => args[0] as LayoutCall);
}

function lastLayout(app: App, name: string): LayoutCall {
  const found = layouts(app).filter((call) => call.name === name).at(-1);

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

/** Waits until every probed name has reported at least once. */
async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((name) => layouts(app).some((call) => call.name === name)),
  );
}

/**
 * name → sorted unique bounds. onLayout can fire more than once per view;
 * comparing the set of distinct boxes keeps repeat firings honest without
 * depending on how many frames the layout took.
 */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const call of layouts(app)) {
    const key = JSON.stringify({
      x: call.x,
      y: call.y,
      width: call.width,
      height: call.height,
    });
    (groups[call.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

const OVERLAP_NAMES = ["first", "second"];
const GRID_NAMES = [
  "grid-first",
  "grid-second",
  "grid-fifth",
  "clip-first",
  "clip-fifth",
];
const SIZE_NAMES = ["sm", "md", "lg"];
const COUNT_NAMES = ["count-first", "count-third"];

describe("avatar mobile", () => {
  // adapt-sheets/avatar.md M-001 (A-002): `density` owns the grid gap literal —
  // `compact` tightens gap-3 (12pt) to gap-2 (8pt), so the second md avatar
  // starts 40 + 8 = 48 after the first and the fifth wraps one row up
  // (40 + 8 = 48). The clip group in the same fixture keeps its 8pt overlap
  // geometry: clip-fifth stays on clip-first's row.
  test("M-001 density compact shrinks the grid gap and wrap offset; clip geometry unchanged", async () => {
    const grid = await openAvatar("geometry-grid", {
      scope: "pointer",
      density: "compact",
    });
    await settleLayout(grid, GRID_NAMES);

    const first = lastLayout(grid, "grid-first");
    const second = lastLayout(grid, "grid-second");
    const fifth = lastLayout(grid, "grid-fifth");
    const clipFirst = lastLayout(grid, "clip-first");
    const clipFifth = lastLayout(grid, "clip-fifth");

    // Native bounds are fractional-px quantized (see M-005): the contract
    // is the 48pt compact step, asserted within a 0.25pt window.
    expect(Math.abs(second.x - first.x - 48)).toBeLessThan(0.25);
    expect(Math.abs(fifth.x - first.x)).toBeLessThan(0.25);
    expect(Math.abs(fifth.y - first.y - 48)).toBeLessThan(0.25);
    expect(Math.abs(clipFifth.y - clipFirst.y)).toBeLessThan(0.25);

    const overlap = await openAvatar("geometry-overlap", {
      scope: "pointer",
      density: "compact",
    });
    await settleLayout(overlap, OVERLAP_NAMES);

    const oFirst = lastLayout(overlap, "first");
    const oSecond = lastLayout(overlap, "second");

    expect(Math.abs(oSecond.x - oFirst.x - 32)).toBeLessThan(0.25);
  });

  // adapt-sheets/avatar.md M-002 (A-003): the overlap geometry is one coupled
  // constant set (8pt overlap / 2pt ring / 2.8pt optical nudge) built in code,
  // outside any tv() slot — the density axis cannot reach it, so clip and
  // ring groups measure the same 32pt step under default and compact.
  test("M-002 overlap geometry is 32 under default and compact density", async () => {
    for (const fixture of ["geometry-overlap", "geometry-ring"] as const) {
      for (const env of [
        { scope: "pointer" as const },
        { scope: "pointer" as const, density: "compact" as const },
      ]) {
        const app = await openAvatar(fixture, env);
        await settleLayout(app, OVERLAP_NAMES);

        const first = lastLayout(app, "first");
        const second = lastLayout(app, "second");

        // 32pt overlap step; fractional-px bound as in M-001/M-005.
        expect(Math.abs(second.x - first.x - 32)).toBeLessThan(0.25);
      }
    }
  });

  // adapt-sheets/avatar.md M-003 (A-001): the avatar table has no `input`
  // axis — Avatar is a non-interactive part — so an injected touch
  // environment must move no laid-out box on sizes, overlap or grid, and the
  // fallback text keeps rendering.
  test("M-003 injected touch changes no layout box and keeps fallback text", async () => {
    const cases: Array<{ fixture: string; names: string[]; texts: string[] }> = [
      { fixture: "geometry-sizes", names: SIZE_NAMES, texts: ["S", "M", "L"] },
      { fixture: "geometry-overlap", names: OVERLAP_NAMES, texts: ["A", "B"] },
      { fixture: "geometry-grid", names: GRID_NAMES, texts: ["1"] },
    ];

    for (const { fixture, names, texts: expectedTexts } of cases) {
      // Snapshot the touch app fully before the next open: a native open
      // relaunches the single host and invalidates every earlier App.
      const touch = await openAvatar(fixture, { scope: "touch" });
      await settleLayout(touch, names);
      const touchBoxes = boxSet(touch);
      const touchShows = expectedTexts.map((text) =>
        touch.shows(`text:${text}`),
      );

      const pointer = await openAvatar(fixture, { scope: "pointer" });
      await settleLayout(pointer, names);
      const pointerBoxes = boxSet(pointer);

      expect(touchBoxes).toEqual(pointerBoxes);
      for (const shown of touchShows) {
        expect(shown).toBe(true);
      }
    }
  });

  // adapt-sheets/avatar.md M-004 (A-001): `size` is the contract semantic —
  // sm/md/lg resolve to 32/40/48 through the group context — and the density
  // preset must not rewrite it.
  test("M-004 density compact leaves the three size tiers at 32/40/48", async () => {
    const app = await openAvatar("geometry-sizes", {
      scope: "pointer",
      density: "compact",
    });
    await settleLayout(app, SIZE_NAMES);

    expect(Math.abs(lastLayout(app, "sm").width - 32)).toBeLessThan(0.25);
    expect(Math.abs(lastLayout(app, "md").width - 40)).toBeLessThan(0.25);
    expect(Math.abs(lastLayout(app, "lg").width - 48)).toBeLessThan(0.25);
  });

  // adapt-sheets/avatar.md M-005 (baseline): the desktop contract the existing
  // avatar.heroui.test.tsx pins, replayed on the fixture's own probes — size
  // tiers 32/40/48, the grid's 12pt gap wrap (fifth at first + 52), and the
  // group's `max` slicing with its automatic `+2` beside the explicit `9+`
  // count that suppresses the second group's auto count.
  test("M-005 baseline: sizes, grid wrap and max/+N counts under the default environment", async () => {
    const sizes = await openAvatar("geometry-sizes", { scope: "pointer" });
    await settleLayout(sizes, SIZE_NAMES);

    // Fractional-px bound as below: exact tiers ±0.25pt.
    expect(Math.abs(lastLayout(sizes, "sm").width - 32)).toBeLessThan(0.25);
    expect(Math.abs(lastLayout(sizes, "md").width - 40)).toBeLessThan(0.25);
    expect(Math.abs(lastLayout(sizes, "lg").width - 48)).toBeLessThan(0.25);

    const grid = await openAvatar("geometry-grid", { scope: "pointer" });
    await settleLayout(grid, GRID_NAMES);

    const first = lastLayout(grid, "grid-first");
    const fifth = lastLayout(grid, "grid-fifth");

    // 40pt avatar + 12pt gap-3 = 52pt step. Native layout reports
    // fractional-px bounds (Android measured 52.1905 at its device dpi);
    // the contract is the 52pt step, so the bound is a 0.25pt quantization
    // window, not a tolerance on the geometry.
    const step = lastLayout(grid, "grid-second").x - first.x;
    expect(Math.abs(step - 52)).toBeLessThan(0.25);
    expect(Math.abs(fifth.x - first.x)).toBeLessThan(0.25);
    expect(Math.abs(fifth.y - first.y - 52)).toBeLessThan(0.25);
    expect(
      Math.abs(
        lastLayout(grid, "clip-fifth").y - lastLayout(grid, "clip-first").y,
      ),
    ).toBeLessThan(0.25);

    const count = await openAvatar("geometry-count", { scope: "pointer" });
    await settleLayout(count, COUNT_NAMES);

    // max={2} of A–D shows A and B and appends the automatic "+2"; C and D are
    // sliced away. max={1} of E–H plus the explicit "9+" count shows E only —
    // the explicit registration suppresses what would be an automatic "+3".
    expect(count.shows("text:A")).toBe(true);
    expect(count.shows("text:B")).toBe(true);
    expect(count.shows("text:+2")).toBe(true);
    expect(count.shows("text:E")).toBe(true);
    expect(count.shows("text:9+")).toBe(true);
    expect(count.shows("text:C")).toBe(false);
    expect(count.shows("text:D")).toBe(false);
    expect(count.shows("text:F")).toBe(false);
    expect(count.shows("text:G")).toBe(false);
    expect(count.shows("text:H")).toBe(false);
    expect(count.texts().filter((text) => text.startsWith("+"))).toEqual(["+2"]);
  });

  // adapt-sheets/avatar.md M-006 (baseline): image/group state keeps its
  // owner — under injected touch the "+N" counts and the no-src fallback
  // texts are the same set the default environment renders.
  test("M-006 injected touch keeps the +N counts and fallback texts identical", async () => {
    // Snapshot the touch app before the pointer open relaunches the host.
    const touch = await openAvatar("geometry-count", { scope: "touch" });
    await settleLayout(touch, COUNT_NAMES);
    const touchTexts = [...touch.texts()].sort();
    const touchShows = ["+2", "9+", "A", "B", "E"].map((text) =>
      touch.shows(`text:${text}`),
    );

    const pointer = await openAvatar("geometry-count", { scope: "pointer" });
    await settleLayout(pointer, COUNT_NAMES);
    const pointerTexts = [...pointer.texts()].sort();

    expect(touchTexts).toEqual(pointerTexts);

    for (const shown of touchShows) {
      expect(shown).toBe(true);
    }
  });

  // adapt-sheets/avatar.md M-007 (A-007): the fixture's injection levels —
  // host-derived, scope="pointer", scope="touch", density="compact" — all
  // mount and leave every layout/text probe readable.
  test("M-007 injection levels mount with readable probes", async () => {
    const levels: EnvParams[] = [
      {},
      { scope: "pointer" },
      { scope: "touch" },
      { scope: "pointer", density: "compact" },
    ];

    for (const env of levels) {
      const app = await openAvatar("geometry-grid", env);
      await settleLayout(app, GRID_NAMES);

      expect(app.shows("text:1")).toBe(true);
      expect(app.shows("text:5")).toBe(true);
    }
  });
});
