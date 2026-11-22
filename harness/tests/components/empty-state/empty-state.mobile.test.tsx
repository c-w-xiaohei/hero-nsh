import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the empty-state adapt unit, one test per row of
 * adapt-sheets/empty-state.md §4 (M-001…M-008). The fixture is
 * `harness/empty-state.fixtures.tsx`: "inherited" (default text under a
 * text-lg parent), "aria-label" (aria name wins), "press" (caller `onPress`
 * probe plus a caller-composed `Button` child) and "layout" (a fixed-size
 * child whose bounds against the root read the four padding sides) all mount
 * under `EnvironmentScope`, fed by `host.params.input` /
 * `host.params.density`. Absent params keep the host-derived environment —
 * pointer + default density on headless and web — the desktop-parity
 * baseline every injected-environment assertion compares against.
 *
 * `platform:"windows"` is the pointer host both targets share (the
 * breadcrumbs.mobile.test.tsx convention). The observation channel is what
 * `nsh/test` sees: `shows` / `texts` / `spanStyle` / `viewStyle` / `enabled`,
 * `app.storage()` probe calls (`onPress`, `layout` boxes), `app.press` for
 * the pass-through half. `accessibilityState` and `focusable` have no
 * nsh/test query (common rules), so the pressed-state and focusable halves
 * of M-002 / M-005 ride on their observable proxies — `viewStyle` before and
 * after the press, and identical `enabled` / `spanStyle` / boxes / probe
 * records across environments.
 */

// Resolved on the harness theme (theme/hero-nsh.theme.json), the same value
// empty-state.heroui.test.tsx pins for light muted:
// oklch(0.5517 0.0138 285.94) #71717aff.
const MUTED_LIGHT = "#71717aff";

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
  return open("../../../empty-state.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
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

/**
 * name → sorted unique bounds. onLayout can fire more than once per view;
 * comparing the set of distinct boxes keeps repeat firings honest without
 * depending on how many frames the layout took (breadcrumbs convention).
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

/** The last reported box per probe name. */
function latestBoxes(app: App): Record<string, Box> {
  const out: Record<string, Box> = {};
  for (const box of boxes(app)) {
    out[box.name] = box;
  }
  return out;
}

/**
 * The layout case's four padding sides in points. `onLayout` bounds are
 * parent-relative: the `size-10` child's x/y are the root's left/top
 * paddings directly, and the right/bottom paddings are what the root's own
 * box keeps past the child's — a box-to-box subtraction inside the root's
 * coordinate space, not the screen's.
 */
function paddings(app: App): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const { root, content } = latestBoxes(app);

  return {
    left: Math.round(content.x),
    top: Math.round(content.y),
    right: Math.round(root.width - content.x - content.width),
    bottom: Math.round(root.height - content.y - content.height),
  };
}

