import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the skeleton adapt unit, one test per row of
 * adapt-sheets/skeleton.md §4 (M-001…M-007). Every component-side 落点 in
 * the sheet is 保留 — the variant table takes no `input`/`density` cell, no
 * gesture or presentation seam applies — so these tests pin the unchanged
 * contract: the placeholder, its `isLoading`/`animationType` gate and the
 * shimmer mount are identical in the default environment and under
 * injected touch/density, and no press path exists on either side. The
 * e-parts semantic rows (M-019…M-026) stay in the
 * `skeleton.mobile.{headless,web}.test.tsx` pair this file does not touch.
 *
 * The fixture is `harness/skeleton.fixtures.tsx` — `host.params.case` picks
 * the shape (`single`, `flip`, `group`), `scope` feeds
 * `EnvironmentScope.input` ("pointer" = the desktop-parity baseline,
 * "touch" = the injected mobile half; explicit because the host-derived
 * default differs per target) and `density` feeds
 * `EnvironmentScope.density`. Probes in `app.storage()`: `layout` (each
 * skeleton root's full bounds box, `onLayout` → probe convention) and
 * `env` (the host's platform report — it sits outside the scope, so it
 * always reads host-derived values; the desktop-pin assertion that read
 * it moved to `skeleton.mobile.headless.test.tsx`).
 *
 * No `platform`/`width`/`height` open options and no `ios`/`android` pin —
 * the native targets fill the device screen and reject them, so this file
 * runs on every target.
 */

type Env = { scope?: "touch" | "pointer"; density?: "compact" };

function openSkeleton(
  caseName: string,
  env: Env = {},
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../skeleton.fixtures.tsx", {
    host: { params: { case: caseName, ...env, ...params } },
  });
}

/** The shimmer sweep mounts only after the root's first layout. */
async function shimmerSettled(app: App): Promise<void> {
  await app.waitUntil(() => app.shows("id:skeleton-shimmer"));
}

/*
 * Per-case settled state: the shimmer count and the `layout` probe names a
 * fully-laid-out mount reports. `flip` opens with `flip="0"` (placeholder
 * branch, one shimmer, one `skel` probe); `flip="1"` mounts no probe at all.
 * Waiting on the whole set — not just the first shimmer — keeps the
 * cross-environment compares in M-005/M-006 off transient partial layouts.
 */
const CASE_SETTLED = {
  single: { shimmers: 1, layoutNames: ["skel"] },
  flip: { shimmers: 1, layoutNames: ["skel"] },
  group: {
    shimmers: 3,
    layoutNames: ["skel-item-1", "skel-item-2", "skel-item-3"],
  },
} as const;

type CaseName = keyof typeof CASE_SETTLED;

async function settleCase(app: App, caseName: CaseName): Promise<void> {
  const expected = CASE_SETTLED[caseName];
  await app.waitUntil(
    () =>
      app.count("id:skeleton-shimmer") >= expected.shimmers &&
      expected.layoutNames.every((name) =>
        layouts(app).some((entry) => entry.name === name),
      ),
  );
}

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function layouts(app: App): LayoutEntry[] {
  return callsOf(app, "layout").map((c) => c[0] as LayoutEntry);
}

/**
 * name → sorted unique bounds boxes. `onLayout` can fire more than once per
 * view; comparing the set of distinct boxes keeps repeat firings honest
 * without depending on how many frames the layout took (the
 * breadcrumbs.mobile.test.tsx `boxSet` convention).
 */
function layoutSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const entry of layouts(app)) {
    const key = JSON.stringify({
      x: entry.x,
      y: entry.y,
      width: entry.width,
      height: entry.height,
    });
    (groups[entry.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

describe("skeleton mobile", () => {
  // adapt-sheets/skeleton.md M-001 (基线): default environment — `single`
  // mounts the loading placeholder (`isLoading` defaults to true), the
  // shimmer overlay appears, the children text never renders, and the
  // `layout` probe reads the caller-supplied 120×20 box — the same
  // resident-placeholder behavior `skeleton.heroui.test.tsx` pins.
  test("M-001 pointer baseline: single mounts placeholder + shimmer, children hidden, box is 120x20", async () => {
    const app = await openSkeleton("single", { scope: "pointer" });

    expect(app.shows("id:skel")).toBe(true);
    expect(app.texts()).not.toContain("Loaded content");
    await settleCase(app, "single");

    const box = layouts(app).filter((e) => e.name === "skel").at(-1);
    expect(box).toBeDefined();
    expect(box?.width).toBe(120);
    expect(box?.height).toBe(20);
  }, 120_000);

  // adapt-sheets/skeleton.md M-002 (基线): default environment — the `flip`
  // case remounts the gate both ways (flip=0 placeholder + shimmer,
  // flip=1 children, zero shimmer; the e-parts M-020 equivalent under NSH's
  // mount-time prop evaluation), and the `group` case shows one shimmer
  // per item while `loading=0` renders every item's children.
  test("M-002 pointer baseline: flip remounts the isLoading gate; group propagates it to every item", async () => {
    const before = await openSkeleton("flip", { scope: "pointer" }, { flip: "0" });
    expect(before.texts()).not.toContain("Loaded content");
    await settleCase(before, "flip");

    const after = await openSkeleton("flip", { scope: "pointer" }, { flip: "1" });
    expect(after.texts()).toContain("Loaded content");
    expect(after.count("id:skeleton-shimmer")).toBe(0);

    const loading = await openSkeleton("group", { scope: "pointer" });
    await settleCase(loading, "group");
    expect(loading.texts()).not.toContain("First content");

    const loaded = await openSkeleton("group", { scope: "pointer" }, { loading: "0" });
    expect(loaded.count("id:skeleton-shimmer")).toBe(0);
    expect(loaded.texts()).toContain("First content");
    expect(loaded.texts()).toContain("Second content");
    expect(loaded.texts()).toContain("Third content");
  }, 120_000);

  // adapt-sheets/skeleton.md M-003 (基线): default environment — the
  // `animationType` axis's three cells are unchanged: `pulse`/`none` mount
  // no shimmer, an explicit `animationType` beats `variant`, and a
  // root-level or channel-level animation off drops the overlay entirely.
  test("M-003 default environment: animationType cells, alias precedence and animation off unchanged", async () => {
    // Each zero-shimmer case first waits for the `layout` probe: the
    // placeholder has laid out, so a missing shimmer is the gate's answer,
    // not a not-yet-mounted overlay.
    const pulse = await openSkeleton("single", { scope: "pointer" }, { variant: "pulse" });
    await pulse.waitUntil(() => callsOf(pulse, "layout").length > 0);
    expect(pulse.count("id:skeleton-shimmer")).toBe(0);

    const none = await openSkeleton("single", { scope: "pointer" }, { variant: "none" });
    await none.waitUntil(() => callsOf(none, "layout").length > 0);
    expect(none.count("id:skeleton-shimmer")).toBe(0);

    // Explicit animationType wins over variant.
    const wins = await openSkeleton("single", { scope: "pointer" }, {
      variant: "none",
      atype: "shimmer",
    });
    await shimmerSettled(wins);

    const off = await openSkeleton("single", { scope: "pointer" }, { anim: "off" });
    await off.waitUntil(() => callsOf(off, "layout").length > 0);
    expect(off.count("id:skeleton-shimmer")).toBe(0);

    const shimmerOff = await openSkeleton("single", { scope: "pointer" }, {
      anim: "shimmer-off",
    });
    await shimmerOff.waitUntil(() => callsOf(shimmerOff, "layout").length > 0);
    expect(shimmerOff.count("id:skeleton-shimmer")).toBe(0);
  }, 120_000);

  // adapt-sheets/skeleton.md M-004 (A-007): injected touch — the base
  // slot's `pointer-events-none` means the placeholder resolves no view
  // that hears presses, so `app.press` on it rejects
  // `ERR_NSH_TEST_NOT_FOUND`: the refusal is the observable "no press
  // path" of a pure display component, and no component-owned callback or
  // state exists to change.
  test("M-004 injected touch: pressing the placeholder rejects — no press path exists", async () => {
    const app = await openSkeleton("single", { scope: "touch" });

    expect(app.shows("id:skel")).toBe(true);
    expect(app.texts()).not.toContain("Loaded content");
    await settleCase(app, "single");

    await expect(app.press("id:skel")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });
  }, 120_000);

  // adapt-sheets/skeleton.md M-005 (A-001…A-005): injected touch — every
  // case's mount, texts, shimmer count and layout report is identical to
  // the pointer baseline: the `input` axis is not wired into this variant
  // table and the animation channel has no environment branch (the mobile
  // side of e-parts M-022, replayed across all three cases).
  test("M-005 injected touch: every case renders identically to the pointer baseline", async () => {
    for (const caseName of ["single", "flip", "group"] as const) {
      const pointer = await openSkeleton(caseName, { scope: "pointer" });
      const touch = await openSkeleton(caseName, { scope: "touch" });

      await settleCase(pointer, caseName);
      await settleCase(touch, caseName);

      expect(touch.texts()).toEqual(pointer.texts());
      expect(touch.count("id:skeleton-shimmer")).toEqual(
        pointer.count("id:skeleton-shimmer"),
      );
      expect(layoutSet(touch)).toEqual(layoutSet(pointer));
    }
  }, 120_000);

  // adapt-sheets/skeleton.md M-006 (A-001, A-002): injected
  // `density="compact"` (on the pointer baseline axis, same input on both
  // sides) — the component table has no density cell and no spacing
  // literal, so the placeholder box, texts and shimmer mount match the
  // default environment's exactly.
  test("M-006 injected compact density: bounds, texts and shimmer identical to default", async () => {
    for (const caseName of ["single", "group"] as const) {
      const baseline = await openSkeleton(caseName, { scope: "pointer" });
      const compact = await openSkeleton(caseName, {
        scope: "pointer",
        density: "compact",
      });

      await settleCase(baseline, caseName);
      await settleCase(compact, caseName);

      expect(compact.texts()).toEqual(baseline.texts());
      expect(layoutSet(compact)).toEqual(layoutSet(baseline));
    }
  }, 120_000);

  // adapt-sheets/skeleton.md M-007 (A-010, A-011): the fixture channels
  // work — `case` dispatches, `scope`/`density` inject, the probes record.
  // The desktop-pin half it used to carry (`platform.desktop === true`,
  // the desktop idiom, `input === "pointer"`) only holds under the
  // `platform:"windows"` pin the native targets reject, so it lives in
  // `skeleton.mobile.headless.test.tsx`.
  test("M-007 fixture channels: cases dispatch, env injects, probes record", async () => {
    for (const caseName of ["single", "flip", "group"] as const) {
      const app = await openSkeleton(caseName, { scope: "pointer" });
      expect(app.shows("id:skel") || app.shows("id:skel-group")).toBe(true);
    }

    const injected = await openSkeleton("single", {
      scope: "touch",
      density: "compact",
    });
    expect(injected.shows("id:skel")).toBe(true);
    await injected.waitUntil(() => callsOf(injected, "layout").length > 0);
  }, 120_000);
});
