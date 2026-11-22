import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the popover adapt unit: M-003, M-005,
 * M-006 and M-007 of adapt-sheets/popover.md §4.
 *
 * These rows open `platform: "ios"` — `open`'s platform option rejects
 * `ios`/`android` under `--target web` (the page is a desktop there), so the
 * host-derived half of the presentation rule (touch input + compact short
 * side from the phone-sized engine, no `EnvironmentScope`) can only run
 * headless. The EnvironmentScope-injected halves of the same rule live in
 * `popover.mobile.test.tsx` and run on both targets. M-901 at the bottom is
 * the round-2 regression pin for the sheet carrier's Escape gate.
 *
 * `platform: "ios"` at 390×844 derives `input: "touch"` and `width:
 * "compact"`, so `presentation: "auto"` resolves the Sheet carrier — the
 * `id:pop-sheet` / `id:pop-panel` testID probes discriminate it.
 */

const IOS = { platform: "ios", width: 390, height: 844 } as const;

function openMobileIos(params: Record<string, string> = {}): Promise<App> {
  return open("../../../popover.fixtures.tsx", {
    ...IOS,
    clock: {},
    host: { params: { case: "mobile", ...params } },
  });
}

describe("popover mobile (headless)", () => {
  // adapt-sheets/popover.md M-003 (A-002, A-004): host-derived touch +
  // compact resolves `auto` to the sheet carrier — `pop-sheet` mounts with
  // the heading and body, `pop-panel` never appears, and `onOpenChange`
  // still records the open edge once.
  test("M-003 ios host derives touch+compact: auto presents the sheet carrier", async () => {
    const app = await openMobileIos();

    await app.press("id:pop-trigger");

    expect(app.count("id:pop-sheet")).toBe(1);
    expect(app.count("id:pop-panel")).toBe(0);
    expect(app.shows("text:Mobile heading")).toBe(true);
    expect(app.shows("text:Mobile content")).toBe(true);
    expect(app.shows("text:Close popover")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/popover.md M-005 (A-002): the presentation value latches on
  // the open edge — resizing the window to regular while the sheet is open
  // must not swap carriers mid-open; after close the next open
  // re-evaluates against the new environment and yields the panel.
  test("M-005 latched sheet survives rotation; reopen re-evaluates to panel", async () => {
    const app = await openMobileIos();

    await app.press("id:pop-trigger");
    expect(app.count("id:pop-sheet")).toBe(1);

    await app.setViewport(1024, 768);
    expect(app.count("id:pop-sheet")).toBe(1);
    expect(app.count("id:pop-panel")).toBe(0);

    await app.host.send("popover.close");
    await app.waitFor("id:pop-sheet", { state: "gone" });

    await app.host.send("popover.reopen");
    await app.waitFor("id:pop-panel");
    expect(app.count("id:pop-panel")).toBe(1);
    expect(app.count("id:pop-sheet")).toBe(0);
    expect(app.shows("text:Mobile content")).toBe(true);
  });

  // adapt-sheets/popover.md M-006 (A-004): sheet-mode close semantics — a
  // sheet-native dismissal (Escape through `SheetBackdrop`'s
  // `closesOnEscape` → `SheetRoot.onOpenChange` → the popover's `setOpen`)
  // and the Dialog `{close}` render-prop (scopedTrigger re-supplied inside
  // the Sheet branch, so `close` still reaches this popover's `close`)
  // both land `onOpenChange(false)` on the Popover owner exactly once.
  // `isKeyboardDismissDisabled` is forwarded onto `SheetBackdrop`, so the
  // contract prop blocks Escape on the sheet carrier exactly as
  // `handleCancel` blocks it on the panel chain (§1 baseline parity).
  test("M-006 sheet-mode closes reach the popover owner through both channels", async () => {
    const app = await openMobileIos();

    await app.press("id:pop-trigger");
    expect(app.count("id:pop-sheet")).toBe(1);

    // Channel one: Escape is the sheet's own dismissal — SheetRoot's
    // onOpenChange writes back through the popover's setOpen.
    await app.keyboard.press("escape");
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
    await app.waitFor("id:pop-sheet", { state: "gone" });

    // Channel two: the Dialog `{close}` render-prop inside the Sheet branch
    // still closes the popover (the scopedTrigger re-supply of A-004).
    await app.press("id:pop-trigger");
    expect(app.count("id:pop-sheet")).toBe(1);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);

    await app.press("id:pop-close");
    expect(callsOf(app, "dialogClose")).toEqual([["dialog"]]);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true], [false]]);
    await app.waitFor("id:pop-sheet", { state: "gone" });

    // The contract prop on the sheet carrier: `isKeyboardDismissDisabled`
    // reaches `SheetBackdrop`, so Escape is gated by `closesOnEscape` and
    // the popover stays open — while the `{close}` channel still works.
    const kb = await openMobileIos({ kbDismiss: "1" });
    await kb.press("id:pop-trigger");
    expect(kb.count("id:pop-sheet")).toBe(1);
    await kb.keyboard.press("escape");
    expect(kb.count("id:pop-sheet")).toBe(1);
    expect(callsOf(kb, "openChange")).toEqual([[true]]);
    await kb.press("id:pop-close");
    expect(callsOf(kb, "openChange")).toEqual([[true], [false]]);
    await kb.waitFor("id:pop-sheet", { state: "gone" });
  });

  // adapt-sheets/popover.md M-007 (A-002): `isNonModal` suppresses the
  // sheet resolution under `auto` — a non-modal popover has no sheet
  // semantics (upstream's bottom-sheet is always modal), so touch+compact
  // still mounts the panel carrier with its underlay-free chain.
  test("M-007 isNonModal suppresses auto sheet resolution", async () => {
    const app = await openMobileIos({ isNonModal: "1" });

    await app.press("id:pop-trigger");

    expect(app.count("id:pop-panel")).toBe(1);
    expect(app.count("id:pop-sheet")).toBe(0);
    expect(app.shows("text:Mobile content")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // Regression pin for the round-2 blocking review finding:
  // src/components/popover/popover-content.tsx:534 — the sheet branch
  // mounted `<SheetBackdrop isExiting={props.isExiting}>` and forwarded
  // nothing else, so `SheetBackdrop`'s `isKeyboardDismissDisabled` default
  // let Escape close through `closesOnEscape`
  // (src/components/sheet/sheet-backdrop.tsx:63-66,178,406-410,441) while
  // the panel chain gates Escape through `handleCancel` honoring the same
  // prop (popover-content.tsx:442-446,477). Under `presentation="sheet"` —
  // by pin or by the auto rule — Escape closed the popover even when the
  // caller set `isKeyboardDismissDisabled`. Required behavior (§1 contract
  // baseline): the prop keeps its documented effect on the sheet carrier,
  // so Escape is blocked on both routes to it while `{close}` still works.
  test("M-901 isKeyboardDismissDisabled blocks Escape on the sheet carrier", async () => {
    // Auto route: the ios host derives touch+compact, so `auto` resolves
    // the Sheet carrier without any pin.
    const auto = await openMobileIos({ kbDismiss: "1" });
    await auto.press("id:pop-trigger");
    expect(auto.count("id:pop-sheet")).toBe(1);

    await auto.keyboard.press("escape");
    await auto.clock!.runFor(200);
    expect(callsOf(auto, "openChange")).toEqual([[true]]);
    expect(auto.count("id:pop-sheet")).toBe(1);

    // Pin route: `presentation="sheet"` under the desktop environment —
    // the carrier, not the environment, owns the Escape gate.
    const pinned = await open("../../../popover.fixtures.tsx", {
      platform: "windows",
      width: 1024,
      height: 768,
      clock: {},
      host: {
        params: { case: "mobile", presentation: "sheet", kbDismiss: "1" },
      },
    });
    await pinned.press("id:pop-trigger");
    expect(pinned.count("id:pop-sheet")).toBe(1);

    await pinned.keyboard.press("escape");
    await pinned.clock!.runFor(200);
    expect(callsOf(pinned, "openChange")).toEqual([[true]]);
    expect(pinned.count("id:pop-sheet")).toBe(1);

    // The block is Escape-scoped: the Dialog `{close}` channel still closes.
    await pinned.press("id:pop-close");
    expect(callsOf(pinned, "openChange")).toEqual([[true], [false]]);
    await pinned.waitFor("id:pop-sheet", { state: "gone" });
  });
});
