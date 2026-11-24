import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the surface adapt unit, one test per row of
 * adapt-sheets/surface.md §4 (M-001…M-006). The fixture is
 * `harness/surface.fixtures.tsx`: "basic" (bare string child), "variants"
 * (the four variants, each testID-named), "press" (caller `onPress` probe on
 * the root, no component feedback of its own) and "context" (a nested
 * `SurfaceContext` read) all mount under `EnvironmentScope`, fed by
 * `host.params.input` / `host.params.density`.
 *
 * The axes are always explicit — `input:"pointer"` is the desktop-parity
 * baseline every injected-environment assertion compares against and
 * `input:"touch"` the injected mobile half — because the host-derived
 * default differs per target (touch on ios/android, pointer on desktop
 * and web). No `platform`/`width` open options: native targets fill the
 * device screen and reject them. The observation channel is what
 * `nsh/test` sees: `shows` /
 * `texts` / `count` / `spanStyle` / `viewStyle`, `onLayout` bounds records
 * and `app.storage()` probe calls.
 */

// Resolved on the harness theme (theme/hero-nsh.theme.json), the same value
// surface.heroui.test.tsx T-002 pins for light foreground:
// oklch(0.2103 0.0059 285.89) → #18181bff.
const FOREGROUND_LIGHT = "#18181bff";

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

