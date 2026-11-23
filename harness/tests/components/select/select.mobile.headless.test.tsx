import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the Select adapt unit — the rows of
 * adapt-sheets/select.md §4 that need steps only the headless engine
 * provides: M-006, M-007, M-009 and M-012.
 *
 *   - `open({platform:"ios"})` host derivation — no `EnvironmentScope`: the
 *     phone-sized engine reports `input()==="touch"` and
 *     `width()==="compact"`, so `auto` resolves the sheet carrier (web
 *     rejects the `platform` option outright).
 *   - `app.back()` / `app.drag` — the sheet's native dismissal channel and
 *     the press-cancel path exist only here.
 *   - `app.setViewport` — the open-time latch (M-007) is a headless step.
 *
 * The shared file `select.mobile.test.tsx` covers M-001 … M-005, M-008 and
 * M-010 … M-019 on both targets.
 */

const IOS = { platform: "ios", width: 390, height: 844 } as const;

function openSelectIos(
  caseName: string,
  params: Record<string, string> = {},
): Promise<App> {
  return open("../../../select.fixtures.tsx", {
    ...IOS,
    clock: {},
    host: { params: { case: caseName, ...params } },
  });
}

function openSelect(
  caseName: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../select.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    clock: {},
    ...options,
    host: { params: { case: caseName, ...params } },
  });
}

function eventArgs(app: App): string[] {
  return callsOf(app, "events").map((c) => c[0] as string);
}

function seamEdges(app: App): boolean[] {
  return callsOf(app, "ctx-pressed").map(
    (c) => (c[0] as { seam: boolean }).seam,
  );
}

