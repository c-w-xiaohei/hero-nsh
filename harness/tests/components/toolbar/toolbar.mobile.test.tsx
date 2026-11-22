import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the adapt unit toolbar, one test per row of
 * adapt-sheets/toolbar.md §4 (M-001…M-008). The fixture is
 * `harness/toolbar.fixtures.tsx`; `host.params.scope` picks the
 * `EnvironmentScope` ("touch", "touch-compact"), and its absence is the
 * default pointer environment — the desktop-parity baseline the action
 * pins: the toolbar container never takes a press surface of its own
 * ("容器不加按压"), and every mobile behaviour is inherited from the child
 * controls' own `input` axis (button / toggle-button units, sheet §5).
 *
 * `app.press`, `shows`, `enabled`, `texts` and the Storage probes are the
 * whole observation channel; no class names or computed styles are read.
 * Every case opens with a desktop `platform` pin and the 1024×768 window the
 * w1 files use: without it the app would land on the phone-sized engine and
 * the pointer-default assertions would invert under the suite.
 */

type LayoutCall = { name: string; x: number; y: number; width: number; height: number };

/*
 * What `SeamProbe` in the fixture reports: the press-feedback seam's gate
 * (`enabled`), the invisible hit-area expansion it computes (`hitSlop`, the
 * Edges or null) and the child's laid-out box (`bounds`). `hitSlop` is a View
 * prop nsh/test cannot read directly (sheet §6); the context is its only
 * observable surface. A child that never mounted the seam reports the
 * context's resting default — `enabled: false`, `hitSlop: null`, zero
 * bounds — so the assertions below take `enabled` as the evidence the child's
 * own touch uplift is live.
 */
type CtxEnv = {
  id: string;
  enabled: boolean;
  hitSlop: { top: number; right: number; bottom: number; left: number } | null;
  bounds: { width: number; height: number };
};

/** The most recent `ctx-env` sample a named seam probe reported, if any. */
function lastEnv(app: App, id: string): CtxEnv | undefined {
  return callsOf(app, "ctx-env")
    .map((call) => call[0] as CtxEnv)
    .filter((env) => env.id === id)
    .at(-1);
}

/**
 * The design's observable hit-area contract (encapsulation hit-area rule:
 * visible size via the child's `input` axis, invisible expansion via the
 * seam's `hitSlop`): an enabled seam's laid-out box plus its slop must reach
 * the 44pt touch minimum on both axes; a seam that never mounted answers the
 * resting default and must claim no expansion.
 */
function seamReachesTouchTarget(env: CtxEnv): boolean {
  if (!env.enabled) {
    return env.hitSlop === null;
  }

  const slopX = env.hitSlop ? env.hitSlop.left + env.hitSlop.right : 0;
  const slopY = env.hitSlop ? env.hitSlop.top + env.hitSlop.bottom : 0;

  return env.bounds.width + slopX >= 44 && env.bounds.height + slopY >= 44;
}

function layoutCalls(app: App): LayoutCall[] {
  return callsOf(app, "layout").map((args) => args[0] as LayoutCall);
}

function frames(app: App, name: string): LayoutCall[] {
  return layoutCalls(app).filter((call) => call.name === name);
}

/** Waits until the app's layout pass has reached `names`: an `open` can resolve before the first commit. */
async function firstFrame(app: App, ...names: string[]): Promise<void> {
  await app.waitUntil(
    () => names.every((name) => frames(app, name).length > 0),
    { timeout: 15_000 },
  );
}

function lastFrame(app: App, name: string): LayoutCall {
  const found = frames(app, name).at(-1);

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

const WIDE_NAMES = [
  "wide-root",
  "wide-0",
  "wide-1",
  "wide-2",
  "wide-3",
  "wide-4",
  "wide-5",
  "wide-6",
];

function openToolbar(
  caseName: string,
  scope?: "touch" | "touch-compact",
): Promise<App> {
  return open("../../../toolbar.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...(scope ? { scope } : {}) } },
  });
}

