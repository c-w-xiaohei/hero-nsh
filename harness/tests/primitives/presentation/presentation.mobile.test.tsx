import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the create-presentation mechanism unit, one test per
 * row of adapt-sheets/create-presentation.md §4 (M-001…M-004, M-009, M-010,
 * M-012 below; the setViewport latch rows M-005…M-008 and the platform-spoof
 * row M-011 live in `presentation.mobile.headless.test.tsx`).
 * The fixture is `harness/presentation.fixtures.tsx`, opened by
 * `host.params.case`/`scope`/`allowed`; every assertion reads what `nsh/test`
 * can observe — `texts()` and the `@scenario/probe` `env` report.
 *
 * No `platform`/`width`/`height` open options: native iOS/Android hosts run
 * this file with their real screen and platform and reject those options.
 * Both environments are covered through `EnvironmentScope`
 * (params.scope — "touch-compact"/"pointer-compact"/"regular" pin what a
 * window size used to, since a real phone's screen cannot be resized),
 * while the default-environment rows derive their expectations from the
 * fixture's `env` probe (the host's `platform` facts and the real
 * `windowSize`), so a real phone still exercises the genuine
 * windowSize → width derivation.
 */

type Scope = "" | "touch" | "touch-compact" | "pointer-compact" | "regular";
type Allowed = "ps" | "pf";

// `open` resolves its entry against the test file; this file sits three
// levels below harness/, same as every other primitives test.
async function openPresentation(
  caseName: string,
  params: { scope?: Scope; allowed?: Allowed } = {},
): Promise<App> {
  const app = await open("../../../presentation.fixtures.tsx", {
    host: {
      params: {
        case: caseName,
        ...(params.scope ? { scope: params.scope } : {}),
        ...(params.allowed ? { allowed: params.allowed } : {}),
      },
    },
  });
  // The fixture's mount-time `env` probe writes Storage asynchronously;
  // `open` resolving does not guarantee the write is visible yet, and
  // `envOf`/`derivedPresentation` read it unconditionally in several tests.
  await app.waitUntil(() => callsOf(app, "env").length > 0);
  return app;
}

type EnvReport = {
  os: string;
  desktop: boolean;
  idiom: string;
  w: number;
  h: number;
};

/** The host platform/window report the fixture probes once per mount. */
function envOf(app: App): EnvReport {
  return callsOf(app, "env").at(-1)?.[0] as EnvReport;
}

/**
 * What the auto rule must prefer on this host: `"sheet"` exactly when the
 * default environment derives input="touch" (platform.desktop false — a
 * real phone) AND the real window's short side is under 640 points;
 * `"panel"` otherwise.
 */
function derivedPresentation(app: App): "panel" | "sheet" {
  const env = envOf(app);
  return !env.desktop && Math.min(env.w, env.h) < 640 ? "sheet" : "panel";
}

/*
 * The fixture mounts with `open=false` already on screen, so waiting for
 * `text:open=false` would resolve on the stale mount state. Each helper
 * waits for the state that can only exist after the press: `open=true` after
 * toggle-on (never shown before), `open=false` after toggle-off (the open
 * state replaced it, so it is absent until the close renders).
 */
async function openOverlay(app: App): Promise<void> {
  await app.press("id:toggle");
  await app.waitFor("text:open=true");
}

