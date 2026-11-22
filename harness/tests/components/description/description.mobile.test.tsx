import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the description adapt unit, one test per row of
 * adapt-sheets/description.md §4 (M-001…M-007). The fixture is
 * `harness/description.fixtures.tsx`: case "basic" mounts a default
 * Description, a caller-className one and a long sentence; case "ctx" mounts
 * a handwritten `DescriptionContext.Provider` whose `partClass` mirrors the
 * textfield's `invalid → "hidden"`.
 *
 * `host.params.scope` picks the `EnvironmentScope` wrapper — "" is the
 * host-derived desktop environment (pointer + default density), the baseline
 * every comparison reads. `platform:"windows"` at 1024×768 pins the pointer
 * host both targets share (the sheet convention), so the whole file runs on
 * headless and web unchanged. The observation channel is what `nsh/test`
 * sees: `shows`/`texts`, `spanStyle` for the resolved typography, `onLayout`
 * bounds records, and `app.storage()` probe calls.
 */

type Box = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

// Resolved on the harness theme (theme/hero-nsh.theme.json): `muted` is
// oklch(0.5517 0.0138 285.94) → #71717aff, the same token Card's T-sheet
// reads for its description part.
const MUTED = "#71717aff";

function openFixture(params: Record<string, string>): Promise<App> {
  return open("../../../description.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    host: { params },
  });
}

function boxes(app: App): Box[] {
  return callsOf(app, "layout").map((args) => args[0] as Box);
}