describe("toolbar mobile", () => {
  // adapt-sheets/toolbar.md M-001 (A-003): default environment (pointer
  // baseline) — pressing an unselected Button or ToggleButton fires its own
  // probe exactly once; the sibling controls' probes and the explicit root
  // `onPress` stay silent (the container neither swallows nor forwards a
  // child's press).
  test("M-001 default environment: child presses fire their own probes exactly once", async () => {
    const app = await openToolbar("press-root");
    await app.waitFor("role:button[Undo]", { timeout: 15_000 });

    await app.press("role:button[Undo]");
    expect(callsOf(app, "onPress")).toEqual([["undo"]]);

    await app.press("role:button[Redo]");
    expect(callsOf(app, "onPress")).toEqual([["undo"], ["redo"]]);

    await app.press("role:button[Bold]");
    expect(callsOf(app, "onSelectionChange")).toEqual([[["bold"]]]);

    // The root `onPress` and the disabled sibling never fired: the probe
    // still holds only the two control presses above.
    expect(callsOf(app, "onPress")).toEqual([["undo"], ["redo"]]);
  }, 120_000);

  // adapt-sheets/toolbar.md M-002 (A-001): default environment — the bare
  // surface between items has no press surface at all (the spacer hears no
  // presses and no ancestor does either, so the press finds nothing), and
  // when the caller does give the root an `onPress` it fires exactly once
  // from the bare surface and never from a control inside.
  test("M-002 default environment: bare surface press reaches only an explicit root onPress", async () => {
    const bare = await openToolbar("press");
    await bare.waitFor("id:toolbar-gap", { timeout: 15_000 });

    await expect(bare.press("id:toolbar-gap")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });
    expect(callsOf(bare, "onPress")).toHaveLength(0);
    expect(callsOf(bare, "onSelectionChange")).toHaveLength(0);

    const rooted = await openToolbar("press-root");
    await rooted.waitFor("id:toolbar-gap", { timeout: 15_000 });

    await rooted.press("id:toolbar-gap");
    expect(callsOf(rooted, "onPress")).toEqual([["root"]]);

    await rooted.press("role:button[Undo]");
    expect(callsOf(rooted, "onPress")).toEqual([["root"], ["undo"]]);
  }, 120_000);

  // adapt-sheets/toolbar.md M-003 (A-001): the same bare-surface contract
  // under an injected touch environment — "容器不加按压" holds on mobile
  // too: no self feedback surface, child probes stay empty, and an explicit
  // root `onPress` still fires only from the bare surface.
  test("M-003 under touch the container still has no press surface of its own", async () => {
    const bare = await openToolbar("press", "touch");
    await bare.waitFor("id:toolbar-gap", { timeout: 15_000 });

    await expect(bare.press("id:toolbar-gap")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });
    expect(callsOf(bare, "onPress")).toHaveLength(0);
    expect(callsOf(bare, "onSelectionChange")).toHaveLength(0);

    const rooted = await openToolbar("press-root", "touch");
    await rooted.waitFor("id:toolbar-gap", { timeout: 15_000 });

    await rooted.press("id:toolbar-gap");
    expect(callsOf(rooted, "onPress")).toEqual([["root"]]);

    await rooted.press("role:button[Undo]");
    expect(callsOf(rooted, "onPress")).toEqual([["root"], ["undo"]]);
  }, 120_000);

  // adapt-sheets/toolbar.md M-004 (A-003): under `input="touch"` the child
  // controls' own adaptation still delivers — each press fires its probe
  // exactly once, and each child's press-feedback seam reports an effective
  // hit area (laid-out bounds plus the invisible `hitSlop` expansion) of at
  // least 44pt inside the toolbar's `grid`/`gap-2` layout, or the resting
  // default when the child carries no seam of its own; `isDisabled` still
  // blocks the press.
  test("M-004 under touch child presses fire once and seams reach 44pt or stay at rest", async () => {
    const app = await openToolbar("press", "touch");
    await app.waitFor("role:button[Undo]", { timeout: 15_000 });
    // Wait until each seam probe has reported a settled sample: undo's seam
    // must be live (enabled under touch) and laid out; bold's may read the
    // resting default (a control without the seam) — a resting report with
    // zero bounds is already settled, a live one needs its layout first.
    await app.waitUntil(
      () => {
        const undo = lastEnv(app, "undo");
        const bold = lastEnv(app, "bold");

        return (
          undo !== undefined &&
          undo.enabled &&
          undo.bounds.height > 0 &&
          bold !== undefined &&
          (!bold.enabled || bold.bounds.height > 0)
        );
      },
      { timeout: 15_000 },
    );

    await app.press("role:button[Undo]");
    expect(callsOf(app, "onPress")).toEqual([["undo"]]);

    await app.press("role:button[Bold]");
    expect(callsOf(app, "onSelectionChange")).toEqual([[["bold"]]]);

    // Both children must honour the seam contract: an enabled seam reaches
    // the 44pt touch minimum once its invisible slop is counted, a resting
    // one claims no expansion.
    const undo = lastEnv(app, "undo");
    const bold = lastEnv(app, "bold");

    expect(undo).toBeDefined();
    expect(seamReachesTouchTarget(undo as CtxEnv)).toBe(true);
    expect(bold).toBeDefined();
    expect(seamReachesTouchTarget(bold as CtxEnv)).toBe(true);

    expect(app.enabled("role:button[Disabled]")).toBe(false);
    await expect(app.press("role:button[Disabled]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(app, "onPress")).toEqual([["undo"]]);
  }, 120_000);

  // adapt-sheets/toolbar.md M-005 (A-002): overflow acceptance under
  // `input="touch", width="compact"` — the `w-fit` grid keeps writing order
  // on the main axis with 8pt gaps and no padding; the attached variant
  // keeps its 4pt inset. (Viewport-relative overflow itself is a registered
  // host gap — sheet §6 — so the assertions pin the layout invariants.)
  test("M-005 under touch and compact width the overflow layout keeps order, 8pt gaps and w-fit", async () => {
    const app = await openToolbar("wide", "touch-compact");
    await firstFrame(app, ...WIDE_NAMES);

    const root = lastFrame(app, "wide-root");
    const kids = [0, 1, 2, 3, 4, 5, 6].map((index) => lastFrame(app, `wide-${index}`));

    // One row: every child shares the first child's y, and the first sits at
    // the content origin (no padding on the plain variant).
    for (const kid of kids) {
      expect(Math.abs(kid.y - kids[0].y)).toBeLessThan(0.6);
    }
    expect(Math.abs(kids[0].x)).toBeLessThan(0.6);

    // Writing order on the main axis: each step is the previous child's
    // width plus the 8pt `gap-2`.
    for (let index = 1; index < kids.length; index += 1) {
      const prev = kids[index - 1];
      const cur = kids[index];

      expect(cur.x).toBeGreaterThan(prev.x);
      expect(Math.abs(cur.x - prev.x - (prev.width + 8))).toBeLessThan(0.6);
    }

    // `w-fit`: the root is exactly the children plus the (n-1) gaps wide.
    const expectedWidth =
      kids.reduce((total, kid) => total + kid.width, 0) + 8 * (kids.length - 1);
    expect(Math.abs(root.width - expectedWidth)).toBeLessThan(1);

    // `isAttached`: the single child sits 4pt inside the root on every side
    // (`p-1`), so the root is 8pt larger than the child both ways.
    const att = await openToolbar("attached", "touch-compact");
    await firstFrame(att, "att-root", "att-0");

    const attRoot = lastFrame(att, "att-root");
    const attChild = lastFrame(att, "att-0");

    expect(Math.abs(attChild.x - 4)).toBeLessThan(0.6);
    expect(Math.abs(attChild.y - 4)).toBeLessThan(0.6);
    expect(Math.abs(attRoot.height - attChild.height - 8)).toBeLessThan(0.6);
    expect(Math.abs(attRoot.width - attChild.width - 8)).toBeLessThan(0.6);
  }, 120_000);

  // adapt-sheets/toolbar.md M-006 (A-002): the variant table carries no
  // `input`/`density` axis — the same scenario lays out byte-identical
  // bounds under pointer and touch, and the vertical axis keeps its own
  // geometry (rows stacked with 8pt gaps, children aligned at the leading
  // edge) in both environments.
  test("M-006 layout bounds are identical under pointer and touch; vertical keeps its geometry", async () => {
    const pointer = await openToolbar("wide");
    await firstFrame(pointer, ...WIDE_NAMES);

    const touch = await openToolbar("wide", "touch");
    await firstFrame(touch, ...WIDE_NAMES);

    for (const name of WIDE_NAMES) {
      const a = lastFrame(pointer, name);
      const b = lastFrame(touch, name);

      expect(Math.abs(a.x - b.x)).toBeLessThan(0.01);
      expect(Math.abs(a.y - b.y)).toBeLessThan(0.01);
      expect(Math.abs(a.width - b.width)).toBeLessThan(0.01);
      expect(Math.abs(a.height - b.height)).toBeLessThan(0.01);
    }

    for (const scope of [undefined, "touch"] as const) {
      const app = await openToolbar("vertical", scope);
      await firstFrame(app, "v-0", "v-1", "v-2");

      const first = lastFrame(app, "v-0");
      const second = lastFrame(app, "v-1");
      const third = lastFrame(app, "v-2");

      // `grid-flow-row` + `gap-2`: each next item drops one height plus 8pt.
      expect(Math.abs(second.y - first.y - (first.height + 8))).toBeLessThan(0.6);
      expect(Math.abs(third.y - second.y - (second.height + 8))).toBeLessThan(0.6);

      // `items-start`: the different-width children align at the leading x.
      expect(Math.abs(second.x - first.x)).toBeLessThan(0.6);
      expect(Math.abs(third.x - first.x)).toBeLessThan(0.6);
    }
  }, 120_000);

  // adapt-sheets/toolbar.md M-007 (A-004): the context channels carry no
  // environment read — under both environments the outer toolbar keeps its
  // `toolbar` role, the nested toolbar renders as `group`, the outer
  // horizontal group stays a row and the inner vertical group stays a
  // column. (Arrow-key walking over the shared registry is covered by the
  // existing keyboard assertions — sheet M-007.)
  test("M-007 under both environments roles hold and nested groups inherit the toolbar axis", async () => {
    for (const scope of [undefined, "touch"] as const) {
      const app = await openToolbar("nested", scope);
      await app.waitFor("role:toolbar[Editor]", { timeout: 15_000 });
      await firstFrame(app, "n-outer-0", "n-outer-1", "n-inner-0", "n-inner-1");

      expect(app.shows("role:toolbar[Editor]")).toBe(true);
      expect(app.shows("role:group[Tools]")).toBe(true);

      // Outer horizontal group: members share one row, second to the right.
      const outerFirst = lastFrame(app, "n-outer-0");
      const outerSecond = lastFrame(app, "n-outer-1");
      expect(Math.abs(outerSecond.y - outerFirst.y)).toBeLessThan(0.6);
      expect(outerSecond.x).toBeGreaterThan(outerFirst.x);

      // Inner vertical group: members share one column, second below.
      const innerFirst = lastFrame(app, "n-inner-0");
      const innerSecond = lastFrame(app, "n-inner-1");
      expect(Math.abs(innerSecond.x - innerFirst.x)).toBeLessThan(0.6);
      expect(innerSecond.y).toBeGreaterThan(innerFirst.y);
    }
  }, 120_000);

  // adapt-sheets/toolbar.md M-008 (baseline): desktop zero-drift sampling —
  // the labelled toolbar and its controls show under the default mount, the
  // `aria-label` resolves through `role:toolbar[name]`, and the attached
  // variant keeps the 4pt `p-1` inset the existing tests pin.
  test("M-008 desktop baseline: labelled toolbar shows and attached keeps its 4pt inset", async () => {
    const app = await openToolbar("press");
    await app.waitFor("role:toolbar[Text formatting]", { timeout: 15_000 });

    expect(app.shows("role:toolbar[Text formatting]")).toBe(true);
    expect(app.shows("role:button[Undo]")).toBe(true);
    expect(app.shows("role:button[Redo]")).toBe(true);
    expect(app.shows("role:button[Bold]")).toBe(true);
    expect(app.shows("role:button[Disabled]")).toBe(true);

    const att = await openToolbar("attached");
    await att.waitFor("role:toolbar[Attached toolbar]", { timeout: 15_000 });
    await firstFrame(att, "att-root", "att-0");

    expect(att.shows("role:toolbar[Attached toolbar]")).toBe(true);

    const attRoot = lastFrame(att, "att-root");
    const attChild = lastFrame(att, "att-0");

    expect(Math.abs(attChild.x - 4)).toBeLessThan(0.6);
    expect(Math.abs(attChild.y - 4)).toBeLessThan(0.6);
    expect(Math.abs(attRoot.height - attChild.height - 8)).toBeLessThan(0.6);
    expect(Math.abs(attRoot.width - attChild.width - 8)).toBeLessThan(0.6);
  }, 120_000);
});