function openMobile(caseName: string, env: EnvParams = {}): Promise<App> {
  return open("../../../surface.fixtures.tsx", {
    host: {
      params: {
        case: caseName,
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** Waits until every named probe has reported at least once. */
async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((name) => boxes(app).some((box) => box.name === name)),
  );
}

const VARIANTS: Array<[string, string]> = [
  ["variant-default", "Default surface"],
  ["variant-secondary", "Secondary surface"],
  ["variant-tertiary", "Tertiary surface"],
  ["variant-transparent", "Transparent surface"],
];

/**
 * Everything an injected-environment assertion compares for one case:
 * the on-screen texts, and for the variants case each block's resolved
 * span style (its text color is the variant's observable paint).
 */
async function observeCase(env: EnvParams): Promise<{
  texts: (string)[];
  pressCalls: unknown[][];
  boxes: string[];
  colors: string[];
}> {
  const result = {
    texts: [] as (string)[],
    pressCalls: [] as unknown[][],
    boxes: [] as string[],
    colors: [] as string[],
  };

  const basic = await openMobile("basic", env);
  result.texts = basic.texts();

  const variants = await openMobile("variants", env);
  result.texts.push(...variants.texts());
  result.colors = VARIANTS.map(([, label]) => variants.spanStyle(`text:${label}`).color);

  const press = await openMobile("press", env);
  await settleLayout(press, ["root"]);
  const before = press.viewStyle("id:press-root");
  await press.press("id:press-root");
  const after = press.viewStyle("id:press-root");
  result.pressCalls = callsOf(press, "onPress");
  result.texts.push(...press.texts());
  result.boxes = [
    JSON.stringify(latestBox(press, "root")),
    `opacity:${before?.opacity}->${after?.opacity}`,
  ];

  const context = await openMobile("context", env);
  result.texts.push(...context.texts());

  return result;
}

/** The last reported box for a probe name. */
function latestBox(app: App, name: string): Box | undefined {
  const found = boxes(app).filter((box) => box.name === name);
  return found[found.length - 1];
}

describe("surface mobile", () => {
  // adapt-sheets/surface.md M-001 (baseline): default environment — the
  // bare string child is wrapped in Text (`renderChildren`, the T-001
  // channel) and every variant block renders with its label findable; the
  // transparent variant's text keeps the base `text-foreground` (the T-002
  // channel). `surfaceVariants` and the render path drift zero.
  test("M-001 default environment: children render and all four variants show", async () => {
    const basic = await openMobile("basic", { input: "pointer" });

    expect(basic.shows("text:Panel content")).toBe(true);
    expect(basic.count("id:basic-root")).toBe(1);

    const variants = await openMobile("variants", { input: "pointer" });

    for (const [id, label] of VARIANTS) {
      expect(variants.shows(`text:${label}`)).toBe(true);
      expect(variants.count(`id:${id}`)).toBe(1);
    }
    expect(variants.spanStyle("text:Transparent surface").color).toBe(FOREGROUND_LIGHT);
  });

  // adapt-sheets/surface.md M-002 (baseline, A-002): default environment —
  // a press on the root records the caller's `onPress` probe exactly once
  // with no repeat and no second probe name (the component adds no feedback
  // or press path of its own; `viewStyle` is unmoved), and a surface
  // without `onPress` renders unchanged — `rest` pass-through and the
  // `focusable ?? false` shape drift zero.
  test("M-002 default environment: caller onPress records once; plain surface renders", async () => {
    const app = await openMobile("press", { input: "pointer" });
    const before = app.viewStyle("id:press-root");

    await app.press("id:press-root");

    expect(callsOf(app, "onPress")).toHaveLength(1);
    expect(new Set(calls(app).map((call) => call.name))).toEqual(
      new Set(["layout", "onPress"]),
    );
    const after = app.viewStyle("id:press-root");
    expect(after?.opacity).toBe(before?.opacity);
    expect(after?.effectiveOpacity).toBe(before?.effectiveOpacity);

    const plain = await openMobile("basic", { input: "pointer" });

    expect(plain.shows("text:Panel content")).toBe(true);
    expect(callsOf(plain, "onPress")).toHaveLength(0);
  });

  // adapt-sheets/surface.md M-003 (baseline): default environment — the
  // consumer reads the outer surface's "secondary" and, inside the
  // independent inner surface, its "tertiary" override: `SurfaceContext`
  // delivery works and `Surface` / `Surface.Root` stay the same component
  // shape (A-007: contract unchanged).
  test("M-003 default environment: SurfaceContext delivers outer and inner variants", async () => {
    const app = await openMobile("context", { input: "pointer" });

    expect(app.shows("text:secondary")).toBe(true);
    expect(app.shows("text:tertiary")).toBe(true);
    expect(app.texts()).toEqual(["secondary", "tertiary"]);
    expect(app.count("id:context-reader-outer")).toBe(1);
    expect(app.count("id:context-reader-inner")).toBe(1);
  });

  // adapt-sheets/surface.md M-004 (A-001, A-002, A-003): `input="touch"`
  // with density untouched must not move a single observable — the table
  // has no input cell, so texts, resolved colors, root bounds, view style
  // and the press record equal the pointer environment's. The press still
  // fires the caller's probe exactly once under touch: the component does
  // not auto-become a button (the A-002 rule's touch-side control).
  // eight native relaunches (observeCase ×2) outrun the default 30s budget
  // on iOS; raised like select M-017/018 for the same relaunch cost.
  test("M-004 injected touch changes no observable across all cases", async () => {
    const touch = await observeCase({ input: "touch" });
    const pointer = await observeCase({ input: "pointer" });

    expect(touch.texts).toEqual(pointer.texts);
    expect(touch.colors).toEqual(pointer.colors);
    expect(touch.boxes).toEqual(pointer.boxes);
    expect(touch.pressCalls).toHaveLength(1);
    expect(touch.pressCalls).toEqual(pointer.pressCalls);
  }, 120_000);

  // adapt-sheets/surface.md M-005 (A-001): `density="compact"` (with touch,
  // the most divergent injection) moves nothing — the table has no density
  // cell either, so color tokens, the text baseline and the root box equal
  // the default environment's, and the press record is unchanged.
  test("M-005 compact density changes no observable across all cases", async () => {
    const compact = await observeCase({ input: "touch", density: "compact" });
    const pointer = await observeCase({ input: "pointer" });

    expect(compact.texts).toEqual(pointer.texts);
    expect(compact.colors).toEqual(pointer.colors);
    expect(compact.boxes).toEqual(pointer.boxes);
    expect(compact.pressCalls).toEqual(pointer.pressCalls);
  });

  // adapt-sheets/surface.md M-006 (A-005, A-006): every fixture case
  // dispatches on `host.params.case` — each opens to its own marker under
  // the explicit pointer scope that replaced the desktop pin, so
  // M-001…M-003's baseline assertions stand on every target alike.
  test("M-006 fixture cases dispatch on host.params.case under the pointer scope", async () => {
    const markers: Array<[string, string]> = [
      ["basic", "text:Panel content"],
      ["variants", "id:variant-default"],
      ["press", "id:press-root"],
      ["context", "id:context-outer"],
    ];

    for (const [name, marker] of markers) {
      const app = await openMobile(name, { input: "pointer" });
      expect(app.shows(marker)).toBe(true);
    }
  });
});