/** Waits until every probed box has reported at least once. */
async function settleLayout(app: App, names: string[]): Promise<void> {
  await app.waitUntil(() =>
    names.every((name) => boxes(app).some((box) => box.name === name)),
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

type Span = { fontSize: number; fontWeight: number; color: string };

/** The resolved typography of one description text — what the variant base paints. */
function spanOf(app: App, selector: string): Span {
  const style = app.spanStyle(selector);
  return {
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.color,
  };
}

const BASIC_BOXES = ["basic", "custom", "long"];

describe("description mobile", () => {
  // adapt-sheets/description.md M-001 (baseline): the default environment is
  // the desktop-parity surface — the description paints its upstream
  // `text-xs text-muted` exactly: 12pt in the theme's muted color.
  test("M-001 default environment: description renders text-xs text-muted", async () => {
    const app = await openFixture({ case: "basic" });

    expect(app.shows("id:desc-basic")).toBe(true);
    expect(app.texts()).toContain("Save changes");

    const span = app.spanStyle("id:desc-basic >> text:Save changes");
    expect(span.fontSize).toBe(12);
    expect(span.color).toBe(MUTED);
  });

  // adapt-sheets/description.md M-002 (baseline): `className` lands after the
  // variant classes so the caller's `font-semibold`/`text-accent` win, and
  // `text-wrap` wraps the long sentence into a taller box than the one-line
  // default. The removed `wrap-break-word` (R-003) is not asserted — a long
  // unbroken token overflows, a port-sheet-recorded difference.
  test("M-002 default environment: caller className wins, text-wrap wraps", async () => {
    const app = await openFixture({ case: "basic" });
    await settleLayout(app, BASIC_BOXES);

    const custom = app.spanStyle("id:desc-custom >> text:Custom tone");
    expect(custom.fontWeight).toBe(600);
    expect(custom.color).not.toBe(MUTED);

    const height = (name: string) =>
      Math.max(...boxes(app).filter((b) => b.name === name).map((b) => b.height));
    expect(height("long")).toBeGreaterThan(height("basic"));
  });

  // adapt-sheets/description.md M-003 (A-001, A-002): `input="touch"` changes
  // nothing — the component table took no `input` axis, so every
  // description's resolved typography and every laid-out box equal the
  // pointer environment's. (`focusable ?? false` stays untouched too; there
  // is no focus query to read it by.)
  test("M-003 injected touch: typography and bounds equal the pointer baseline", async () => {
    const touch = await openFixture({ case: "basic", scope: "touch" });
    const pointer = await openFixture({ case: "basic" });
    await settleLayout(touch, BASIC_BOXES);
    await settleLayout(pointer, BASIC_BOXES);

    for (const selector of [
      "id:desc-basic >> text:Save changes",
      "id:desc-custom >> text:Custom tone",
      "id:desc-long >> text:A",
    ]) {
      expect(spanOf(touch, selector)).toEqual(spanOf(pointer, selector));
    }
    expect(boxSet(touch)).toEqual(boxSet(pointer));
  });

  // adapt-sheets/description.md M-004 (A-001): `density="compact"` changes
  // nothing — the table took no `density` axis either, so the compact preset
  // produces no class or bounds difference; combining it with touch (the
  // sheet's alternate form) matches too.
  test("M-004 density compact: typography and bounds equal the default preset", async () => {
    const compact = await openFixture({ case: "basic", scope: "density" });
    const both = await openFixture({ case: "basic", scope: "touch,density" });
    const plain = await openFixture({ case: "basic" });
    await settleLayout(compact, BASIC_BOXES);
    await settleLayout(both, BASIC_BOXES);
    await settleLayout(plain, BASIC_BOXES);

    expect(spanOf(compact, "id:desc-basic >> text:Save changes")).toEqual(
      spanOf(plain, "id:desc-basic >> text:Save changes"),
    );
    expect(boxSet(compact)).toEqual(boxSet(plain));
    expect(boxSet(both)).toEqual(boxSet(plain));
  });

  // adapt-sheets/description.md M-005 (A-003): the context's two channels are
  // environment-constant — `registerDescription` reports the children string
  // exactly once at mount, and `partClass` toggling to `"hidden"` hides the
  // description and back. Run once in each environment.
  test("M-005 ctx case: registration reports once, invalid toggles hidden", async () => {
    for (const scope of ["", "touch"]) {
      const app = await openFixture({ case: "ctx", ...(scope ? { scope } : {}) });

      await app.waitUntil(() => callsOf(app, "register").length === 1);
      expect(callsOf(app, "register")).toEqual([["Registered description"]]);
      expect(app.shows("id:desc-ctx")).toBe(true);

      await app.press("id:toggle-invalid");
      await app.waitUntil(() => !app.shows("id:desc-ctx"));
      expect(app.shows("id:desc-ctx")).toBe(false);

      await app.press("id:toggle-invalid");
      await app.waitUntil(() => app.shows("id:desc-ctx"));
      expect(app.shows("id:desc-ctx")).toBe(true);
    }
  });

  // adapt-sheets/description.md M-006 (A-004): the description owns no press
  // path — `app.press` finds nothing pressable at the text (the rejection
  // pattern disclosure-group's negative rows already use), no probe call
  // beyond the mount-time layout records lands, and the text stays shown.
  test("M-006 injected touch: no pressable target on the description", async () => {
    const app = await openFixture({ case: "basic", scope: "touch" });
    await settleLayout(app, BASIC_BOXES);

    await expect(app.press("id:desc-basic")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    // The only probe channel in this case is `layout`; nothing else may fire.
    expect(calls(app).every((call) => call.name === "layout")).toBe(true);
    expect(app.shows("id:desc-basic")).toBe(true);
  });

  // adapt-sheets/description.md M-007 (A-006, A-007): the fixture itself —
  // `case` dispatches both shapes, `scope` drives the wrapper so "touch"
  // resolves `input=touch` inside it while "" leaves the host default.
  test("M-007 fixture: case dispatch works and scope drives EnvironmentScope", async () => {
    const touch = await openFixture({ case: "basic", scope: "touch" });
    expect(touch.texts()).toContain("input=touch");

    const plain = await openFixture({ case: "basic" });
    expect(plain.texts()).toContain("input=pointer");

    const ctx = await openFixture({ case: "ctx" });
    expect(ctx.shows("id:desc-ctx")).toBe(true);
  });
});
