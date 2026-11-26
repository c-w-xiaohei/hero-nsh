import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target half of the autocomplete mobile unit: the rows that need
 * `app.hover` (desktop/web-only — ios/android reject it). See
 * autocomplete.mobile.test.tsx for the shared halves and the fixture
 * contract; `platform:"web"` keeps the original windows-pin baseline shape
 * while `input:"pointer"` + `width:"regular"` inject the desktop-parity
 * environment the same way the shared file does.
 */

type Params = Record<string, string>;

function openMobile(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../autocomplete.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    clock: {},
    host: {
      params: {
        case: caseName,
        input: "pointer",
        width: "regular",
        ...params,
      },
    },
  });
}

type Edges = { top: number; right: number; bottom: number; left: number };

type CtxState = {
  pressed: number;
  scale: number;
  seamPressed: boolean;
  hitSlop: Edges | null;
  origin: { x: number; y: number } | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

function states(app: App): CtxState[] {
  return callsOf(app, "ctx-state").map((c) => c[0] as CtxState);
}

const CLEAR = "label:Clear selection";
const TRIGGER = "id:ac-trigger";
const SEARCH = "label:Search animals";

describe("autocomplete mobile (web)", () => {
  // adapt-sheets/autocomplete.md M-002 (A-001): R-043's `hover:` class lives
  // in the `input: "pointer"` cell now — under touch neither a hover nor a
  // completed press leaves the `default-hover` fill on the clear button
  // (web's sticky hover is the registered hazard), while under pointer the
  // same hover paints it. `viewStyle` reads the resolved background; the
  // class itself is unobservable.
  test("M-002 clear button hover fill is pointer-only", async () => {
    const touch = await openMobile("m", { input: "touch" });
    const base = touch.viewStyle(CLEAR)?.backgroundColor;

    await touch.hover(CLEAR);
    await touch.wait(100);
    expect(touch.viewStyle(CLEAR)?.backgroundColor).toBe(base);

    await touch.press(CLEAR);
    await touch.waitUntil(() => callsOf(touch, "clear").length === 1);
    expect(touch.viewStyle(CLEAR)?.backgroundColor).toBe(base);

    const pointer = await openMobile("m");
    const pointerBase = pointer.viewStyle(CLEAR)?.backgroundColor;
    await pointer.hover(CLEAR);
    await pointer.wait(100);
    const pointerHover = pointer.viewStyle(CLEAR)?.backgroundColor;
    expect(pointerHover).toBeDefined();
    expect(pointerHover).not.toBe(pointerBase);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-004 (A-002): under touch neither a hover
  // nor a press raises `isHovered` — the render-prop marker stays "idle" and
  // `onHoverChange` / `onHoverStart` / `onHoverEnd` record nothing (the
  // sticky-hover double safety: the JS signal never sets, so the R-006 /
  // R-011 fills it feeds never paint). The host `onMouseEnter` /
  // `onMouseLeave` callbacks still forward on both environments; under
  // pointer the hover round-trips exactly as on desktop.
  test("M-004 touch suppresses trigger hover; pointer keeps it", async () => {
    const touch = await openMobile("m", { input: "touch" });

    await touch.hover(TRIGGER);
    await touch.wait(100);
    expect(touch.shows("text:trigger-hover")).toBe(false);
    expect(callsOf(touch, "events")).toContainEqual(["mouseEnter"]);

    await touch.press(TRIGGER);
    await touch.waitFor("role:option");
    expect(touch.shows("text:trigger-hover")).toBe(false);
    expect(callsOf(touch, "hover")).toHaveLength(0);
    expect(callsOf(touch, "openChange")).toEqual([[true]]);

    const pointer = await openMobile("m");
    await pointer.hover(TRIGGER);
    await pointer.waitUntil(() => callsOf(pointer, "hover").length > 0);
    expect(pointer.shows("text:trigger-hover")).toBe(true);

    await pointer.hover("id:ctx-sample");
    await pointer.waitUntil(() =>
      callsOf(pointer, "hover").some((c) => (c[0] as { kind: string }).kind === "end"),
    );
    expect(pointer.shows("text:trigger-hover")).toBe(false);
    expect(callsOf(pointer, "events")).toContainEqual(["mouseEnter"]);
    expect(callsOf(pointer, "events")).toContainEqual(["mouseLeave"]);
    expect(
      callsOf(pointer, "hover").some((c) => (c[0] as { kind: string }).kind === "change"),
    ).toBe(true);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-018 (A-013, A-014): the fixture machinery
  // itself — `Scoped` + the `m-*` cases mount under every environment
  // combination, and every probe channel (`openChange` / `change` /
  // `inputChange` / `clear` / `events` / `hover` / `layout` / `ctx-*`)
  // records through `app.storage()` on both halves, so a silent fixture
  // regression cannot pass the other rows vacuously.
  test("M-018 fixture Scoped params, m-* cases and probes all record", async () => {
    for (const params of [
      {},
      { input: "touch", width: "compact" },
      { density: "compact" },
    ] as Params[]) {
      const app = await openMobile("m", params);

      // layout probes arrive at mount; open drives the rest of the chain.
      await app.waitUntil(() => callsOf(app, "layout").length > 0);
      expect(app.shows(TRIGGER)).toBe(true);

      await app.hover(TRIGGER);
      await app.press(CLEAR);
      await app.waitUntil(() => callsOf(app, "clear").length === 1);
      expect(callsOf(app, "change")).toEqual([[null]]);

      // The on-demand channel read runs while the overlay is closed: an
      // open modal carrier owns outside presses (web hit-testing lands the
      // press on the backdrop/sheet, headless resolves it to the view), so
      // pressing `ctx-sample` with the popover up would sample nothing.
      await app.press("id:ctx-sample");
      await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);

      await app.press(TRIGGER);
      await app.waitFor("role:option");
      expect(callsOf(app, "openChange")).toEqual([[true]]);
      expect(app.shows("role:option")).toBe(true);
      expect(app.count("id:ac-pop") + app.count("id:ac-pop-sheet")).toBe(1);

      await app.type(SEARCH, "ca");
      await app.waitUntil(() => callsOf(app, "inputChange").length > 0);

      // The pointer half records the hover channel; the touch half's is
      // silent by design (M-004), so only the record shape is pinned there.
      if (params.input !== "touch") {
        expect(callsOf(app, "hover").length).toBeGreaterThan(0);
        expect(callsOf(app, "events")).toContainEqual(["mouseEnter"]);
      }
      expect(callsOf(app, "ctx-env").length).toBeGreaterThan(0);
      expect(callsOf(app, "ctx-pressed").length).toBeGreaterThan(0);
      expect(states(app).length).toBeGreaterThan(0);
    }
  }, 120_000);
});
