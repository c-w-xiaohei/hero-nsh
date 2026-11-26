import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { focusTrail, panelText, selectionCalls } from "../../testers/tabs";

/*
 * Web-target halves of the tabs mobile rows that need a pointer host step
 * (adapt-sheets/tabs.md §4): M-003's chevron `hover:opacity-70` read and
 * M-004's hover suppression / roundtrip (`app.hover` is desktop/web only —
 * a phone has no mouse), plus M-010's `platform:"web"` keyboard-activation
 * halves (the one host that moves view focus; a `platform` pin is illegal
 * on native). The shared `tabs.mobile.test.tsx` keeps the rest.
 *
 * The fixture is `harness/tabs.fixtures.tsx`; `input`/`density` feed its
 * `EnvironmentScope`, exactly as on the shared file. Scroll position is
 * read through the same `measure-all` channel the shared file documents:
 * `offset = listcontainer.px + 4 − tab-t1.px`, a tab's viewport-x is
 * `tab.px − listcontainer.px + width/2`. The layout/press halves of M-003
 * are kept verbatim — only the host step is unavailable on native, not
 * the assertions.
 */

type Params = Record<string, string>;

type MeasureEntry = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  px: number;
  py: number;
};

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

function openTabs(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../tabs.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

function measures(app: App): MeasureEntry[] {
  return callsOf(app, "measure").map((c) => c[0] as MeasureEntry);
}

function layouts(app: App, name: string): LayoutEntry[] {
  return callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((l) => l.name === name);
}

function lastLayout(app: App, name: string): LayoutEntry {
  const list = layouts(app, name);
  return list[list.length - 1];
}

/** Presses `measure-all` and waits for its 12 async `measure()` reports. */
async function measureOnce(app: App): Promise<Map<string, MeasureEntry>> {
  const before = measures(app).length;
  await app.press("id:measure-all");
  await app.waitUntil(() => measures(app).length >= before + 12, { timeout: 10_000 });
  return new Map(measures(app).map((m) => [m.name, m]));
}

/** The strip's scroll offset in points (t1's content x is 4). */
function offsetOf(ms: Map<string, MeasureEntry>): number {
  return ms.get("listcontainer")!.px + 4 - ms.get("tab-t1")!.px;
}

/**
 * Polls `measure-all` until the offset stops moving — the scrollTo calls are
 * `animated: true`, so a fixed sleep races the animation on slow hosts.
 */
async function settledMeasure(app: App): Promise<Map<string, MeasureEntry>> {
  let offset = offsetOf(await measureOnce(app));
  for (let i = 0; i < 10; i++) {
    await app.wait(300);
    const ms = await measureOnce(app);
    const next = offsetOf(ms);
    if (Math.abs(next - offset) < 0.5) {
      return ms;
    }
    offset = next;
  }
  return measureOnce(app);
}

describe("tabs mobile (web)", () => {
  // adapt-sheets/tabs.md M-003 (A-001): injected touch lifts the tab's
  // visible hit minimum to 44 pt (`min-h-11` over `h-8`); the default
  // environment keeps `h-8` (32 pt). Tab heights are read from the
  // fixture's `layout` probe.
  //
  // The chevron half asserts what `nsh/test` can observe of the
  // `min-h-11 min-w-11` / `size-4` cells: both chevrons mount, page and
  // take input in each environment, and `hover:opacity-70` — moved into
  // the `input: "pointer"` cell by A-001/A-002 — resolves only under
  // pointer (`viewStyle().opacity` ≈ 0.7 hovered vs 1 under touch). The
  // 44×44 box itself has no read channel: `app.press` resolves the named
  // view and never reports same-container overlays as
  // `ERR_NSH_TEST_COVERED`, `hover`/`drag` deliver occlusion-blind, and no
  // `ref`/`onLayout` reaches `Tabs.ListContainer`'s internal chevron
  // views — registered in adapt sheet §6; the exact bounds degrade to
  // real-device acceptance, the same disposition `hitSlop` already
  // carries.
  test("M-003 touch lifts tabs to 44pt; chevrons keep the pointer-only hover style", async () => {
    // Pointer half: the 32 pt tab and the chevron's hover style.
    const pointer = await openTabs("mobile", { input: "pointer" });
    expect(lastLayout(pointer, "tab-t1").height).toBe(32);
    expect(lastLayout(pointer, "tab-t1").width).toBe(48);

    await pointer.press("id:tabs-scroll-next");
    await settledMeasure(pointer);
    expect(pointer.shows("id:tabs-scroll-prev")).toBe(true);
    expect(pointer.shows("id:tabs-scroll-next")).toBe(true);
    await pointer.hover("id:tabs-scroll-prev");
    await pointer.wait(300);
    const pointerOpacity = pointer.viewStyle("id:tabs-scroll-prev")?.opacity;
    expect(pointerOpacity).toBeGreaterThan(0.6);
    expect(pointerOpacity).toBeLessThan(0.8);

    // Touch half: the 44 pt minimum, chevrons mounted and pressable, and
    // no hover style under touch.
    const touch = await openTabs("mobile", { input: "touch" });
    expect(lastLayout(touch, "tab-t1").height).toBeGreaterThanOrEqual(44);
    expect(lastLayout(touch, "tab-t1").width).toBe(48);

    await touch.press("id:tabs-scroll-next");
    await settledMeasure(touch);
    expect(touch.shows("id:tabs-scroll-prev")).toBe(true);
    expect(touch.shows("id:tabs-scroll-next")).toBe(true);
    expect(touch.enabled("id:tabs-scroll-prev")).toBe(true);
    expect(touch.enabled("id:tabs-scroll-next")).toBe(true);
    await touch.hover("id:tabs-scroll-prev");
    await touch.wait(300);
    expect(touch.viewStyle("id:tabs-scroll-prev")?.opacity).toBe(1);
  }, 120_000);

  // adapt-sheets/tabs.md M-004 (A-002): injected touch suppresses the hover
  // dependency — `handleMouseEnter`/`Leave` neither write `hovered` nor
  // report `onHoverStart`/`End`/`Change`, the render-prop `isHovered` stays
  // false (web sticky hover cannot pin it), and `hover:opacity-70` is not
  // emitted. The default environment keeps the full hover roundtrip.
  test("M-004 touch suppresses hover state and callbacks; pointer keeps the roundtrip", async () => {
    const touch = await openTabs("mobile", { input: "touch" });

    await touch.hover("id:tab-t1");
    await touch.wait(300);
    await touch.press("id:tab-t1");
    await touch.wait(300);

    // No hover probe record of any kind for t1 — not on enter, not on the
    // press that follows, not on a synthetic leave.
    expect(callsOf(touch, "hover").filter((c) => (c[0] as { tab: string }).tab === "t1")).toHaveLength(0);
    // The render-prop flag never rose: t1's state text keeps `H0`.
    expect(touch.texts().some((t) => t.includes("H1"))).toBe(false);

    const pointer = await openTabs("mobile", { input: "pointer" });
    await pointer.hover("id:tab-t1");
    await pointer.wait(300);

    const hoverCalls = callsOf(pointer, "hover").map((c) => c[0]) as {
      tab: string;
      kind: string;
      value?: boolean;
    }[];
    expect(hoverCalls).toContainEqual({ tab: "t1", kind: "start" });
    expect(hoverCalls).toContainEqual({ tab: "t1", kind: "change", value: true });
    // t1 is the selected tab: H1 (hovered) P0 (not pressed) S1 D0.
    expect(pointer.texts()).toContain("H1P0S1D0");

    await pointer.hover("id:after");
    await pointer.wait(300);
    const afterCalls = callsOf(pointer, "hover").map((c) => c[0]) as {
      tab: string;
      kind: string;
      value?: boolean;
    }[];
    expect(afterCalls).toContainEqual({ tab: "t1", kind: "end" });
    expect(afterCalls).toContainEqual({ tab: "t1", kind: "change", value: false });
    expect(pointer.texts()).toContain("H0P0S1D0");
  }, 120_000);

  // adapt-sheets/tabs.md M-010 (A-005, 基线, keyboard halves —
  // T-011/T-015/T-017/T-018 duals): `keyboardActivation` semantics are
  // input-independent, asserted under the injected touch environment the
  // shared file's press halves already run.
  test("M-010 keyboard activation on the web target under touch", async () => {
    const manual = await openTabs("kobalte-manual", { input: "touch" });
    await manual.keyboard.press("tab");
    expect(focusTrail(manual)).toEqual(["overview"]);
    expect(panelText(manual, "Overview panel")).toBe(true);

    await manual.keyboard.press("arrowright");
    expect(focusTrail(manual)).toEqual(["overview", "analytics"]);
    expect(panelText(manual, "Overview panel")).toBe(true);
    expect(selectionCalls(manual)).toHaveLength(0);

    await manual.keyboard.press("arrowright");
    await manual.keyboard.press("enter");
    expect(panelText(manual, "Reports panel")).toBe(true);
    expect(selectionCalls(manual)).toHaveLength(1);
    expect(selectionCalls(manual)[0][0]).toBe("reports");

    const auto = await openTabs("kobalte-plain", { input: "touch" });
    await auto.keyboard.press("tab");
    await auto.keyboard.press("arrowright");
    expect(panelText(auto, "Analytics panel")).toBe(true);
    expect(panelText(auto, "Overview panel")).toBe(false);

    const group = await openTabs("kobalte-disabled-group", { input: "touch" });
    await group.keyboard.press("tab");
    expect(focusTrail(group)).toEqual(["after"]);

    const dfltSel = await openTabs("kobalte-default-analytics", { input: "touch" });
    await dfltSel.keyboard.press("tab");
    expect(focusTrail(dfltSel)).toEqual(["analytics"]);
  }, 120_000);
});
