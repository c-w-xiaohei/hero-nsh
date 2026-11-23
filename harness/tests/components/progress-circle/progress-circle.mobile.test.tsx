import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the progress-circle adapt unit, one test per row of
 * adapt-sheets/progress-circle.md §4 (M-001…M-007). The fixture is
 * `harness/progress-circle.fixtures.tsx`: `case` picks the mount
 * (paint/sizes/indeterminate/disabled), `host.params.input` /
 * `host.params.density` feed the `EnvironmentScope` wrapper. The axes are
 * always explicit — `input:"pointer"` is the desktop-parity baseline every
 * environment assertion compares against and `input:"touch"` the injected
 * mobile half — because the host-derived default differs per target
 * (touch on ios/android, pointer on desktop and web). No `platform`/`width`
 * open options: native targets fill the device screen and reject them.
 *
 * ProgressCircle is a read-only meter: nothing adapts (every §2 seam is
 * 保留), so the mobile layer asserts sameness — the same track boxes, the
 * same recorded stroke shapes and paints, and no press path under the
 * injected touch environment.
 */

type EnvParams = {
  input?: "pointer" | "touch";
  density?: "default" | "compact";
};

function openCircle(caseName: string, env: EnvParams = {}): Promise<App> {
  return open("../../../progress-circle.fixtures.tsx", {
    host: {
      params: {
        case: caseName,
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

type StrokeCall = { paint: string; lineCap: string; dash: number[] };

function strokes(app: App): StrokeCall[] {
  return callsOf(app, "stroke").map((args) => args[0] as StrokeCall);
}

/** The expected paint the fixture's `expected-paint` probe reported. */
function expectedPaint(app: App): string {
  return (callsOf(app, "expected-paint").at(-1)?.[0] as { paint: string })
    .paint;
}

/**
 * The paint signature of the mount: the last solid stroke is the track
 * (dash empty, `butt` caps), the last dashed one the fill (`round` caps).
 * The set is compared across environments — a stable signature is the
 * port's proof that the canvases painted the same thing, since `nsh/test`
 * sees neither computed style nor pixels.
 */
function paintSignature(app: App): {
  trackPaint: string;
  fillPaint: string;
  fillDash: number[];
} {
  const calls = strokes(app);
  const track = calls.filter((call) => call.dash.length === 0).at(-1)!;
  const fill = calls.filter((call) => call.dash.length > 0).at(-1)!;

  return {
    trackPaint: track.paint,
    fillPaint: fill.paint,
    fillDash: fill.dash,
  };
}

/** Waits until both canvases stroked at least once. */
async function settleStrokes(app: App): Promise<void> {
  await app.waitUntil(() => {
    const calls = strokes(app);

    return (
      calls.some((call) => call.dash.length === 0) &&
      calls.some((call) => call.dash.length > 0)
    );
  });
}

type Box = { name: string; x: number; y: number; width: number; height: number };

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** name → sorted unique bounds; repeat onLayout firings dedupe. */
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

/** Waits until the `sizes` case reported all three track boxes. */
async function settleSizes(app: App): Promise<void> {
  await app.waitUntil(() =>
    ["track-sm", "track-md", "track-lg"].every((name) =>
      boxes(app).some((box) => box.name === name),
    ),
  );
}

/** The rounded width/height of one probed track box. */
function trackSize(app: App, name: string): { width: number; height: number } {
  const box = boxes(app).find((entry) => entry.name === name)!;

  return { width: Math.round(box.width), height: Math.round(box.height) };
}

describe("progress-circle mobile", () => {
  // adapt-sheets/progress-circle.md M-001 (基线): default environment — the
  // `paint` case names a `role:progressbar` "Loading" whose fill arc strokes
  // with the `warning` token the `expected-paint` probe reports, dashed,
  // while the track ring strokes the same paint shape with an empty dash —
  // the T-003 paint channel re-run inside the mobile file.
  test("M-001 default environment: progressbar named, fill dashed with the color token, track solid", async () => {
    const app = await openCircle("paint", { input: "pointer" });

    expect(app.shows("role:progressbar[Loading]")).toBe(true);

    await settleStrokes(app);

    const { trackPaint, fillPaint, fillDash } = paintSignature(app);
    expect(fillPaint).toBe(expectedPaint(app));
    expect(fillDash).toHaveLength(2);
    expect(trackPaint.length).toBeGreaterThan(0);
  });

  // adapt-sheets/progress-circle.md M-002 (基线): default environment — the
  // `sizes` case lays out sm/md/lg track boxes at 20/28/36 pt (the `size`
  // variant contract), `indeterminate` mounts a visible progressbar with a
  // dashed fill, and `aria-disabled` reports a disabled progressbar.
  test("M-002 default environment: size boxes pinned, indeterminate mounts, aria-disabled disables", async () => {
    const sizes = await openCircle("sizes", { input: "pointer" });
    await settleSizes(sizes);

    expect(trackSize(sizes, "track-sm")).toEqual({ width: 20, height: 20 });
    expect(trackSize(sizes, "track-md")).toEqual({ width: 28, height: 28 });
    expect(trackSize(sizes, "track-lg")).toEqual({ width: 36, height: 36 });

    const indeterminate = await openCircle("indeterminate", { input: "pointer" });
    await settleStrokes(indeterminate);

    expect(indeterminate.shows("role:progressbar")).toBe(true);
    expect(paintSignature(indeterminate).fillDash).toHaveLength(2);

    const disabled = await openCircle("disabled", { input: "pointer" });

    expect(disabled.shows("role:progressbar[Loading]")).toBe(true);
    expect(disabled.enabled("role:progressbar[Loading]")).toBe(false);
  });

  // adapt-sheets/progress-circle.md M-003 (A-001/A-002/A-003): injected
  // `input="touch"` changes nothing observable — the same laid-out track
  // boxes and the same paint signature as the default environment, because
  // the styles table took no `input` axis (the hit-area / hover-removal
  // duties do not apply to a read-only meter).
  test("M-003 injected touch: track boxes and paint signature identical to the default environment", async () => {
    const touch = await openCircle("sizes", { input: "touch" });
    const pointer = await openCircle("sizes", { input: "pointer" });

    await settleSizes(touch);
    await settleSizes(pointer);

    expect(boxSet(touch)).toEqual(boxSet(pointer));

    const touchPaint = await openCircle("paint", { input: "touch" });
    const pointerPaint = await openCircle("paint", { input: "pointer" });

    await settleStrokes(touchPaint);
    await settleStrokes(pointerPaint);

    // Paints are token strings each app resolved in its own appearance, so
    // they are compared within the app (against the probe) and the
    // signatures across apps only on shape.
    expect(paintSignature(touchPaint).fillPaint).toBe(
      expectedPaint(touchPaint),
    );
    expect(paintSignature(pointerPaint).fillPaint).toBe(
      expectedPaint(pointerPaint),
    );
    expect(paintSignature(touchPaint).fillDash).toEqual(
      paintSignature(pointerPaint).fillDash,
    );
  });

  // adapt-sheets/progress-circle.md M-004 (A-001/A-002/A-003): injected
  // `density="compact"` changes nothing either — the component table took no
  // `density` axis (track size is the `size` variant's contract, drawing
  // geometry scales with the box), so boxes and the paint signature equal
  // the default environment's.
  test("M-004 injected compact density: track boxes and paint signature identical to the default environment", async () => {
    const compact = await openCircle("sizes", { input: "pointer", density: "compact" });
    const baseline = await openCircle("sizes", { input: "pointer" });

    await settleSizes(compact);
    await settleSizes(baseline);

    expect(boxSet(compact)).toEqual(boxSet(baseline));

    const compactPaint = await openCircle("paint", { input: "pointer", density: "compact" });
    const baselinePaint = await openCircle("paint", { input: "pointer" });

    await settleStrokes(compactPaint);
    await settleStrokes(baselinePaint);

    expect(paintSignature(compactPaint).fillPaint).toBe(
      expectedPaint(compactPaint),
    );
    expect(paintSignature(compactPaint).fillDash).toEqual(
      paintSignature(baselinePaint).fillDash,
    );
  });

  // adapt-sheets/progress-circle.md M-005 (A-005): injected touch adds no
  // gesture path — `app.press` finds no view that hears presses on the root
  // or the track and rejects, so nothing can ever record a callback.
  test("M-005 injected touch: no press path on root or track", async () => {
    const app = await openCircle("sizes", { input: "touch" });

    await expect(
      app.press("role:progressbar[Loading sm]"),
    ).rejects.toMatchObject({ code: "ERR_NSH_TEST_NOT_FOUND" });
    await expect(app.press("id:track-md")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });
  });

  // adapt-sheets/progress-circle.md M-006 (A-007): the fixture channel
  // itself — every `case` mounts its UI, and the stroke recording and
  // `onLayout` probes write data the test can read back. Covered by
  // M-001…M-005 exercising all four cases; this pins the read-back shape.
  test("M-006 fixture channel: cases mount and probes write readable storage", async () => {
    const paint = await openCircle("paint", { input: "pointer" });
    await settleStrokes(paint);

    expect(expectedPaint(paint).length).toBeGreaterThan(0);
    expect(strokes(paint).length).toBeGreaterThanOrEqual(2);

    const sizes = await openCircle("sizes", { input: "pointer" });
    await settleSizes(sizes);

    expect(boxes(sizes).length).toBeGreaterThanOrEqual(3);
  });

  // adapt-sheets/progress-circle.md M-007 (A-008): this file itself — the
  // baseline opens through the explicit pointer scope that replaces the old
  // desktop pin, and the injected-environment mounts share one file under
  // every target; no `.headless.`/`.web.` split is needed because nothing
  // injects a mobile platform or drags a held touch.
  test("M-007 dual environment: the scoped open works under every target", async () => {
    const baseline = await openCircle("paint", { input: "pointer" });
    await settleStrokes(baseline);
    expect(baseline.shows("role:progressbar[Loading]")).toBe(true);

    const touch = await openCircle("paint", { input: "touch" });
    await settleStrokes(touch);
    expect(touch.shows("role:progressbar[Loading]")).toBe(true);
    expect(paintSignature(touch).fillDash).toEqual(
      paintSignature(baseline).fillDash,
    );
  });
});
