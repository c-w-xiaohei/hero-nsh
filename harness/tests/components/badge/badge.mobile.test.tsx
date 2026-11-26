import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the badge adapt unit, one test per row of
 * adapt-sheets/badge.md §4 (M-001…M-005). The fixture is
 * `harness/badge.fixtures.tsx` opened with `host.params.case = "mobile"`:
 * `input` / `density` params feed an `EnvironmentScope`. The axes are
 * always explicit — `input:"pointer"` is the desktop-parity baseline
 * every comparison runs against and `input:"touch"` the injected mobile
 * half — because the host-derived default differs per target (touch on
 * ios/android, pointer on desktop and web). No `platform`/`width` open
 * options: native targets fill the device screen and reject them.
 *
 * Badge is action A, pure display: no input/density axis, no gesture, no
 * presentation container. The mobile rows therefore assert invariance —
 * identical bounds, texts and resolved styles across environments — plus
 * the baseline geometry the existing .heroui/.kobalte files do not measure
 * (the size axis' minimum boxes, the placement translate, the label's
 * px-0.5 against a bare Text of the same face).
 *
 * The observation channel is what `nsh/test` sees: `onLayout` bounds records
 * (probe "layout", full boxes), `texts()` for the rendered strings,
 * `spanStyle`/`viewStyle` for the resolved paint, `app.press` + the "onPress"
 * probe for the pass-through check, and `calls(app)` for the absence of any
 * other callback.
 */

const ACCENT_SOFT_FOREGROUND = "#1e63aeff";

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

