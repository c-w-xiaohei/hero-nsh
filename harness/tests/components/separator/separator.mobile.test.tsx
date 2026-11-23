import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the separator adapt unit, one test per row of
 * adapt-sheets/separator.md §4 (M-001…M-007). Every 落点 in the sheet is
 * 保留: the hairline contract (`h-px`/`w-px`, `min-h-2`, `self-stretch`,
 * the three `bg-separator*` tokens) is not a density spacing and not a
 * touch target, so no `input`/`density` cell exists and nothing may move
 * under an injected environment.
 *
 * The fixture is `harness/separator.fixtures.tsx`: `host.params.case`
 * picks the tree (default/vertical/variants/decorative/context, or `all`
 * for the two-environment comparisons, which mount every tree at once so
 * they cost two opens, not ten) and
 * `host.params.input`/`host.params.density` feed `EnvironmentScope`.
 * The axes are always explicit — `input:"pointer"` is the desktop-parity
 * baseline every comparison measures against and `input:"touch"` the
 * injected mobile half — because the host-derived default differs per
 * target (touch on ios/android, pointer on desktop and web). No
 * `platform`/`width` open options: native targets fill the device screen
 * and reject them. The observation channel is what `nsh/test` sees: `shows`/
 * `count` for the mount contract and `onLayout` bounds probes for the
 * geometry; class names are not observable, so the assertions pin the
 * resolved boxes.
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
  return open("../../../separator.fixtures.tsx", {
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

/** name → sorted unique bounds; onLayout can fire more than once. */
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

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(
    () => names.every((name) => boxes(app).some((box) => box.name === name)),
    { timeout: 15000 },
  );
}

/** Everything an environment comparison reads, taken before `app.dispose()`. */
function snapshot(app: App, ids: string[]) {
  return {
    mounts: ids.map((id) => ({
      id,
      shows: app.shows(`id:${id}`),
      count: app.count(`id:${id}`),
    })),
    boxes: boxSet(app),
  };
}

function lastBox(app: App, name: string): Box {
  const found = boxes(app).filter((box) => box.name === name).at(-1);
  if (!found) throw new Error(`no layout call recorded for ${name}`);
  return found;
}

const CASE_BOXES: Record<string, string[]> = {
  default: ["separator"],
  vertical: ["separator"],
  variants: ["separator-default", "separator-secondary", "separator-tertiary"],
  decorative: ["divider-horizontal", "divider-vertical", "divider-aria"],
  context: ["sep-inherit", "sep-prop"],
};

/** Every probed box across the five cases — the `all` fixture's set. */
const ALL_BOXES = Object.values(CASE_BOXES).flat();

/* testID → expected mount count in the `all` tree: `separator` is the one
 * name the default and vertical trees share, so it counts 2. */
const ALL_MOUNTS: Record<string, number> = {
  separator: 2,
  "separator-default": 1,
  "separator-secondary": 1,
  "separator-tertiary": 1,
  "divider-horizontal": 1,
  "divider-vertical": 1,
  "divider-aria": 1,
  "sep-inherit": 1,
  "sep-prop": 1,
};

const ALL_IDS = Object.keys(ALL_MOUNTS);

describe("separator mobile", () => {
  // adapt-sheets/separator.md M-001 (基线, A-001…A-003): default pinned
  // environment — the horizontal hairline mounts, 1 point tall and the
  // full 300-point container width (`h-px w-full`), and all three variant
  // colors are on screen — the pre-port rendering contract, unchanged.
  test("M-001 default environment: horizontal hairline is 1pt × full width, all variants show", async () => {
    const app = await openMobile("default", { input: "pointer" });
    await settleLayout(app, ["separator"]);

    expect(app.shows("id:separator")).toBe(true);
    expect(app.count("id:separator")).toBe(1);
    const divider = lastBox(app, "separator");
    expect(divider.height).toBe(1);
    expect(divider.width).toBe(300);

    const variants = await openMobile("variants", { input: "pointer" });
    await settleLayout(variants, CASE_BOXES.variants);
    for (const id of ["separator-default", "separator-secondary", "separator-tertiary"]) {
      expect(variants.shows(`id:${id}`)).toBe(true);
      const box = lastBox(variants, id);
      expect(box.height).toBe(1);
      expect(box.width).toBe(300);
    }
  });

  // adapt-sheets/separator.md M-002 (基线, A-002): default environment —
  // the vertical divider is 1 point wide and stretched to the 20-point row
  // (`w-px self-stretch`, `min-h-2` respected); the decorative tree keeps
  // all three dividers mounted and testID-addressable — `isDecorative` /
  // `aria-hidden` touch only accessibility flags, never the view.
  test("M-002 default environment: vertical geometry and decorative dividers stay mounted", async () => {
    const app = await openMobile("vertical", { input: "pointer" });
    await settleLayout(app, ["separator"]);

    const divider = lastBox(app, "separator");
    expect(divider.width).toBe(1);
    expect(divider.height).toBe(20);
    expect(divider.height).toBeGreaterThanOrEqual(8);

    const decorative = await openMobile("decorative", { input: "pointer" });
    await settleLayout(decorative, CASE_BOXES.decorative);
    for (const id of ["divider-horizontal", "divider-vertical", "divider-aria"]) {
      expect(decorative.shows(`id:${id}`)).toBe(true);
      expect(decorative.count(`id:${id}`)).toBe(1);
    }
    expect(lastBox(decorative, "divider-horizontal").height).toBe(1);
    const vertical = lastBox(decorative, "divider-vertical");
    expect(vertical.width).toBe(1);
    expect(vertical.height).toBe(20);
  });

  // adapt-sheets/separator.md M-003 (基线, A-004): default environment —
  // the container's `SeparatorContext` axis wins over the built-in
  // horizontal default (inherit → `w-px` vertical, `h-1/2` of the 40pt
  // row), and an explicit `orientation` prop wins over the context
  // (prop → `w-1/2` of the 300pt row): the
  // `prop ?? context ?? "horizontal"` fallback chain is untouched.
  test("M-003 default environment: context feeds orientation and partClass, prop wins", async () => {
    const app = await openMobile("context", { input: "pointer" });
    await settleLayout(app, CASE_BOXES.context);

    const inherit = lastBox(app, "sep-inherit");
    expect(inherit.width).toBe(1);
    expect(inherit.height).toBe(20);

    const prop = lastBox(app, "sep-prop");
    expect(prop.width).toBe(150);
    expect(prop.height).toBe(1);
  });

  // adapt-sheets/separator.md M-004 (A-001…A-004): injected `input="touch"`
  // — every case tree's `shows`/`count`/bounds is identical to the pointer
  // environment's, because the styles table holds no `input` cell: the
  // hairline is never enlarged into a touch target (its hit area belongs
  // to the surrounding container, and components never carry hitSlop).
  test("M-004 injected touch: every case's mounts and bounds equal the pointer baseline", async () => {
    // The `all` fixture mounts the five case trees at once, so the comparison
    // costs two opens, not ten — and each app is disposed before the next
    // opens, because `open` keeps every app of the test alive until the test
    // ends and live web hosts starve the runner.
    const touch = await openMobile("all", { input: "touch" });
    await settleLayout(touch, ALL_BOXES);
    const touchSnap = snapshot(touch, ALL_IDS);
    touch.dispose();

    const pointer = await openMobile("all", { input: "pointer" });
    await settleLayout(pointer, ALL_BOXES);
    const pointerSnap = snapshot(pointer, ALL_IDS);
    pointer.dispose();

    expect(touchSnap.mounts).toEqual(pointerSnap.mounts);
    for (const [id, count] of Object.entries(ALL_MOUNTS)) {
      const mount = touchSnap.mounts.find((entry) => entry.id === id);
      expect(mount?.shows).toBe(true);
      expect(mount?.count).toBe(count);
    }
    // Both `separator` trees reported a box under the shared probe name.
    expect(touchSnap.boxes.separator).toHaveLength(2);
    expect(touchSnap.boxes).toEqual(pointerSnap.boxes);
  }, 120_000);

  // adapt-sheets/separator.md M-005 (A-001, A-002): injected
  // `density="compact"` (with `input="touch"` alongside) — every box equals
  // the default environment's, because the table holds no `density` cell
  // either: `h-px`/`w-px` are already at the display floor and
  // `min-h-2`/`self-stretch` are the vertical line's shape contract, not
  // spacing that density presets may tighten.
  test("M-005 injected compact density + touch: no box moves", async () => {
    const compact = await openMobile("all", { input: "touch", density: "compact" });
    await settleLayout(compact, ALL_BOXES);
    const compactSnap = snapshot(compact, ALL_IDS);
    compact.dispose();

    const baseline = await openMobile("all", { input: "pointer" });
    await settleLayout(baseline, ALL_BOXES);
    const baselineSnap = snapshot(baseline, ALL_IDS);
    baseline.dispose();

    expect(compactSnap.mounts).toEqual(baselineSnap.mounts);
    expect(compactSnap.boxes).toEqual(baselineSnap.boxes);
  }, 120_000);

  // adapt-sheets/separator.md M-006 (A-005): injected touch — the divider
  // has no press path: `app.press` resolves no pressable view on it and
  // rejects `ERR_NSH_TEST_NOT_FOUND`, so nothing can ever record.
  test("M-006 injected touch: the divider has no press path", async () => {
    const app = await openMobile("default", { input: "touch" });
    await settleLayout(app, ["separator"]);

    await expect(app.press("id:separator")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });
  });

  // adapt-sheets/separator.md M-007 (A-006, A-007): the scope wiring is in
  // force — the fixture's `createInput()` probe inside `Scoped` resolves
  // the injected value, so an `input:"pointer"` param reports "pointer"
  // (the M-001…M-003 baseline) and `input:"touch"` reports "touch" (the
  // injected half) on whichever host the file runs on.
  test("M-007 scope: pointer injection resolves pointer, touch injection resolves touch", async () => {
    const pointer = await openMobile("default", { input: "pointer" });
    await pointer.waitUntil(() => callsOf(pointer, "env").length >= 1);
    expect(callsOf(pointer, "env").at(-1)?.[0]).toMatchObject({ input: "pointer" });

    const touch = await openMobile("default", { input: "touch" });
    await touch.waitUntil(() => callsOf(touch, "env").length >= 1);
    expect(callsOf(touch, "env").at(-1)?.[0]).toMatchObject({ input: "touch" });
  });
});
