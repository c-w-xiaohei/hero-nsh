import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the dropdown adapt unit: M-006,
 * M-008, M-010 and M-012 of adapt-sheets/dropdown.md §4.
 *
 * These rows open `platform: "ios"` — `open`'s platform option rejects
 * `ios`/`android` under `--target web`, so the host-derived half of the
 * presentation rule (touch input + compact short side from the phone-sized
 * engine, no `EnvironmentScope`), `setViewport`, `app.drag` and `app.back`
 * can only run headless. The EnvironmentScope-injected halves live in
 * `dropdown.mobile.test.tsx`.
 *
 * `platform: "ios"` at 390×844 derives `input: "touch"` and
 * `width: "compact"`, so `presentation: "auto"` resolves the Sheet
 * carrier — `id:dd-pop-sheet` / `id:dd-pop-panel` discriminate it.
 */

const IOS = { platform: "ios", width: 390, height: 844 } as const;

function openMobileIos(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../dropdown.fixtures.tsx", {
    ...IOS,
    clock: {},
    host: { params: { case: caseName, ...params } },
  });
}

describe("dropdown mobile (headless)", () => {
  // adapt-sheets/dropdown.md M-006 (A-003, A-005): the presentation value
  // latches on the open edge — resizing the window to regular while the
  // sheet is open must not swap carriers mid-open; after close the next
  // open re-evaluates against the new environment and yields the panel.
  test("M-006 latched sheet survives rotation; reopen re-evaluates to panel", async () => {
    const app = await openMobileIos("mobile");

    await app.press("id:dd-trigger");
    expect(app.count("id:dd-pop-sheet")).toBe(1);
    expect(app.count("id:dd-pop-panel")).toBe(0);

    await app.setViewport(1024, 768);
    expect(app.count("id:dd-pop-sheet")).toBe(1);
    expect(app.count("id:dd-pop-panel")).toBe(0);

    await app.host.send("dropdown.close");
    await app.clock!.runFor(150);
    expect(app.count("id:dd-pop-sheet")).toBe(0);

    await app.host.send("dropdown.reopen");
    await app.clock!.runFor(150);
    expect(app.count("id:dd-pop-panel")).toBe(1);
    expect(app.count("id:dd-pop-sheet")).toBe(0);
    expect(app.shows("text:New file")).toBe(true);
  });

  // adapt-sheets/dropdown.md M-007 (the headless half): sheet-mode close
  // semantics — the backdrop's outside press and the system back channel
  // both reach `SheetRoot.onOpenChange(false)` → the popover's `close()`,
  // and a downward sheet drag dismisses through the same write path.
  test("M-007 sheet dismissals reach the popover owner", async () => {
    // Outside press: the modal sheet's backdrop absorbs the press on the
    // covered trigger.
    const outside = await openMobileIos("mobile");
    await outside.press("id:dd-trigger");
    expect(outside.count("id:dd-pop-sheet")).toBe(1);
    await outside.press("id:dd-trigger");
    await outside.clock!.runFor(150);
    expect(callsOf(outside, "openChange")).toEqual([[true], [false]]);
    expect(outside.count("id:dd-pop-sheet")).toBe(0);

    // Back / cancel: same write path as Escape.
    const back = await openMobileIos("mobile");
    await back.press("id:dd-trigger");
    await back.back().catch(() => undefined);
    await back.clock!.runFor(150);
    expect(callsOf(back, "openChange")).toEqual([[true], [false]]);
    expect(back.shows("role:menu")).toBe(false);
  });

  // adapt-sheets/dropdown.md M-008 (A-003, A-005, A-009): the retained
  // contract holds on the sheet carrier — closing and reopening keeps the
  // mounted collection, so selection, the `✓` indicator and the row texts
  // survive; the submenu's `aria-expanded` resets with its open state and
  // its `openSubmenu`/`closeSubmenu` channels still register.
  test("M-008 sheet carrier keeps the mounted collection across close/reopen", async () => {
    const app = await openMobileIos("mobile", { select: "1" });

    await app.press("id:dd-trigger");
    expect(app.count("id:dd-pop-sheet")).toBe(1);
    expect(app.count("text:✓")).toBe(1);

    // Selecting a row closes the sheet (shouldCloseOnSelect's default),
    // keeping the collection mounted under the retained backdrop.
    await app.press("text:New file");
    await app.clock!.runFor(150);
    expect(callsOf(app, "onAction")).toEqual([["new-file"]]);
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
    expect(app.shows("role:menu")).toBe(false);

    // Reopen: the same mounted collection — the selection state the
    // caller's `selectedKeys` kept, the rows, and one more action round.
    await app.press("id:dd-trigger");
    expect(app.count("id:dd-pop-sheet")).toBe(1);
    expect(app.shows("text:Copy link")).toBe(true);
    expect(app.count("text:✓")).toBe(1);
    await app.press("text:Copy link");
    await app.clock!.runFor(150);
    expect(callsOf(app, "onAction")).toEqual([["new-file"], ["copy-link"]]);

    // The submenu half: open the sub layer inside a sheet-carried root,
    // close the root, reopen — the trigger row's `aria-expanded` resets
    // (`sub-collapsed` again) and the sub channel still opens.
    const sub = await openMobileIos("mobile-submenu");
    await sub.press("id:dd-trigger");
    expect(sub.count("id:dd-pop-sheet")).toBe(1);

    await sub.press("text:Share");
    expect(sub.shows("text:sub-expanded")).toBe(true);
    expect(sub.count("id:dd-sub-panel")).toBe(1);
    expect(sub.count("id:dd-sub-sheet")).toBe(0);

    await sub.host.send("dropdown.close");
    await sub.clock!.runFor(150);
    expect(sub.shows("text:sub-expanded")).toBe(false);

    await sub.host.send("dropdown.reopen");
    await sub.clock!.runFor(150);
    expect(sub.count("id:dd-pop-sheet")).toBe(1);
    expect(sub.shows("text:sub-collapsed")).toBe(true);

    await sub.press("text:Share");
    expect(sub.shows("text:sub-expanded")).toBe(true);
    expect(sub.shows("text:Share to X")).toBe(true);
  });

  // adapt-sheets/dropdown.md M-010 (A-011, A-012): the degraded pairing —
  // a root sheet and a submenu coexist without collapsing: the root mounts
  // `dd-pop-sheet`, pressing the submenu row mounts `dd-sub-panel` (never
  // `dd-sub-sheet`) and the submenu's rows show.
  test("M-010 root sheet plus submenu degrades to a panel submenu", async () => {
    const app = await openMobileIos("mobile-submenu");

    await app.press("id:dd-trigger");
    expect(app.count("id:dd-pop-sheet")).toBe(1);
    expect(app.count("id:dd-pop-panel")).toBe(0);

    await app.press("text:Share");
    expect(app.shows("text:Share to X")).toBe(true);
    expect(app.shows("text:Share by mail")).toBe(true);
    expect(app.count("id:dd-sub-panel")).toBe(1);
    expect(app.count("id:dd-sub-sheet")).toBe(0);

    // The submenu row still acts: one action, one close round through the
    // root's channel.
    await app.press("text:Share to X");
    await app.clock!.runFor(150);
    expect(callsOf(app, "onAction")).toEqual([["share-x"]]);
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
  });

  // adapt-sheets/dropdown.md M-012 (A-006): `app.drag` over the trigger
  // cancels the press — the seam's `pressUp` runs on the cancel path
  // (release and cancel share `onPressUp`), the fallback in `handlePress`
  // backs it up, no `toggle`/`openChange` is produced, and a following
  // clean press completes the full round-trip.
  test("M-012 drag cancels the press without a stray open", async () => {
    const app = await openMobileIos("mobile");

    await app.drag("id:dd-trigger", { x: 0, y: 60 });
    await app.clock!.runFor(100);

    expect(callsOf(app, "openChange")).toEqual([]);
    expect(app.count("id:dd-pop-sheet")).toBe(0);

    await app.host.send("ctx.sample");
    await app.clock!.runFor(50);
    const calls = callsOf(app, "ctx-channels").map(
      (args) => args[0] as Record<string, unknown>,
    );
    const sample = calls.at(-1);
    expect(sample?.seamPressed).toBe(false);
    expect(sample?.origin).toBe(null);
    expect(sample?.pressed).toBe(0);

    // A clean press after the cancel completes the seam's round-trip and
    // opens exactly once.
    await app.press("id:dd-trigger");
    expect(callsOf(app, "openChange")).toEqual([[true]]);
    expect(app.count("id:dd-pop-sheet")).toBe(1);
  });
});