function openBadge(env: EnvParams = {}): Promise<App> {
  return open("../../../badge.fixtures.tsx", {
    host: {
      params: {
        case: "mobile",
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** The last bounds record of a probe name; onLayout can fire more than once. */
function lastBox(app: App, name: string): Box {
  const found = boxes(app).filter((box) => box.name === name).pop();

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App): Promise<void> {
  await app.waitUntil(() =>
    [
      "anchor",
      "root",
      "label",
      "root-sm",
      "root-lg",
      "press-root",
      "text-ref",
    ].every((name) => boxes(app).some((box) => box.name === name)),
  );
}

/**
 * name → sorted unique bounds. Repeat onLayout firings collapse to the set of
 * distinct boxes, so an environment comparison does not depend on how many
 * frames the layout took.
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

describe("badge mobile", () => {
  // adapt-sheets/badge.md M-001 (baseline): the md badge's minimum box is
  // min-h-7 min-w-7 (28pt) — "5" is short enough that the minimum, not the
  // content, sets both dimensions. String children render (texts), the
  // label carries px-0.5 — its width exceeds the bare Text of the same face
  // by exactly the four points of horizontal padding (the implicit-wrap
  // parity itself is pinned by badge.heroui.test.tsx T-005) — and the
  // default top-right placement anchors the badge's layout box to the
  // anchor's top-right corner.
  //
  // onLayout origins are parent-relative and report the layout box, not the
  // transform: `translate(25%, -25%)` moves the badge visually but never
  // enters bounds, so the observable half of the placement row is `right:0
  // top-0` — the badge's right edge flush with the anchor's right edge and
  // its top edge flush with the anchor's top. The quarter-shift itself is a
  // pure function of the badge's size and is covered by the environment
  // invariance rows M-003/M-004.
  test("M-001 md badge hits the 28pt minimum box, label padding and corner placement hold", async () => {
    const app = await openBadge({ input: "pointer" });
    await settleLayout(app);

    // Native layout reports fractional-px bounds (Android measured 27.8095
    // at its device dpi, iOS 4.00000047 on the pad diff): the contracts —
    // ≥28pt minimum, 4pt of horizontal padding, corner-flush placement —
    // are asserted within a 0.25pt quantization window, not a tolerance on
    // the geometry.
    const md = lastBox(app, "root");
    expect(md.width).toBeGreaterThanOrEqual(28 - 0.25);
    expect(md.height).toBeGreaterThanOrEqual(28 - 0.25);
    expect(md.width).toBeLessThanOrEqual(30 + 0.25);
    expect(md.height).toBeLessThanOrEqual(30 + 0.25);

    for (const text of ["1", "5", "9", "99", "Paint"]) {
      expect(app.texts()).toContain(text);
    }

    // label (px-0.5) minus the bare Text of the same face = 4pt of padding.
    const label = lastBox(app, "label");
    const textRef = lastBox(app, "text-ref");
    expect(Math.abs(label.width - textRef.width - 4)).toBeLessThan(0.25);

    // The badge's bounds are relative to its Anchor parent: right:0 top:0
    // puts its right edge on the anchor's right edge (80pt box) and its top
    // edge on the anchor's top.
    const anchor = lastBox(app, "anchor");
    expect(Math.abs(anchor.width - 80)).toBeLessThan(0.25);
    expect(Math.abs(anchor.height - 80)).toBeLessThan(0.25);
    expect(Math.abs(md.x + md.width - anchor.width)).toBeLessThan(0.25);
    expect(Math.abs(md.y)).toBeLessThan(0.25);
  });

  // adapt-sheets/badge.md M-002 (baseline): the size axis keeps its minimum
  // boxes — sm 16pt, lg 32pt, both dimensions exactly the min-* value since
  // "1"/"99" are content-narrow — and the color × variant paint resolves
  // the same on both targets: secondary keeps the base background and takes
  // the color's soft foreground (#1e63aeff for accent).
  test("M-002 sm/lg minimum boxes and the secondary accent paint resolve unchanged", async () => {
    const app = await openBadge({ input: "pointer" });
    await settleLayout(app);

    const sm = lastBox(app, "root-sm");
    const lg = lastBox(app, "root-lg");

    // Same fractional-px bound as M-001: exact tiers ±0.25pt.
    expect(Math.abs(sm.width - 16)).toBeLessThan(0.25);
    expect(Math.abs(sm.height - 16)).toBeLessThan(0.25);
    expect(Math.abs(lg.width - 32)).toBeLessThan(0.25);
    expect(Math.abs(lg.height - 32)).toBeLessThan(0.25);

    expect(app.spanStyle("text:Paint").color).toBe(ACCENT_SOFT_FOREGROUND);
  });

  // adapt-sheets/badge.md M-003 (A-001…A-004): Badge reads no environment
  // seam — under injected touch every probed box and every rendered string
  // is identical to the pointer baseline.
  test("M-003 injected touch changes no bound and no text", async () => {
    // Snapshot the touch app before the next open — a native open
    // relaunches the single host and invalidates every earlier App.
    const touch = await openBadge({ input: "touch" });
    await settleLayout(touch);
    const touchBoxes = boxSet(touch);
    const touchTexts = touch.texts();

    const pointer = await openBadge({ input: "pointer" });
    await settleLayout(pointer);
    const pointerBoxes = boxSet(pointer);
    const pointerTexts = pointer.texts();

    expect(touchBoxes).toEqual(pointerBoxes);
    expect(touchTexts).toEqual(pointerTexts);
  });

  // adapt-sheets/badge.md M-004 (A-001…A-003): the density preset resolves
  // through the token layer only; Badge's table has no density axis, so
  // `density="compact"` moves nothing either.
  test("M-004 injected compact density changes no bound and no text", async () => {
    const compact = await openBadge({ input: "pointer", density: "compact" });
    await settleLayout(compact);
    const compactBoxes = boxSet(compact);
    const compactTexts = compact.texts();

    const plain = await openBadge({ input: "pointer" });
    await settleLayout(plain);
    const plainBoxes = boxSet(plain);
    const plainTexts = plain.texts();

    expect(compactBoxes).toEqual(plainBoxes);
    expect(compactTexts).toEqual(plainTexts);
  });

  // adapt-sheets/badge.md M-005 (A-004): pure display — pressing the badge
  // may only record the caller's own `onPress`, once, and adds no callback
  // of its own under either environment; the layout does not move.
  test("M-005 press fires only the caller's onPress, once, in both environments", async () => {
    for (const env of [{ input: "pointer" }, { input: "touch" }] as EnvParams[]) {
      const app = await openBadge(env);
      await settleLayout(app);

      const before = boxSet(app);
      await app.press("text:9");

      expect(callsOf(app, "onPress")).toHaveLength(1);
      const fired = calls(app)
        .filter((call) => call.name !== "layout")
        .map((call) => call.name);
      expect(fired).toEqual(["onPress"]);
      expect(boxSet(app)).toEqual(before);
    }
  });
});