describe("select mobile (headless)", () => {
  // adapt-sheets/select.md M-006 (A-005): the sheet carrier's dismissal
  // channels all land on the popover's `close()` — the backdrop's outside
  // press reports `onOpenChange(false)` through `SheetRoot.onOpenChange`,
  // `app.back()` takes the same route, and `isKeyboardDismissDisabled`
  // reaches `SheetBackdrop` so Escape is gated while other channels close.
  test("M-006 sheet-mode closes reach the popover owner through backdrop, back and Escape", async () => {
    // Backdrop press: `sel-pop-backdrop` is the paint layer's derived
    // testID; a press there dismisses through `SheetRoot.onOpenChange(false)`.
    const app = await openSelectIos("items-outside");
    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-sheet");
    await app.press("id:sel-pop-backdrop");
    await app.waitFor("id:sel-pop-sheet", { state: "gone" });
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);

    // `app.back()` — the sheet's swipe/back dismissal — same channel.
    const back = await openSelectIos("items");
    await back.press("id:select-trigger");
    await back.waitFor("id:sel-pop-sheet");
    await back.back();
    await back.waitFor("id:sel-pop-sheet", { state: "gone" });
    expect(callsOf(back, "openChange")).toEqual([[true], [false]]);

    // `isKeyboardDismissDisabled` forwarded to `SheetBackdrop`: Escape is
    // gated while the other dismissal channels still close — the backdrop
    // press takes the same `close()` route.
    const kb = await openSelectIos("items", { kbdDismiss: "1" });
    await kb.press("id:select-trigger");
    await kb.waitFor("id:sel-pop-sheet");
    await kb.keyboard.press("escape");
    await kb.clock!.runFor(200);
    expect(kb.count("id:sel-pop-sheet")).toBe(1);
    expect(callsOf(kb, "openChange")).toEqual([[true]]);

    await kb.press("id:sel-pop-backdrop");
    await kb.waitFor("id:sel-pop-sheet", { state: "gone" });
    expect(callsOf(kb, "openChange")).toEqual([[true], [false]]);
  }, 120_000);

  // adapt-sheets/select.md M-007 (A-003, A-005): the presentation value
  // latches on the open edge — an ios mount derives touch+compact and
  // `auto` mounts the sheet carrier; `setViewport` to a regular size while
  // it is open must not swap it, and the next open re-evaluates against
  // the new environment and yields the panel.
  test("M-007 the latched sheet survives a mid-open resize; reopen re-evaluates", async () => {
    const app = await openSelectIos("states");

    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-sheet");
    expect(app.count("id:sel-pop-panel")).toBe(0);

    await app.setViewport(1024, 768);
    expect(app.count("id:sel-pop-sheet")).toBe(1);
    expect(app.count("id:sel-pop-panel")).toBe(0);

    await app.back();
    await app.waitFor("id:sel-pop-sheet", { state: "gone" });

    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-panel");
    expect(app.count("id:sel-pop-panel")).toBe(1);
    expect(app.count("id:sel-pop-sheet")).toBe(0);
    expect(app.shows("role:listbox")).toBe(true);
  }, 120_000);

  // adapt-sheets/select.md M-009 (A-005, A-010): the retained mount — a
  // multiple selection inside the sheet keeps it open and the collection
  // alive; after a close and reopen the previously selected `✓` marker is
  // still there because `registerList` was never unregistered between
  // opens (`isExiting` holds the mount across every close).
  test("M-009 the sheet carrier retains the mounted list across closes", async () => {
    const app = await openSelectIos("items", { keepopen: "1" });

    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-sheet");

    // A row press selects without closing (multiple → no
    // closeOnSelection); the `✓` marker lands on the live collection.
    await app.press("role:option[Two]");
    expect(callsOf(app, "selectionChange")).toEqual([[["2"]]]);
    expect(app.count("id:sel-pop-sheet")).toBe(1);
    expect(app.count("role:listbox >> text:✓")).toBe(1);

    // Dismiss, reopen: the retained mount keeps the same ListBox subtree,
    // so the collection — and the `✓` — survives intact.
    await app.back();
    await app.waitFor("id:sel-pop-sheet", { state: "gone" });
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);

    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-sheet");
    expect(app.count("role:listbox >> text:✓")).toBe(1);
    expect(app.shows("role:listbox")).toBe(true);

    // And the first-open persistence is structural, not exit-hold luck:
    // a `defaultOpen` sheet that was dismissed retains its subtree too.
    const opened = await openSelectIos("items-default-open", {
      presentation: "sheet",
    });
    await opened.waitFor("id:sel-pop-sheet");
    await opened.back();
    await opened.waitFor("id:sel-pop-sheet", { state: "gone" });
    await opened.press("id:select-trigger");
    await opened.waitFor("id:sel-pop-sheet");
    expect(opened.shows("role:listbox")).toBe(true);
  }, 120_000);

  // adapt-sheets/select.md M-012 (A-007): `app.drag` over the trigger
  // cancels the press — `down→up` with no `press`, no `toggle` /
  // `openChange` — the seam resets through the shared `pressUp` path, and
  // a clean press after it completes the full round-trip.
  test("M-012 a drag cancels the press and the seam resets for the next one", async () => {
    const app = await openSelectIos("states");

    await app.drag("id:select-trigger", { x: 60, y: 0 });
    await app.waitUntil(() => eventArgs(app).includes("up"));

    expect(eventArgs(app)).toEqual(["down", "up"]);
    expect(callsOf(app, "openChange")).toHaveLength(0);
    expect(app.shows("role:listbox")).toBe(false);
    await app.waitUntil(() => seamEdges(app).at(-1) === false);
    expect(seamEdges(app)).toContain(true);

    // The seam is not stranded: a clean press runs the whole cycle.
    await app.press("id:select-trigger");
    expect(eventArgs(app)).toEqual(["down", "up", "down", "up", "press"]);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
    await app.waitUntil(() => seamEdges(app).at(-1) === false);
  }, 120_000);

  // Regression pin for the headless half of the G assertion (M-008's twin):
  // on a real ios host (host-derived touch, no scope) the mounted sheet
  // resolves the content pan AND the paired scroll's interactive dismiss —
  // the input scenario the `kbd` case mounts inside the list.
  test("M-008h ios host: the sheet's content pan and keyboard channel are live", async () => {
    const app = await openSelectIos("states", { kbd: "1" });

    await app.press("id:select-trigger");
    await app.waitFor("id:sel-pop-sheet");
    await app.waitUntil(() => callsOf(app, "pan").length > 0);

    // The popover's children instantiate once per carrier branch; the sheet
    // copy is the one inside `SheetDialog` (`carrier === "sheet"`).
    const pan = callsOf(app, "pan")
      .map((c) => c[0] as { carrier: string; panKeys: number; scrollKeys: number; keyboardDismissMode: string | null })
      .filter((p) => p.carrier === "sheet")
      .at(-1)!;
    expect(pan.panKeys).toBeGreaterThanOrEqual(1);
    expect(pan.scrollKeys).toBeGreaterThanOrEqual(1);
    expect(pan.keyboardDismissMode).toBe("interactive");
    expect(app.shows("label:Search options")).toBe(true);
  });
});
