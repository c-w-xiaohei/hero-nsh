import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the meter adapt unit, one test per row of
 * adapt-sheets/meter.md §4 (M-001…M-007). The fixture is
 * `harness/meter.fixtures.tsx`: `host.params.case` picks the mount and
 * `host.params.input` / `host.params.density` feed the `EnvironmentScope`
 * wrapper. The axes are always explicit — `input:"pointer"` is the
 * desktop-parity baseline every injected run compares against and
 * `input:"touch"` the injected mobile half — because the host-derived
 * default differs per target (touch on ios/android, pointer on desktop
 * and web). No `platform`/`width` open options: native targets fill the
 * device screen and reject them. The fixture's `EnvProbe` reports the
 * resolved pair as `env=input:… density:…`; M-003/M-004/M-006 assert it so an
 * injection that never engaged cannot pass vacuously, and `contentTexts`
 * filters it out of cross-environment text comparisons.
 *
 * Meter is a read-only display component: every §2 落点 (A-001…A-005) is
 * 保留, so the component carries no `input`/`density` axis and no gesture
 * path. What these rows pin is that nothing moves anyway — same boxes, same
 * texts, same disabled contract under the injected environments — and that a
 * touch press never reaches a callback, because none is wired and none may
 * be added ("计量展示不增加手势", A-004).
 *
 * M-007's dual-runner contract holds because no case needs a phone
 * platform injection or a held touch.
 */

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
  return open("../../../meter.fixtures.tsx", {
    clock: {},
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

/** Waits until every named `onLayout` probe has reported at least once. */
async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(
    () => names.every((name) => boxes(app).some((box) => box.name === name)),
    // The web target's first frames arrive slower than headless; the default
    // 5 s window flaked there on a clean run.
    { timeout: 30_000 },
  );
}

/**
 * name → sorted unique bounds. onLayout can fire more than once per view;
 * comparing the set of distinct boxes keeps repeat firings honest without
 * depending on how many frames the layout took.
 */
function boxSet(app: App): Record<string, string[]> {
  const groups: Record<string, Set<string>> = {};
  for (const box of boxes(app)) {
    const key = JSON.stringify({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    });
    (groups[box.name] ??= new Set()).add(key);
  }
  const out: Record<string, string[]> = {};
  for (const [name, set] of Object.entries(groups)) {
    out[name] = [...set].sort();
  }
  return out;
}

/** The last bounds a probed view reported. */
function lastBox(app: App, name: string): Box {
  const found = boxes(app).filter((box) => box.name === name);
  const box = found[found.length - 1];

  if (!box) throw new Error(`no layout call recorded for ${name}`);

  return box;
}

/** `texts()` minus the fixture's EnvProbe line, which names the injected environment on purpose. */
function contentTexts(app: App): string[] {
  return app.texts().filter((text) => !text.startsWith("env="));
}

describe("meter mobile", () => {
  // adapt-sheets/meter.md M-001 (baseline): the `default` case under the
  // default environment — the Label registers "Storage" as the accessible
  // name on the progressbar role, Output shows "60%", Fill sits inside
  // Track, and the fill's box is 60% of the 300-point track (180 pt), so the
  // clamp → percentage chain has no regression.
  test("M-001 default environment: named progressbar, 60% output, 180-point fill", async () => {
    const app = await openMobile("default", { input: "pointer" });

    expect(app.shows("role:progressbar[Storage]")).toBe(true);
    expect(app.shows("id:output >> text:60%")).toBe(true);
    expect(app.shows("id:track >> id:fill")).toBe(true);

    await settleLayout(app, ["root", "track", "fill"]);
    expect(lastBox(app, "track").width).toBe(300);
    expect(lastBox(app, "fill").width).toBe(180);
  }, 120_000);

  // adapt-sheets/meter.md M-002 (baseline): every other case's geometry and
  // text under the default environment — sm/md/lg track heights 4/8/12 pt
  // with fills at 40/60/80 of 300, the success and danger fills painting
  // different resolved backgrounds, `valueLabel` overriding the output text
  // while percentage still sizes the fill, currency formatOptions, the
  // `aria-disabled` contract, and the render-prop accessors driving content.
  test("M-002 baseline: sizes, colors, value-label, custom-format, disabled, render-prop", async () => {
    const sizes = await openMobile("sizes", { input: "pointer" });
    await settleLayout(sizes, ["track-sm", "track-md", "track-lg", "fill-sm", "fill-md", "fill-lg"]);

    expect(lastBox(sizes, "track-sm").height).toBe(4);
    expect(lastBox(sizes, "track-md").height).toBe(8);
    expect(lastBox(sizes, "track-lg").height).toBe(12);
    expect(lastBox(sizes, "track-sm").width).toBe(300);
    expect(lastBox(sizes, "fill-sm").width).toBe(120);
    expect(lastBox(sizes, "fill-md").width).toBe(180);
    expect(lastBox(sizes, "fill-lg").width).toBe(240);
    expect(sizes.shows("id:output-sm >> text:40%")).toBe(true);
    expect(sizes.shows("id:output-lg >> text:80%")).toBe(true);

    const colors = await openMobile("colors", { input: "pointer" });
    await settleLayout(colors, ["fill-success", "fill-danger"]);

    expect(lastBox(colors, "fill-success").width).toBe(150);
    const successFill = colors.viewStyle("id:fill-success");
    const dangerFill = colors.viewStyle("id:fill-danger");
    expect(successFill?.backgroundColor).toBeTruthy();
    expect(dangerFill?.backgroundColor).toBeTruthy();
    expect(dangerFill?.backgroundColor).not.toBe(successFill?.backgroundColor);

    const valueLabel = await openMobile("value-label", { input: "pointer" });
    await settleLayout(valueLabel, ["fill"]);
    expect(valueLabel.shows("id:value-label >> text:3 of 10 completed")).toBe(true);
    expect(lastBox(valueLabel, "fill").width).toBe(90);

    const customFormat = await openMobile("custom-format", { input: "pointer" });
    await settleLayout(customFormat, ["fill"]);
    expect(customFormat.texts().some((text) => text.includes("$750"))).toBe(true);
    expect(lastBox(customFormat, "fill").width).toBe(225);

    const disabled = await openMobile("disabled", { input: "pointer" });
    await settleLayout(disabled, ["fill"]);
    expect(disabled.enabled("role:progressbar[Storage]")).toBe(false);
    expect(disabled.shows("id:output >> text:50%")).toBe(true);
    expect(lastBox(disabled, "fill").width).toBe(150);

    const renderProp = await openMobile("render-prop", { input: "pointer" });
    await settleLayout(renderProp, ["fill"]);
    expect(renderProp.shows("id:output >> text:done 40% (40%)")).toBe(true);
    expect(lastBox(renderProp, "fill").width).toBe(120);
  }, 120_000);

  // adapt-sheets/meter.md M-003 (A-001, A-002, A-003): under injected
  // `input="touch"` the same mount reports every box and every text
  // identical to the pointer baseline — the component table carries no
  // `input` axis, so nothing may move.
  test("M-003 injected touch changes no box and no text", async () => {
    const pointer = await openMobile("default", { input: "pointer" });
    const touch = await openMobile("default", { input: "touch" });

    // The scope really engaged — without this line the comparison below
    // would pass even if `host.params.input` never reached EnvironmentScope.
    expect(touch.texts()).toContain("env=input:touch density:default");
    expect(pointer.texts()).toContain("env=input:pointer density:default");

    await settleLayout(pointer, ["root", "output", "track", "fill"]);
    await settleLayout(touch, ["root", "output", "track", "fill"]);

    expect(boxSet(touch)).toEqual(boxSet(pointer));
    expect(contentTexts(touch)).toEqual(contentTexts(pointer));
  }, 120_000);

  // adapt-sheets/meter.md M-004 (A-001, A-002): under injected
  // `density="compact"` every box equals the default environment's — the
  // component table carries no `density` axis, so `gap-1`, the track height
  // and the radii do not follow the preset.
  test("M-004 injected compact density changes no box", async () => {
    const plain = await openMobile("default", { input: "pointer" });
    const compact = await openMobile("default", { input: "pointer", density: "compact" });

    // Same non-vacuity guard as M-003: the compact preset must be mounted.
    expect(compact.texts()).toContain("env=input:pointer density:compact");

    await settleLayout(plain, ["root", "output", "track", "fill"]);
    await settleLayout(compact, ["root", "output", "track", "fill"]);

    expect(boxSet(compact)).toEqual(boxSet(plain));
  }, 120_000);

  // adapt-sheets/meter.md M-005 (A-004): under injected touch, pressing the
  // root and the track never reaches a callback — the component registers no
  // gesture path ("计量展示不增加手势") and nothing about the mount changes.
  // Every recorded call stays a layout probe.
  test("M-005 injected touch: pressing the meter fires no callback and changes nothing", async () => {
    const app = await openMobile("default", { input: "touch" });
    await settleLayout(app, ["root", "track", "fill"]);
    const before = boxSet(app);
    const beforeTexts = app.texts();

    // Nothing around the meter hears presses — `app.press` resolves no
    // view that answers and rejects `ERR_NSH_TEST_NOT_FOUND` (the same
    // strict form separator/spinner's negative rows use).
    for (const selector of ["id:meter", "id:track"]) {
      await expect(app.press(selector)).rejects.toMatchObject({
        code: "ERR_NSH_TEST_NOT_FOUND",
      });
    }

    const names = calls(app).map((call) => call.name);
    expect(new Set(names)).toEqual(new Set(["layout"]));
    expect(boxSet(app)).toEqual(before);
    expect(app.texts()).toEqual(beforeTexts);
  }, 120_000);

  // adapt-sheets/meter.md M-006 (A-006): the fixture channel works — every
  // case mounts its own tree and the fill `onLayout` probe writes bounds a
  // test reads back through `app.storage()`.
  test("M-006 fixture channel: every case mounts and its probes record", async () => {
    const mounts: Array<{ name: string; selector: string; probes: string[] }> = [
      { name: "default", selector: "role:progressbar[Storage]", probes: ["root", "track", "fill"] },
      { name: "sizes", selector: "id:meter-lg", probes: ["track-sm", "track-md", "track-lg"] },
      { name: "colors", selector: "id:meter-danger", probes: ["fill-success", "fill-danger"] },
      { name: "value-label", selector: "id:value-label", probes: ["fill"] },
      { name: "custom-format", selector: "id:meter", probes: ["fill"] },
      { name: "disabled", selector: "role:progressbar[Storage]", probes: ["fill"] },
      { name: "render-prop", selector: "id:meter", probes: ["fill"] },
    ];

    for (const mount of mounts) {
      const app = await openMobile(mount.name, { input: "pointer" });
      expect(app.shows(mount.selector)).toBe(true);
      await settleLayout(app, mount.probes);
      for (const probe of mount.probes) {
        expect(lastBox(app, probe).width).toBeGreaterThan(0);
      }

      // The loop's pointer-scoped "default" mount is also the baseline half
      // of the ScopedMobile check.
      if (mount.name === "default") {
        expect(app.texts()).toContain("env=input:pointer density:default");
      }
    }

    // The injection half: one mount carrying both params proves each reaches
    // its own EnvironmentScope field — `input` reports touch while `density`
    // reports compact (M-003/M-004 already pin the single-param forms).
    const injected = await openMobile("default", {
      input: "touch",
      density: "compact",
    });
    expect(injected.texts()).toContain("env=input:touch density:compact");
  }, 120_000);

  // adapt-sheets/meter.md M-007 (A-007): the same assertions pass in both
  // environments this file serves — the `ScopedMobile` injection path under
  // touch and the unpinned host baseline — so headless and `--target web`
  // replay them identically.
  test("M-007 dual environment in one file: baseline and injected-touch mounts both pass", async () => {
    const baseline = await openMobile("default", { input: "pointer" });
    await settleLayout(baseline, ["fill"]);
    expect(baseline.shows("role:progressbar[Storage]")).toBe(true);
    expect(lastBox(baseline, "fill").width).toBe(180);

    const touch = await openMobile("default", { input: "touch" });
    await settleLayout(touch, ["fill"]);
    expect(touch.shows("role:progressbar[Storage]")).toBe(true);
    expect(lastBox(touch, "fill").width).toBe(180);
  }, 120_000);
});
