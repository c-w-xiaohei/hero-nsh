import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";
import { popoverVariants } from "../../../../src/components/popover/popover.styles";

/*
 * Mobile assertions for the popover adapt unit, one test per row of
 * adapt-sheets/popover.md §4: M-001, M-002, M-004, M-008, M-009, M-010,
 * M-011 and M-012 here (ios + android); M-003, M-005, M-006 and M-007 live
 * in `popover.mobile.headless.test.tsx` because they open
 * `platform: "ios"`, which `--target web` rejects.
 *
 * The fixture is `harness/popover.fixtures.tsx`, `case: "mobile"` (plus
 * `standalone`/`retained`/`skip` for the M-011 baseline sample), driven by
 * `host.params`: `input`/`width`/`density` feed the fixture's
 * `EnvironmentScope`, `presentation`/`isNonModal`/`narrow`/`kbDismiss`
 * parameterize the Content and the trigger child. The carrier probe is the
 * derived testID — `id:pop-panel` on the anchored overlay, `id:pop-sheet` on
 * the Sheet panel — so `shows`/`count` discriminate the presentation.
 *
 * `hitSlop` itself has no `nsh/test` readout (sheet §6 host gap): M-008
 * asserts the only measurable input — the trigger child's `onLayout` bounds
 * — plus the unchanged press/open chain; the real hit expansion is
 * real-device acceptance, and the `(44 − side) / 2` formula is already
 * pinned by the pressable-feedback unit's own mobile tests.
 */

type Params = Record<string, string>;

