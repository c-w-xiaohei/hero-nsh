import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the scroll-shadow adapt unit, one test per row of
 * adapt-sheets/scroll-shadow.md §4 (M-001…M-008). Every style 落点 is 保留 —
 * the variant table keeps its single `relative` literal and no `input` or
 * `density` axis lands in it — and the D-class 落点 A-003 is 仲裁: the
 * component keeps its own `Scroll` host untouched so the sheet-handoff
 * unit's arbitration seam can still reach it, adding no gesture owner of
 * its own on either end. These tests pin that: same geometry, same
 * detection states and same passthrough chain under pointer and injected
 * touch/density, and no new gesture path anywhere.
 *
 * The fixture is `harness/scroll-shadow.fixtures.tsx` — `host.params.case`
 * picks the mount (`default`, `horizontal`, `fits`, `controlled`; an absent
 * case is the X-005 mask readout) and `input`/`density` feed
 * `EnvironmentScope`. The axes are always explicit — `input:"pointer"` is
 * the desktop-parity baseline and `input:"touch"` the injected mobile
 * half — because the host-derived default differs per target (touch on
 * ios/android, pointer on desktop and web). Probes in `app.storage()`:
 * `layout` (the root's
 * bounds box), `visibility` (`{state, render}` — the render count exposes a
 * stale `onVisibilityChange` prop, mirroring T-014), `scroll` (the
 * forwarded `onScroll`), `env` (the host platform report) and `scopeEnv`
 * (what `EnvironmentScope` resolved inside the mounted case).
 *
 * No `platform`/`width` open options — native targets fill the device
 * screen and reject them. No platform injection and no drag-dependent
 * case, so this file runs on every target.
 */

type Env = { input?: "touch" | "pointer"; density?: "compact" | "default" };

function openShadow(caseName: string, env: Env = {}): Promise<App> {
  return open("../../../scroll-shadow.fixtures.tsx", {
    host: { params: { case: caseName, ...env } },
  });
}

type VisibilityRecord = { state: string; render: number };

function visibilityRecords(app: App): VisibilityRecord[] {
  return callsOf(app, "visibility").map(
    (c) => c[0] as VisibilityRecord,
  );
}

/** The last detected state the probe recorded, or undefined before the first. */
function lastVisibility(app: App): string | undefined {
  return visibilityRecords(app).at(-1)?.state;
}

type LayoutEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * name → sorted unique bounds boxes. `onLayout` can fire more than once per
 * view; comparing the set of distinct boxes keeps repeat firings honest
 * without depending on how many frames the layout took (the
 * breadcrumbs.mobile.test.tsx `boxSet` convention).
 */
function layoutSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const entry of callsOf(app, "layout").map((c) => c[0] as LayoutEntry)) {
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

type EnvReport = {
  os: string;
  desktop: boolean;
  idiom: string;
  input: string;
};

function envOf(app: App): EnvReport {
  return callsOf(app, "env").at(-1)?.[0] as EnvReport;
}

type ScopeReport = { input: string; density: string };

function scopeEnvOf(app: App): ScopeReport | undefined {
  return callsOf(app, "scopeEnv").at(-1)?.[0] as ScopeReport | undefined;
}

/** The probe names the fixture may ever record — the A-003 gesture claim. */
const EXPECTED_PROBES = new Set([
  "layout",
  "scroll",
  "visibility",
  "env",
  "scopeEnv",
]);

function probeNames(app: App): string[] {
  return [...new Set(calls(app).map((c) => c.name))].sort();
}

describe("scroll-shadow mobile", () => {
  // adapt-sheets/scroll-shadow.md M-001 (基线): default environment — the
  // `default` case rests at `bottom` (overflow only past the end edge),
  // `horizontal` rests at `right` under ltr, and `fits` reports `none` —
  // the same resting states the heroui suite pins (T-015/T-020/T-024),
  // with the root's bounds box reporting the mounted viewport.
  test("M-001 default environment: resting states bottom / right / none, root bounds recorded", async () => {
    const app = await openShadow("default", { input: "pointer" });
    await app.waitFor("text:/^state:bottom@/");
    expect(app.shows("id:scroller")).toBe(true);
    expect(lastVisibility(app)).toBe("bottom");
    const box = layoutSet(app)["root"];
    expect(box).toHaveLength(1);

    const horizontal = await openShadow("horizontal", { input: "pointer" });
    await horizontal.waitFor("text:state:right");
    expect(lastVisibility(horizontal)).toBe("right");
    expect(horizontal.shows("text:Cell 0")).toBe(true);

    const fits = await openShadow("fits", { input: "pointer" });
    await fits.waitFor("text:state:none");
    expect(lastVisibility(fits)).toBe("none");
    expect(fits.shows("text:Short content")).toBe(true);
  }, 120_000);

  // adapt-sheets/scroll-shadow.md M-002 (基线): default environment — the
  // measurement-then-caller chain holds: the forwarded `onScroll` and
  // `onLayout` reach the caller's probes, `onVisibilityChange` reads the
  // newest prop (`state:top@2` after two re-renders, as T-014), and the
  // controlled case never fires the detection callback while `onScroll`
  // still passes through.
  test("M-002 default environment: passthrough chain, newest callback, controlled silence", async () => {
    const app = await openShadow("default", { input: "pointer" });
    await app.waitFor("text:/^state:bottom@/");

    expect(callsOf(app, "layout")).not.toHaveLength(0);

    await app.press("role:button[Scroll to middle]");
    await app.waitFor("text:/^state:both@/");
    expect(callsOf(app, "scroll")).not.toHaveLength(0);

    await app.press("role:button[Re-render]");
    await app.press("role:button[Re-render]");
    await app.press("role:button[Scroll to end]");
    await app.waitFor("text:state:top@2");
    expect(lastVisibility(app)).toBe("top");
    expect(visibilityRecords(app).at(-1)?.render).toBe(2);

    const controlled = await openShadow("controlled", { input: "pointer" });
    await controlled.press("role:button[Scroll]");
    expect(callsOf(controlled, "scroll")).not.toHaveLength(0);
    expect(callsOf(controlled, "visibility")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/scroll-shadow.md M-003 (A-001, A-002): injected
  // `input="touch"` — every case's mount, texts, detection states and root
  // bounds are identical to the pointer baseline: the `input` axis is not
  // wired into this table, so scroll geometry and fade detection are
  // environment-invariant.
  test("M-003 injected touch: states, texts and bounds identical to the pointer baseline", async () => {
    for (const caseName of ["default", "horizontal", "fits"] as const) {
      const pointer = await openShadow(caseName, { input: "pointer" });
      const touch = await openShadow(caseName, { input: "touch" });

      const resting =
        caseName === "default"
          ? "bottom"
          : caseName === "horizontal"
            ? "right"
            : "none";
      await pointer.waitFor(`text:/^state:${resting}/`);
      await touch.waitFor(`text:/^state:${resting}/`);

      expect(touch.texts()).toEqual(pointer.texts());
      expect(lastVisibility(touch)).toBe(lastVisibility(pointer));
      expect(layoutSet(touch)).toEqual(layoutSet(pointer));
    }
  }, 120_000);

  // adapt-sheets/scroll-shadow.md M-004 (A-001, A-002): injected
  // `density="compact"` (with `input="touch"`, the mobile combination) —
  // the component table has no density cell and `size`/`offset` are props,
  // so bounds and detection states match the default environment's
  // exactly.
  test("M-004 injected compact density: bounds and states identical to default", async () => {
    const baseline = await openShadow("default", { input: "pointer" });
    await baseline.waitFor("text:/^state:bottom@/");

    const compact = await openShadow("default", {
      input: "touch",
      density: "compact",
    });
    await compact.waitFor("text:/^state:bottom@/");

    expect(compact.texts()).toEqual(baseline.texts());
    expect(lastVisibility(compact)).toBe(lastVisibility(baseline));
    expect(layoutSet(compact)).toEqual(layoutSet(baseline));
  }, 120_000);

  // adapt-sheets/scroll-shadow.md M-005 (A-003): injected touch — the root
  // hears no press (`press` rejects `ERR_NSH_TEST_NOT_FOUND`: it is a
  // scroll host, not a press owner), and scrolling it produces only the
  // existing measurement records: `scroll` and `visibility` probes, never
  // a gesture claim. The component registers no new responder under
  // touch; the D seam's claim chain lives in the sheet unit.
  test("M-005 injected touch: no new gesture path — press rejects, scroll stays the only path", async () => {
    const app = await openShadow("default", { input: "touch" });
    await app.waitFor("text:/^state:bottom@/");

    await expect(app.press("id:scroller")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    await app.scroll("id:scroller", 80);
    await app.waitFor("text:/^state:both@/");
    expect(callsOf(app, "scroll")).not.toHaveLength(0);
    for (const name of probeNames(app)) {
      expect(EXPECTED_PROBES.has(name)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/scroll-shadow.md M-008 (A-003, 负断言): default (pointer)
  // environment — the same holds with the desktop input: no press path
  // resolves on the root and a drag/scroll introduces no gesture owner.
  // Scroll-shadow's own action conditions the D seam on Sheet nesting, and
  // that arbitration is sheet-handoff's; this component never grows a
  // `createPan`/`panActivation` path in any environment.
  test("M-008 pointer environment: pressing or dragging the root registers no gesture owner", async () => {
    const app = await openShadow("default", { input: "pointer" });
    await app.waitFor("text:/^state:bottom@/");

    await expect(app.press("id:scroller")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    await app.scroll("id:scroller", 80);
    await app.waitFor("text:/^state:both@/");
    for (const name of probeNames(app)) {
      expect(EXPECTED_PROBES.has(name)).toBe(true);
    }
  }, 120_000);

  // adapt-sheets/scroll-shadow.md M-006 (A-005): the fixture channels work —
  // `host.params.case` mounts each shape (each shows its `scroller` root
  // and records layout/scopeEnv probes), `EnvironmentScope` resolves the
  // injected axes inside the subtree (`scopeEnv`), and the X-005 mask
  // branch is untouched (an absent `case` still prints `mask:auto:…`).
  test("M-006 fixture channels: every case mounts under the scope and the mask branch is unchanged", async () => {
    for (const caseName of ["default", "horizontal", "fits"] as const) {
      const app = await openShadow(caseName, { input: "pointer" });
      expect(app.shows("id:scroller")).toBe(true);
      expect(callsOf(app, "layout")).not.toHaveLength(0);
      expect(scopeEnvOf(app)).toEqual({ input: "pointer", density: "default" });
    }

    const touch = await openShadow("default", {
      input: "touch",
      density: "compact",
    });
    expect(scopeEnvOf(touch)).toEqual({ input: "touch", density: "compact" });

    const mask = await open("../../../scroll-shadow.fixtures.tsx");
    expect(mask.shows("text:/^mask:auto:/")).toBe(true);
    expect(mask.shows("text:/^mask:controlled:/")).toBe(true);
  }, 120_000);

  // adapt-sheets/scroll-shadow.md M-007 (A-006): the `env` probe records the
  // host-derived environment honestly — outside `ScopedMobile`, `input`
  // follows `desktop` (pointer on desktop/web, touch on the phone hosts) —
  // and the scope-resolved `scopeEnv` probe reports the explicit pointer
  // scope the M-001…M-005 baselines inject. The desktop-host pin half,
  // which only a desktop platform can satisfy, lives in
  // `scroll-shadow.mobile.headless.test.tsx`.
  test("M-007 env probes: host derivation and the pointer scope both report", async () => {
    const app = await openShadow("default", { input: "pointer" });
    const env = envOf(app);

    expect(env.desktop).toBe(env.idiom === "desktop");
    expect(env.input).toBe(env.desktop ? "pointer" : "touch");
    expect(scopeEnvOf(app)).toEqual({ input: "pointer", density: "default" });
  }, 120_000);
});