describe("empty-state mobile", () => {
  // adapt-sheets/empty-state.md M-001 (A-001, baseline): default environment —
  // the default text keeps the block's own text-sm (14) under a text-lg
  // ancestor that lifts the plain sibling to 18, in the muted color; the
  // layout case's root padding is the default density cell's p-2 = 8pt on
  // all four sides.
  test("M-001 default environment: inherited text keeps text-sm over text-lg, root padding is 8pt", async () => {
    const inherited = await openMobile("inherited");

    expect(inherited.shows("text:No results found")).toBe(true);
    expect(inherited.spanStyle("text:plain").fontSize).toBe(18);
    expect(inherited.spanStyle("text:No results found").fontSize).toBe(14);
    expect(inherited.spanStyle("text:No results found").color).toBe(MUTED_LIGHT);

    const layout = await openMobile("layout");
    await settleLayout(layout, ["root", "content"]);

    expect(paddings(layout)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  // adapt-sheets/empty-state.md M-002 (A-004, A-005, baseline): default
  // environment — the aria name still wins over accessibilityLabel; a press
  // at the press case's center records the caller's `onPress` exactly once
  // with no component-added pressed state (viewStyle unchanged — the
  // accessibilityState half has no nsh/test query); every case is an inline
  // render, so the on-screen text set holds the case's own copy and nothing
  // an overlay would add.
  test("M-002 default environment: aria name wins, root press records once, cases render inline", async () => {
    const aria = await openMobile("aria-label");

    expect(aria.shows("label:No search results")).toBe(true);
    expect(aria.shows("label:Fallback name")).toBe(false);
    expect(aria.shows("text:Nothing here")).toBe(true);
    expect(aria.texts()).toEqual(["Nothing here"]);

    const press = await openMobile("press");
    const before = press.viewStyle("id:press-root");

    await press.press("id:press-root");

    expect(callsOf(press, "onPress")).toHaveLength(1);
    const after = press.viewStyle("id:press-root");
    expect(after?.opacity).toBe(before?.opacity);
    expect(after?.effectiveOpacity).toBe(before?.effectiveOpacity);

    // The caller-composed Button sits absolute top-right; the root's center
    // stays the text, so the inline copy set is exactly these two strings.
    expect(press.texts().slice().sort()).toEqual(["Action", "No results found"]);

    const layout = await openMobile("layout");

    expect(layout.texts()).toEqual([]);
  });

  // adapt-sheets/empty-state.md M-003 (A-001): `density="compact"` tightens
  // the root padding one step (8pt → 6pt, still > 0) and nothing else — the
  // inherited case's copy, size and color are the default cell's.
  test("M-003 compact density tightens root padding one step; typography untouched", async () => {
    const compact = await openMobile("layout", { density: "compact" });
    await settleLayout(compact, ["root", "content"]);

    const pad = paddings(compact);
    for (const side of Object.values(pad)) {
      expect(side).toBe(6);
      expect(side).toBeGreaterThan(0);
    }

    const inherited = await openMobile("inherited", { density: "compact" });

    expect(inherited.shows("text:No results found")).toBe(true);
    expect(inherited.spanStyle("text:No results found").fontSize).toBe(14);
    expect(inherited.spanStyle("text:No results found").color).toBe(MUTED_LIGHT);
  });

  // adapt-sheets/empty-state.md M-004 (A-001): an explicit `density="default"`
  // scope resolves to the same boxes and paddings as no scope at all — the
  // default cell is the pre-axis p-2 verbatim.
  test("M-004 explicit default density lays out identical to no scope", async () => {
    const plain = await openMobile("layout");
    const explicit = await openMobile("layout", { density: "default" });

    await settleLayout(plain, ["root", "content"]);
    await settleLayout(explicit, ["root", "content"]);

    expect(boxSet(explicit)).toEqual(boxSet(plain));
    expect(paddings(explicit)).toEqual(paddings(plain));
    expect(paddings(explicit)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  // adapt-sheets/empty-state.md M-005 (A-003, baseline): `input="touch"`
  // with density untouched moves nothing the test can see — the component
  // has no input axis (sheet A-003), so texts, span styles, layout boxes,
  // press records and view styles equal the pointer environment's. The
  // `focusable=false` shape has no query; it is the same code path in both
  // environments (`local.focusable ?? false`, env-free).
  test("M-005 injected touch without density changes no observable", async () => {
    const touchInherited = await openMobile("inherited", { input: "touch" });
    const plainInherited = await openMobile("inherited");

    expect(touchInherited.texts()).toEqual(plainInherited.texts());
    expect(touchInherited.shows("text:No results found")).toBe(true);
    expect(touchInherited.spanStyle("text:No results found")).toEqual(
      plainInherited.spanStyle("text:No results found"),
    );

    const touchLayout = await openMobile("layout", { input: "touch" });
    const plainLayout = await openMobile("layout");

    await settleLayout(touchLayout, ["root", "content"]);
    await settleLayout(plainLayout, ["root", "content"]);
    expect(boxSet(touchLayout)).toEqual(boxSet(plainLayout));

    const touchPress = await openMobile("press", { input: "touch" });
    const plainPress = await openMobile("press");

    await touchPress.press("id:press-root");
    await plainPress.press("id:press-root");

    expect(touchPress.texts()).toEqual(plainPress.texts());
    expect(callsOf(touchPress, "onPress")).toEqual(callsOf(plainPress, "onPress"));
    expect(touchPress.viewStyle("id:press-root")).toEqual(
      plainPress.viewStyle("id:press-root"),
    );
  });

  // adapt-sheets/empty-state.md M-006 (A-003, A-004): under injected touch
  // the press case still records only the caller's `onPress` — once — and
  // the probe channel shows no second name, so the component registered no
  // feedback or gesture path of its own; viewStyle is unmoved by the press.
  test("M-006 injected touch: press records the caller probe once and adds no path", async () => {
    const app = await openMobile("press", { input: "touch" });
    const before = app.viewStyle("id:press-root");

    await app.press("id:press-root");

    expect(callsOf(app, "onPress")).toHaveLength(1);
    expect(new Set(calls(app).map((call) => call.name))).toEqual(
      new Set(["layout", "onPress"]),
    );

    const after = app.viewStyle("id:press-root");
    expect(after?.opacity).toBe(before?.opacity);
    expect(after?.effectiveOpacity).toBe(before?.effectiveOpacity);
  });

  // adapt-sheets/empty-state.md M-007 (A-002): the press case's caller-
  // composed `Button` stays the caller's — under injected touch the root's
  // bounds and the rendered copy (default text + button label) equal the
  // pointer environment's, so action-child semantics do not flow back into
  // the container. The Button's own hit/feedback assertions belong to the
  // button unit.
  test("M-007 injected touch: embedded Button leaves root bounds and copy unchanged", async () => {
    const touch = await openMobile("press", { input: "touch" });
    const pointer = await openMobile("press");

    await settleLayout(touch, ["root"]);
    await settleLayout(pointer, ["root"]);

    expect(boxSet(touch)).toEqual(boxSet(pointer));
    expect(touch.texts().slice().sort()).toEqual(pointer.texts().slice().sort());
    expect(touch.shows("text:No results found")).toBe(true);
    expect(touch.shows("text:Action")).toBe(true);
  });

  // adapt-sheets/empty-state.md M-008 (A-006, A-007): every fixture case
  // dispatches on `host.params.case` — each opens to its own marker — and a
  // case opened without scope params behaves as the unwrapped baseline (the
  // layout case's padding is the default cell's 8pt, not compact's 6pt), so
  // `EnvironmentScope` wrapping is proven live rather than assumed.
  test("M-008 fixture cases dispatch on host.params.case; absent params are the baseline", async () => {
    const markers: Array<[string, string]> = [
      ["inherited", "text:No results found"],
      ["aria-label", "label:No search results"],
      ["press", "id:press-root"],
      ["layout", "id:layout-root"],
    ];

    for (const [name, marker] of markers) {
      const app = await openMobile(name);
      expect(app.shows(marker)).toBe(true);
    }

    const plain = await openMobile("layout");
    await settleLayout(plain, ["root", "content"]);
    expect(paddings(plain)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });
});