// The default environment is pointer at regular width — the desktop-parity
// half of every row that does not inject, injected through `EnvironmentScope`
// params because `open()` platform/width/height options are rejected on
// ios/android (the old `platform:"windows"` pin's role).
function openMobile(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../popover.fixtures.tsx", {
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

/** The last `layout` probe box a named view reported. */
function lastBox(app: App, name: string) {
  const found = callsOf(app, "layout")
    .map((args) => args[0] as { name?: string; width?: number; height?: number } | undefined)
    .filter((box) => box?.name === name);
  return found.at(-1);
}

describe("popover mobile", () => {
  // adapt-sheets/popover.md M-001 (A-003): the default pointer environment
  // mounts the panel carrier — `pop-panel` present, `pop-sheet` absent —
  // with the dialog content and heading showing and `onOpenChange(true)`
  // recorded once. Desktop zero drift.
  test("M-001 default environment opens the panel carrier", async () => {
    const app = await openMobile("mobile");

    expect(app.count("id:pop-panel")).toBe(0);
    expect(app.count("id:pop-sheet")).toBe(0);

    await app.press("id:pop-trigger");

    expect(app.count("id:pop-panel")).toBe(1);
    expect(app.count("id:pop-sheet")).toBe(0);
    expect(app.shows("text:Mobile heading")).toBe(true);
    expect(app.shows("text:Mobile content")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
    expect(callsOf(app, "triggerPress")).toEqual([["trigger"]]);
  });

  // adapt-sheets/popover.md M-002 (A-005, 负断言): under the default pointer
  // environment the press/open chain is verbatim and no touch-only artifact
  // appears — the probe set stays exactly the fixture's own names (the
  // component wires no press-feedback channel a test could see; `hitSlop`
  // is a view prop with no readout, sheet §6), and open/close still round
  // through `onOpenChange` once each way.
  test("M-002 default environment keeps the verbatim chain with no touch-only surface", async () => {
    const app = await openMobile("mobile");

    await app.press("id:pop-trigger");
    expect(app.count("id:pop-panel")).toBe(1);

    await app.press("id:pop-close");
    await app.clock!.runFor(120);

    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
    expect(callsOf(app, "triggerPress")).toEqual([["trigger"]]);
    expect(callsOf(app, "dialogClose")).toEqual([["dialog"]]);
    expect(new Set(calls(app).map((call) => call.name))).toEqual(
      new Set(["layout", "openChange", "triggerPress", "dialogClose"]),
    );
    expect(app.count("id:pop-panel")).toBe(0);
  });

  // adapt-sheets/popover.md M-004 (A-001, A-004): an explicit pin wins over
  // the auto rule in both directions — `presentation="sheet"` mounts the
  // Sheet carrier even under pointer, and `presentation="panel"` keeps the
  // anchored overlay under injected touch+compact where auto would pick
  // sheet.
  test("M-004 explicit presentation pin beats the auto rule on both environments", async () => {
    const pinnedSheet = await openMobile("mobile", { presentation: "sheet" });
    await pinnedSheet.press("id:pop-trigger");
    expect(pinnedSheet.count("id:pop-sheet")).toBe(1);
    expect(pinnedSheet.count("id:pop-panel")).toBe(0);
    expect(pinnedSheet.shows("text:Mobile content")).toBe(true);

    const pinnedPanel = await openMobile("mobile", {
      presentation: "panel",
      input: "touch",
      width: "compact",
    });
    await pinnedPanel.press("id:pop-trigger");
    expect(pinnedPanel.count("id:pop-panel")).toBe(1);
    expect(pinnedPanel.count("id:pop-sheet")).toBe(0);
    expect(pinnedPanel.shows("text:Mobile content")).toBe(true);
  });

  // adapt-sheets/popover.md M-008 (A-005): injected touch — the trigger
  // child's `onLayout` box is its content size (`hitSlop` never inflates
  // layout): the narrow `w-10` box stays 40pt wide and sub-44 tall, the
  // standard box reaches the 44pt minimum on both axes where the seam's
  // formula would answer `undefined`, and the press → `onOpenChange` →
  // close chain is unchanged. Heights are asserted as inequalities because
  // text metrics differ between the headless and web engines; the slop
  // Edges themselves are the §6 host gap — asserted through the seam's own
  // unit tests, real expansion on device.
  test("M-008 injected touch keeps content-sized bounds and the unchanged open chain", async () => {
    const narrow = await openMobile("mobile", {
      narrow: "1",
      input: "touch",
      width: "compact",
    });
    const narrowBox = lastBox(narrow, "trigger-box");
    expect(narrowBox?.width).toBe(40);
    expect(narrowBox?.height).toBeLessThan(44);

    await narrow.press("id:pop-trigger");
    expect(narrow.count("id:pop-sheet")).toBe(1);
    await narrow.press("id:pop-close");
    expect(callsOf(narrow, "openChange")).toEqual([[true], [false]]);

    const standard = await openMobile("mobile", { input: "touch" });
    const standardBox = lastBox(standard, "trigger-box");
    expect(standardBox?.width).toBeGreaterThanOrEqual(44);
    expect(standardBox?.height).toBeGreaterThanOrEqual(44);
    await standard.press("id:pop-trigger");
    expect(standard.count("id:pop-panel")).toBe(1);
    expect(callsOf(standard, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/popover.md M-009 (A-006): the Dialog `{close}` render-prop
  // closes the popover through `trigger?.close()`/`setOpen(false)` on both
  // environments — `dialogClose` fires once and `onOpenChange(false)` lands
  // exactly one round, on the panel carrier under pointer and on the Sheet
  // carrier under injected touch+compact.
  test("M-009 Dialog close render-prop closes on both carriers", async () => {
    const panel = await openMobile("mobile");
    await panel.press("id:pop-trigger");
    await panel.press("id:pop-close");
    expect(callsOf(panel, "dialogClose")).toEqual([["dialog"]]);
    expect(callsOf(panel, "openChange")).toEqual([[true], [false]]);
    await panel.clock!.runFor(120);
    expect(panel.count("id:pop-panel")).toBe(0);

    const sheet = await openMobile("mobile", { input: "touch", width: "compact" });
    await sheet.press("id:pop-trigger");
    expect(sheet.count("id:pop-sheet")).toBe(1);
    await sheet.press("id:pop-close");
    expect(callsOf(sheet, "dialogClose")).toEqual([["dialog"]]);
    expect(callsOf(sheet, "openChange")).toEqual([[true], [false]]);
    await sheet.waitFor("id:pop-sheet", { state: "gone" });
    expect(sheet.count("id:pop-sheet")).toBe(0);
  });

  // adapt-sheets/popover.md M-010 (A-009): `popoverVariants()` resolves the
  // same four slot class strings as before the migration — the styles table
  // gained no `input`/`density` axis and no pseudo-state cell, so the slot
  // keys and every resolved string are verbatim.
  test("M-010 popoverVariants slot strings are verbatim", () => {
    const slots = popoverVariants();

    expect(Object.keys(slots).sort()).toEqual(
      ["base", "dialog", "heading", "trigger"].sort(),
    );
    expect(slots.base()).toBe(
      "bg-overlay p-0 text-sm text-overlay-foreground rounded-3xl " +
        "shadow-[0_2px_8px_0_rgba(0,0,0,0.06),0_-6px_12px_0_rgba(0,0,0,0.03),0_14px_28px_0_rgba(0,0,0,0.08)] " +
        "dark:shadow-[0_0_1px_0_rgba(255,255,255,0.3)_inset] duration-150 " +
        "ease-[cubic-bezier(0.25,0.1,0.25,1)]",
    );
    expect(slots.dialog()).toBe("p-4 outline-none");
    expect(slots.heading()).toBe("font-medium");
    expect(slots.trigger()).toBe(
      "inline-block w-fit cursor-pointer duration-150 " +
        "ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none",
    );
  });

  // adapt-sheets/popover.md M-011 (baseline sample): under the default
  // environment the pre-existing semantics hold — trigger toggle and Escape
  // both round through `onOpenChange`, a press on the covered trigger lands
  // on the underlay and closes, `isKeyboardDismissDisabled` blocks Escape
  // while `{close}` still works, a standalone Content keeps `ownsState`,
  // `isExiting` retains the mount and `shouldSkipAnimation` unmounts at
  // once. `aria-expanded`/focus-visible have no `nsh/test` readout and stay
  // with `popover.heroui.test.tsx`.
  test("M-011 default environment baseline sample: toggle, escape, underlay, ownsState, exit paths", async () => {
    const app = await openMobile("mobile");

    await app.press("id:pop-trigger");
    expect(callsOf(app, "openChange")).toEqual([[true]]);

    await app.keyboard.press("escape");
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);

    await app.clock!.runFor(120);
    await app.press("id:pop-trigger");
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);

    // The trigger is covered by the modal underlay while open: the press
    // lands on the underlay's outside-press close.
    await app.press("id:pop-trigger");
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true], [false]]);

    const kb = await openMobile("mobile", { kbDismiss: "1" });
    await kb.press("id:pop-trigger");
    await kb.keyboard.press("escape");
    expect(kb.count("id:pop-panel")).toBe(1);
    expect(callsOf(kb, "openChange")).toEqual([[true]]);
    await kb.press("id:pop-close");
    expect(callsOf(kb, "openChange")).toEqual([[true], [false]]);

    const standalone = await openMobile("standalone");
    expect(standalone.shows("text:Standalone content")).toBe(true);
    expect(standalone.count("id:pop-panel")).toBe(1);
    await standalone.keyboard.press("escape");
    expect(callsOf(standalone, "openChange")).toEqual([[false]]);

    const retained = await openMobile("retained");
    await retained.host.send("popover.close");
    await retained.clock!.runFor(120);
    expect(retained.shows("text:Retained content")).toBe(true);

    const skip = await openMobile("skip");
    await skip.host.send("popover.close");
    await skip.clock!.runFor(20);
    expect(skip.count("text:Retained content")).toBe(0);
  });

  // adapt-sheets/popover.md M-012 (A-010): the fixture machinery itself —
  // `Scoped`'s `input`/`width` params reach `EnvironmentScope` (touch +
  // compact resolves the sheet carrier with no platform change), the
  // `presentation`/`isNonModal`/`narrow` params mount and discriminate, and
  // the `pop-panel`/`pop-sheet` carrier probes answer `shows`/`count`.
  test("M-012 fixture Scoped params, case params and carrier probes all mount and discriminate", async () => {
    const baseline = await openMobile("mobile");
    expect(baseline.shows("id:pop-trigger")).toBe(true);

    const injected = await openMobile("mobile", { input: "touch", width: "compact" });
    await injected.press("id:pop-trigger");
    expect(injected.count("id:pop-sheet")).toBe(1);
    expect(injected.count("id:pop-panel")).toBe(0);

    const pinned = await openMobile("mobile", { presentation: "sheet" });
    await pinned.press("id:pop-trigger");
    expect(pinned.count("id:pop-sheet")).toBe(1);

    const nonModal = await openMobile("mobile", {
      isNonModal: "1",
      input: "touch",
      width: "compact",
    });
    await nonModal.press("id:pop-trigger");
    expect(nonModal.count("id:pop-panel")).toBe(1);
    expect(nonModal.count("id:pop-sheet")).toBe(0);

    const narrow = await openMobile("mobile", { narrow: "1" });
    const narrowBox = lastBox(narrow, "trigger-box");
    expect(narrowBox?.width).toBe(40);
    expect(narrowBox?.height).toBeLessThan(44);
  });
});