describe("createPresentation", () => {
  // adapt-sheets/create-presentation.md M-001 (A-001): the default
  // environment presents what the auto rule prefers on this host — touch +
  // compact short side yields sheet (a real phone), anything else panel —
  // asserted against the host's own platform/window report rather than a
  // forced desktop viewport.
  test("M-001 default environment presents what the host's input and real width class prefer", async () => {
    const app = await openPresentation("probe");

    const env = envOf(app);
    expect(env.w).toBeGreaterThan(0);
    expect(env.h).toBeGreaterThan(0);

    await openOverlay(app);
    expect(app.texts()).toContain(
      `presentation=${derivedPresentation(app)}`,
    );
  });

  // adapt-sheets/create-presentation.md M-002 (A-001, 负断言): a compact
  // width under the pointer environment still presents panel — the sheet
  // path does not exist without input="touch". Pinned through
  // EnvironmentScope so it holds on every host (a real phone's default is
  // touch; its screen is already compact).
  test("M-002 injected pointer at compact width still presents panel — no sheet path without touch", async () => {
    const app = await openPresentation("probe", { scope: "pointer-compact" });

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=panel");
    expect(app.texts()).not.toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-003 (A-001): injected touch +
  // compact width presents sheet — both halves of the auto rule hold.
  // Pinned through EnvironmentScope; the same pair is what a real phone's
  // default environment derives (M-001 covers the derived half).
  test("M-003 injected touch at compact width presents sheet", async () => {
    const app = await openPresentation("probe", { scope: "touch-compact" });

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-004 (A-001): injected touch at a
  // regular width lacks the compact half, so the auto rule falls to panel
  // (the "touch tablet" scope).
  test("M-004 injected touch at regular width presents panel — compact missing", async () => {
    const app = await openPresentation("probe", { scope: "regular" });

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=panel");
    expect(app.texts()).not.toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-009 (A-001): a pinned prop beats
  // the auto rule outright, and once open the latch covers pin changes too —
  // flipping pin to "sheet" mid-open must not move the value.
  test("M-009 pin beats the auto rule, and the latch covers pin changes while open", async () => {
    // case=pin: pin="panel" fixed — under touch+compact the auto rule would
    // say sheet, the pin says panel.
    const pinned = await openPresentation("pin", { scope: "touch-compact" });

    await openOverlay(pinned);
    expect(pinned.texts()).toContain("presentation=panel");
    expect(pinned.texts()).not.toContain("presentation=sheet");

    // case=pin-toggle: pin starts "panel"; the press flips it to "sheet"
    // while the overlay is open — the latched "panel" must not move.
    const toggled = await openPresentation("pin-toggle", {
      scope: "touch-compact",
    });

    await openOverlay(toggled);
    expect(toggled.texts()).toContain("presentation=panel");

    await toggled.press("id:pin-toggle");
    await toggled.waitFor("text:pin=sheet");
    expect(toggled.texts()).toContain("presentation=panel");
    expect(toggled.texts()).not.toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-010 (A-001): `allowed` narrows the
  // codomain — auto wants sheet but ["panel","fullscreen"] has none, so the
  // result falls back to panel without leaving the set; with sheet allowed
  // the same environment still yields sheet.
  test("M-010 allowed narrows the auto result: no sheet falls back to panel, sheet allowed stays sheet", async () => {
    const pf = await openPresentation("allowed2", {
      scope: "touch-compact",
      allowed: "pf",
    });

    await openOverlay(pf);
    expect(pf.texts()).toContain("presentation=panel");
    expect(pf.texts()).not.toContain("presentation=sheet");

    const ps = await openPresentation("allowed2", {
      scope: "touch-compact",
      allowed: "ps",
    });

    await openOverlay(ps);
    expect(ps.texts()).toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-012 (A-006): the directory and
  // suffix convention is proven by pickup — this file is the shared
  // headless+web+native half, `presentation.mobile.headless.test.tsx`
  // carries the `open({platform, width, height})` and `setViewport` halves
  // a native host cannot run. The runnable part asserts the fixture mounts
  // and renders its closed baseline — the auto-rule preference this host
  // derives (a real phone: sheet; desktop/web: panel).
  test("M-012 pickup convention: this file mounts the fixture and runs on every host", async () => {
    const app = await openPresentation("probe");

    expect(app.shows("text:toggle")).toBe(true);
    expect(app.texts()).toContain("open=false");
    expect(app.texts()).toContain(
      `presentation=${derivedPresentation(app)}`,
    );
  });
});
