import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the combo-box adapt unit, one test per row of
 * adapt-sheets/combo-box.md §4: M-001, M-002, M-003, M-004, M-007, M-008,
 * M-009, M-010, M-011, M-012, M-014 and M-015 here (ios + android). The
 * M-011 hover-residue half and the M-014 Tab-focus handoff live in
 * `combo-box.mobile.web.test.tsx` — `app.hover` and Tab focus traversal
 * are desktop/web-only; M-005, M-006 and M-013 live in
 * `combo-box.mobile.headless.test.tsx` because they open `platform: "ios"`
 * or drive `setViewport`.
 *
 * The fixture is `harness/combo-box.fixtures.tsx`: every case sits inside
 * `Scoped` (`host.params.input`/`width`/`density` → `EnvironmentScope`,
 * absent = host baseline), `host.params.presentation`/`modal`/`hide`/`mt`/
 * `ac`/`selkey`/`kb`/`own`/`bm`/`dk`/`out`/`kt`/`rtk`/`ekh`/`im`/`mask`/
 * `acorr`/`acap`/`sb` parameterize the parts, and `case: "b-mobile"` mounts
 * the probe set the mobile rows read — `id:cb-panel`/`id:cb-sheet` carrier
 * ids, `layout` boxes (`trigger-box`, `row-<id>`), `ctx`/`ctx-pressed`/
 * `ctx-channels` seam reads, `focusedKey` and `fieldCtx`. `case: "b-exit"`
 * drives ownsState + `isExiting`/`shouldSkipAnimation` through `host.send`.
 *
 * The default environment is pointer at regular width — the desktop-parity
 * half of every row that does not inject, injected through `host.params`
 * because `open()` platform/width/height options are rejected on ios/android
 * (the old `platform:"windows"` pin's role). `hitSlop` itself has no
 * `nsh/test` readout (sheet §6 host gap): the seam's computed value is
 * asserted through the `ctx`/`ctx-channels` probes and the trigger's
 * `onLayout` bounds; real hit expansion is real-device acceptance.
 */

type Params = Record<string, string>;

const TOUCH_COMPACT_MODAL = { input: "touch", width: "compact", modal: "1" } as const;

function openCombo(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../combo-box.fixtures.tsx", {
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

/** Runs past the 100 ms panel exit hold (the sheet carrier's is shorter). */
function settle(app: App, ms = 150): Promise<void> {
  return app.clock!.runFor(ms);
}

/* Types `text` key by key through the already-focused input. `app.type`
 * presses the element to focus it first, and on web that press lands on
 * the sheet's backdrop (`ERR_NSH_TEST_COVERED`) — the focused input keeps
 * taking keys regardless, so per-character `keyboard.press` is the same
 * type → filter channel that still reaches it on both targets. */
async function typeKeys(app: App, text: string): Promise<void> {
  for (const ch of text) {
    await app.keyboard.press(ch);
    await app.clock!.runFor(30);
  }
}

type LayoutBox = { name?: string; x?: number; y?: number; width?: number; height?: number };

function lastBox(app: App, name: string): LayoutBox | undefined {
  return callsOf(app, "layout")
    .map((args) => args[0] as LayoutBox | undefined)
    .filter((box) => box?.name === name)
    .at(-1);
}

type CtxReport = { enabled: boolean; hitSlop: Record<string, number> | number | null };
type CtxChannels = {
  seamPressed: boolean;
  pressed: number;
  scale: number;
  origin: unknown;
  hitSlop: Record<string, number> | number | null;
  bounds: { width: number; height: number };
  enabled: boolean;
};

function lastCtx(app: App): CtxReport {
  const found = callsOf(app, "ctx");
  return found[found.length - 1][0] as CtxReport;
}

describe("combo-box mobile", () => {
  // adapt-sheets/combo-box.md M-001 (A-003, A-012): the default pointer
  // environment mounts the panel carrier — `cb-panel` presents, `cb-sheet`
  // never appears — with the listbox and options showing and
  // `onOpenChange(true, "manual"|"focus")` recorded once per open, through
  // both the trigger press and the input-focus paths. Desktop zero drift.
  test("M-001 default environment opens the panel carrier on trigger press and input focus", async () => {
    const app = await openCombo("b-mobile");

    expect(app.shows("id:cb-panel")).toBe(false);
    expect(app.shows("id:cb-sheet")).toBe(false);

    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await settle(app, 60);

    expect(app.shows("id:cb-panel")).toBe(true);
    expect(app.shows("id:cb-sheet")).toBe(false);
    expect(app.shows("role:listbox")).toBe(true);
    expect(app.shows("role:option[Cat]")).toBe(true);
    expect(app.shows("role:option[Dog]")).toBe(true);
    expect(app.shows("role:option[Panda]")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);

    // The input-focus path opens the same carrier and reports "focus".
    const focused = await openCombo("b-mobile");
    await focused.press("id:combo-box-input");
    await focused.waitFor("role:listbox");
    await settle(focused, 60);

    expect(focused.shows("id:cb-panel")).toBe(true);
    expect(focused.shows("id:cb-sheet")).toBe(false);
    expect(focused.shows("role:listbox")).toBe(true);
    expect(callsOf(focused, "openChange")).toEqual([[true, "focus"]]);
  });

  // adapt-sheets/combo-box.md M-002 (A-005, 负断言): under the default
  // pointer environment the press chain is verbatim — pressStart →
  // pressChange(true) → pressChange(false) → pressUp → pressEnd → the
  // toggle's openChange → press — the trigger's `onLayout` box is its
  // content size, and every seam read stays at rest (`enabled` false,
  // `hitSlop` null, `isPressed` never rises, no origin, channels idle).
  // No touch-only artifact exists under pointer.
  test("M-002 default environment keeps the verbatim press chain with the seam inert", async () => {
    const app = await openCombo("b-mobile");

    const box = lastBox(app, "trigger-box");
    expect(box?.width).toBeGreaterThan(0);
    // Content-sized, never inflated: the short axis (33 pt) stays under the
    // 44 pt target — hitSlop padding is a view prop, not layout.
    expect(box?.height).toBeLessThan(44);

    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await settle(app, 60);

    // The press sequence, in order, is the desktop one.
    const names = calls(app).map((call) => call.name);
    const pressNames = [
      "triggerPressStart",
      "triggerPressChange",
      "triggerPressChange",
      "triggerPressUp",
      "triggerPressEnd",
      "triggerPress",
    ];
    const seen = names.filter((name) => pressNames.includes(name));
    expect(seen).toEqual(pressNames);
    expect(callsOf(app, "triggerPressChange")).toEqual([[true], [false]]);
    expect(callsOf(app, "triggerPressStart")).toHaveLength(1);
    expect(callsOf(app, "triggerPressUp")).toHaveLength(1);
    expect(callsOf(app, "triggerPressEnd")).toHaveLength(1);
    expect(callsOf(app, "triggerPress")).toHaveLength(1);
    expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);

    // The seam never woke: every environment report is gated off, every
    // pressed edge stayed false, and the on-demand channel sample rests.
    for (const call of callsOf(app, "ctx")) {
      const report = call[0] as CtxReport;
      expect(report.enabled).toBe(false);
      expect(report.hitSlop).toBeNull();
    }
    for (const call of callsOf(app, "ctx-pressed")) {
      expect((call[0] as { seam: boolean }).seam).toBe(false);
    }

    await app.host.send("ctx.sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = callsOf(app, "ctx-channels")
      .map((call) => call[0] as CtxChannels)
      .at(-1)!;
    expect(channels.seamPressed).toBe(false);
    expect(channels.pressed).toBe(0);
    expect(channels.scale).toBe(1);
    expect(channels.origin).toBeNull();
    expect(channels.hitSlop).toBeNull();
    expect(channels.enabled).toBe(false);
    expect(channels.bounds).toEqual(box ? { width: box.width, height: box.height } : channels.bounds);
  });

  // adapt-sheets/combo-box.md M-003 (A-002, A-004): `Scoped`-injected
  // touch + compact + `modal="1"` (`isNonModal={false}`) resolves `auto`
  // to the sheet carrier — `cb-sheet` presents, `cb-panel` never appears,
  // the listbox and `onOpenChange(true)` are unchanged, and the input
  // still types and filters on the sheet carrier. The open goes through
  // the input's focus (which keeps focus under the sheet) and the typing
  // through per-key presses: `app.type`'s focusing press is intercepted
  // by the backdrop on web (§6 host gap — the covered input is
  // unreachable to a press, the focused one is not).
  test("M-003 injected touch+compact+modal resolves auto to the sheet carrier", async () => {
    // `acap:"none"`: iOS applies UITextInput autocapitalization even to
    // synthesized keystrokes, which would turn "dog" into "Dog".
    const app = await openCombo("b-mobile", {
      ...TOUCH_COMPACT_MODAL,
      acap: "none",
    });

    await app.press("id:combo-box-input");
    await app.waitFor("role:listbox");
    await settle(app, 60);

    expect(app.shows("id:cb-sheet")).toBe(true);
    expect(app.shows("id:cb-panel")).toBe(false);
    expect(app.shows("role:listbox")).toBe(true);
    expect(app.shows("role:option[Dog]")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true, "focus"]]);

    await typeKeys(app, "dog");
    await app.clock!.runFor(80);
    expect(app.shows("role:option[Dog]")).toBe(true);
    expect(app.shows("role:option[Cat]")).toBe(false);
    expect(app.shows("role:option[Panda]")).toBe(false);
    expect(callsOf(app, "inputChange")).toEqual([["d"], ["do"], ["dog"]]);
  });

  // adapt-sheets/combo-box.md M-004 (A-001, A-004): an explicit pin wins
  // over the auto rule in both directions — `presentation="sheet"` mounts
  // the Sheet carrier even under pointer, and `presentation="panel"` keeps
  // the anchored overlay under injected touch+compact+modal where auto
  // would pick sheet.
  test("M-004 explicit presentation pin beats the auto rule on both environments", async () => {
    const pinnedSheet = await openCombo("b-mobile", { presentation: "sheet" });
    await pinnedSheet.press("id:combo-box-trigger");
    await pinnedSheet.waitFor("role:listbox");
    await settle(pinnedSheet, 60);
    expect(pinnedSheet.shows("id:cb-sheet")).toBe(true);
    expect(pinnedSheet.shows("id:cb-panel")).toBe(false);
    expect(pinnedSheet.shows("role:option[Dog]")).toBe(true);

    const pinnedPanel = await openCombo("b-mobile", {
      presentation: "panel",
      ...TOUCH_COMPACT_MODAL,
    });
    await pinnedPanel.press("id:combo-box-trigger");
    await pinnedPanel.waitFor("role:listbox");
    await settle(pinnedPanel, 60);
    expect(pinnedPanel.shows("id:cb-panel")).toBe(true);
    expect(pinnedPanel.shows("id:cb-sheet")).toBe(false);
    expect(pinnedPanel.shows("role:option[Dog]")).toBe(true);
  });

  // adapt-sheets/combo-box.md M-007 (A-002): `isNonModal` suppresses the
  // sheet resolution under `auto` — this component's default is non-modal
  // (`isNonModal: true`, the RAC pin that keeps the input interactive), so
  // injected touch+compact still mounts the panel carrier with its
  // underlay-free chain; only an explicit `isNonModal={false}` (`modal="1"`)
  // lets auto resolve sheet (the M-003 contrast half lives headless).
  test("M-007 isNonModal default suppresses auto sheet resolution under touch+compact", async () => {
    const app = await openCombo("b-mobile", { input: "touch", width: "compact" });

    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await settle(app, 60);

    expect(app.shows("id:cb-panel")).toBe(true);
    expect(app.shows("id:cb-sheet")).toBe(false);
    expect(app.shows("role:listbox")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);
  });

  // adapt-sheets/combo-box.md M-008 (A-005): injected touch — the trigger's
  // `onLayout` box stays its content size (`hitSlop` never inflates
  // layout), identical to the pointer reading, while the seam's computed
  // `hitSlop` answers the `(44 − side) / 2` padding on the short axis and
  // the press → toggle → open chain is unchanged.
  test("M-008 injected touch keeps content-sized bounds and computes hitSlop", async () => {
    const pointer = await openCombo("b-mobile", {});
    const pointerBox = lastBox(pointer, "trigger-box");
    expect(pointerBox?.width).toBeGreaterThan(0);

    // The everyday mount: the textfield unit's `min-h-11` touch cell grows
    // the group's inline end with the input, so the trigger's `h-full` box
    // reaches 44 pt and the seam's formula has nothing left to pad — the
    // computed slop reads null while the seam stays enabled. Waiting on a
    // second `ctx` report would hang here: a stable formula emits once.
    const full = await openCombo("b-mobile", { input: "touch" });
    await full.waitUntil(() => lastBox(full, "trigger-box") !== undefined);
    const fullBox = lastBox(full, "trigger-box");
    expect(fullBox?.height).toBeGreaterThanOrEqual(44);
    const fullCtx = lastCtx(full);
    expect(fullCtx.enabled).toBe(true);
    expect(fullCtx.hitSlop).toBeNull();

    // The formula's positive arm needs a trigger box under 44 pt: `iptr:"1"`
    // scopes the sibling Input back to pointer so the group keeps its 33 pt
    // row while the trigger's own seam still reads the injected touch.
    const touch = await openCombo("b-mobile", { input: "touch", iptr: "1" });
    await touch.waitUntil(() => lastBox(touch, "trigger-box") !== undefined);
    const touchBox = lastBox(touch, "trigger-box");

    // hitSlop is a view prop, not layout: the measured box is identical.
    expect(touchBox?.width).toBe(pointerBox?.width);
    expect(touchBox?.height).toBe(pointerBox?.height);

    // The seam's computed slop pads only the axis under 44 pt, by
    // (44 − side) / 2 — read off the same bounds the layout probe reports.
    const ctx = lastCtx(touch);
    expect(ctx.enabled).toBe(true);
    const slop = ctx.hitSlop;
    expect(slop).not.toBeNull();
    const edges = slop as Record<string, number>;
    const target = 44;
    const padX = Math.max(0, (target - (touchBox!.width ?? 0)) / 2);
    const padY = Math.max(0, (target - (touchBox!.height ?? 0)) / 2);
    for (const [edge, pad] of [
      ["top", padY],
      ["bottom", padY],
      ["left", padX],
      ["right", padX],
    ] as const) {
      expect(Math.abs((edges[edge] ?? Number.NaN) - pad)).toBeLessThan(0.001);
    }
    expect(padX + padY).toBeGreaterThan(0);

    // The press → toggle → open chain is unchanged under touch.
    await touch.press("id:combo-box-trigger");
    await touch.waitFor("role:listbox");
    expect(callsOf(touch, "openChange")).toEqual([[true, "manual"]]);
    expect(touch.shows("id:cb-panel")).toBe(true);

    // And the seam's own press roundtrip ran: isPressed rose and fell.
    const edges2 = callsOf(touch, "ctx-pressed").map((c) => (c[0] as { seam: boolean }).seam);
    expect(edges2).toContain(true);
    expect(edges2.at(-1)).toBe(false);
  });

  // adapt-sheets/combo-box.md M-009 (A-006): the G channel survives both
  // carriers — typing filters verbatim, `onInputChange` records each
  // keystroke, arrowing moves the virtual focus onto the filtered key and
  // Enter commits it (`onChange` once, list closes, text = the item name);
  // with no highlighted key Enter runs `commitValue`, which lands the
  // selection-derived text (empty here) and leaves the list open.
  test("M-009 typing, virtual focus and Enter commit work on panel and sheet carriers", async () => {
    // Panel carrier under injected touch (auto resolves panel while the
    // popover stays non-modal). `acap:"none"` as M-003: literal typing, no
    // iOS autocapitalization.
    const panel = await openCombo("b-mobile", { input: "touch", acap: "none" });
    await panel.type("id:combo-box-input", "dog");
    await panel.clock!.runFor(80);

    expect(panel.shows("id:cb-panel")).toBe(true);
    expect(panel.shows("role:option[Dog]")).toBe(true);
    expect(panel.shows("role:option[Cat]")).toBe(false);
    expect(panel.shows("role:option[Panda]")).toBe(false);
    expect(callsOf(panel, "inputChange")).toEqual([["d"], ["do"], ["dog"]]);

    await panel.keyboard.press("arrowdown");
    await panel.clock!.runFor(50);
    expect(callsOf(panel, "focusedKey").at(-1)?.[0]).toBe("dog");

    await panel.keyboard.press("enter");
    await settle(panel);
    expect(callsOf(panel, "change")).toEqual([["dog"]]);
    expect(panel.value("id:combo-box-input")).toBe("Dog");
    expect(panel.shows("role:listbox")).toBe(false);

    // Sheet carrier under injected touch+compact+modal. The input's own
    // press opens it (focus trigger) and keeps focus under the backdrop;
    // typing goes key by key — `app.type`'s focusing press cannot reach a
    // backdrop-covered input on web (same §6 gap as M-003).
    const sheet = await openCombo("b-mobile", {
      ...TOUCH_COMPACT_MODAL,
      acap: "none",
    });
    await sheet.press("id:combo-box-input");
    await sheet.waitFor("role:listbox");
    await sheet.clock!.runFor(60);
    await typeKeys(sheet, "dog");
    await sheet.clock!.runFor(80);

    expect(sheet.shows("id:cb-sheet")).toBe(true);
    expect(sheet.shows("role:option[Dog]")).toBe(true);
    expect(sheet.shows("role:option[Cat]")).toBe(false);
    expect(callsOf(sheet, "inputChange")).toEqual([["d"], ["do"], ["dog"]]);

    await sheet.keyboard.press("arrowdown");
    await sheet.clock!.runFor(50);
    expect(callsOf(sheet, "focusedKey").at(-1)?.[0]).toBe("dog");

    await sheet.keyboard.press("enter");
    await settle(sheet);
    expect(callsOf(sheet, "change")).toEqual([["dog"]]);
    expect(sheet.value("id:combo-box-input")).toBe("Dog");
    expect(sheet.shows("role:listbox")).toBe(false);
    expect(sheet.shows("id:cb-sheet")).toBe(false);

    // No highlighted key: Enter runs `commitValue` — the text lands on the
    // selection-derived value (empty with nothing selected), no `change`
    // fires and the list stays open.
    const idle = await openCombo("b-mobile", { input: "touch", acap: "none" });
    await idle.type("id:combo-box-input", "dog");
    await idle.clock!.runFor(80);
    // focusedKey is null after filtering without an arrow: Enter commits
    // the value, not a key.
    expect(callsOf(idle, "focusedKey").at(-1)?.[0]).toBeNull();
    await idle.keyboard.press("enter");
    await idle.clock!.runFor(80);
    expect(callsOf(idle, "change")).toHaveLength(0);
    expect(idle.value("id:combo-box-input")).toBe("");
    expect(idle.shows("role:listbox")).toBe(true);
  });

  // adapt-sheets/combo-box.md M-010 (A-006): the caller `Input`'s keyboard
  // parameters (`keyboardType`/`returnKeyType`/`enterKeyHint`/`inputMode`/
  // `masked`/`autoCorrect`/`autoCapitalize`/`submitBehavior`) all mount and
  // the type → filter chain is unaffected; the Root's `autoComplete`
  // reaches `TextFieldContext.autoComplete`, read back by the fixture's
  // `fieldCtx` probe. (The soft-keyboard labels themselves are the sheet's
  // §6 host gap — real-device acceptance.)
  //
  // Split: the letter half of the type → filter chain lives in
  // combo-box.mobile.web.test.tsx (a text field takes letters there). This
  // half mounts the same phone-pad/tel/masked params against the fixture's
  // digit-named rows (`numeric="1"`), so the full chain — every param
  // mounted, the typed digits land, the collection filters to the matching
  // option only — runs natively. If a native host refuses the digit insert
  // too, that is the iOS type-delivery gap (E-1), not a param effect.
  test("M-010 caller Input keyboard params and Root autoComplete mount and filter", async () => {
    const app = await openCombo("b-mobile", {
      kt: "phone-pad",
      rtk: "search",
      ekh: "search",
      im: "tel",
      mask: "1",
      acorr: "off",
      acap: "none",
      sb: "blurAndSubmit",
      ac: "email",
      numeric: "1",
    });

    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await app.type("id:combo-box-input", "12");
    await app.clock!.runFor(80);

    // The chain ran end to end: digits reached the field's value exactly
    // (masked hides the echo, not the value) and the filter left the one
    // matching option — no others.
    expect(app.value("id:combo-box-input")).toBe("12");
    expect(app.shows("role:listbox")).toBe(true);
    expect(app.shows("role:option[12 Apples]")).toBe(true);
    expect(app.shows("role:option[11 Monkeys]")).toBe(false);
    expect(app.shows("role:option[23 Beers]")).toBe(false);
    expect(app.count("role:option")).toBe(1);

    const field = callsOf(app, "fieldCtx")
      .map((call) => call[0] as { autoComplete: string | null })
      .at(-1)!;
    expect(field.autoComplete).toBe("email");
  });

  // adapt-sheets/combo-box.md M-011 (A-005, A-008): under injected touch
  // the rows reach the 44 pt minimum through the list-box `min-h-11`
  // inheritance (pointer rows stay at their content height), pressing an
  // option runs the seam roundtrip and the selection callbacks, and the
  // trigger's hover text colour never appears — the `hover:` class moved
  // into the pointer cell, so a touch press leaves the placeholder colour
  // even where web's sticky hover would keep it.
  test("M-011 injected touch: 44pt rows, option press seam roundtrip and no hover residue", async () => {
    const pointer = await openCombo("b-mobile", {});
    await pointer.press("id:combo-box-trigger");
    await pointer.waitFor("role:listbox");
    await settle(pointer, 80);
    const pointerRow = callsOf(pointer, "layout")
      .map((args) => args[0] as LayoutBox)
      .filter((box) => box.name === "row-dog")
      .at(-1);
    expect(pointerRow?.height).toBeLessThan(44);
    await pointer.press("id:combo-box-trigger");
    await settle(pointer);

    const touch = await openCombo("b-mobile", { input: "touch" });
    await touch.press("id:combo-box-trigger");
    await touch.waitFor("role:listbox");
    await settle(touch, 80);
    const touchRow = callsOf(touch, "layout")
      .map((args) => args[0] as LayoutBox)
      .filter((box) => box.name === "row-dog")
      .at(-1);
    expect(touchRow?.height).toBeGreaterThanOrEqual(44);

    await touch.press("role:option[Dog]");
    await settle(touch);
    expect(callsOf(touch, "change")).toEqual([["dog"]]);
    expect(callsOf(touch, "selectionChange")).toEqual([["dog"]]);
    expect(touch.value("id:combo-box-input")).toBe("Dog");
    const pressed = callsOf(touch, "ctx-pressed").map((c) => (c[0] as { seam: boolean }).seam);
    expect(pressed).toContain(true);
    expect(pressed.at(-1)).toBe(false);

    // Hover residue: on web a press leaves the sticky hover painting; the
    // `input` axis keeps `hover:text-field-foreground` out of the touch
    // cell, so the trigger text keeps the placeholder colour throughout.
    // `platform:"web"`/`app.hover`/`spanStyle` are web-only — that half lives
    // in combo-box.mobile.web.test.tsx.
  });

  // adapt-sheets/combo-box.md M-012 (A-007): the F(消费) contract — rows
  // the `items` path never mounts still resolve through the collection:
  // virtual focus lands on the hidden key, Enter commits it and the input
  // text falls back to the datum's `name`, while `defaultItems` keeps its
  // own filtered render path unchanged.
  test("M-012 unmounted items rows still resolve selection, focus and text", async () => {
    // The hidden row never mounts (`hide="2"` gates it behind the items
    // path's `<If>`), yet the collection still knows key "2".
    const app = await openCombo("items", { bm: "1", hide: "2" });
    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await app.clock!.runFor(80);

    expect(app.count("role:option")).toBe(2);
    expect(app.shows("role:option[One]")).toBe(true);
    expect(app.shows("role:option[Two]")).toBe(false);
    expect(app.shows("role:option[Three]")).toBe(true);
    expect(callsOf(app, "focusedKey").at(-1)?.[0]).toBe("1");

    // Virtual focus walks the collection keys, mounted or not: one ArrowDown
    // lands on the unmounted "2" — the `focusedKey` probe records it even
    // though no `role:option[Two]` exists.
    await app.keyboard.press("arrowdown");
    await app.clock!.runFor(50);
    expect(callsOf(app, "focusedKey").at(-1)?.[0]).toBe("2");
    expect(app.shows("role:option[Two]")).toBe(false);

    await app.keyboard.press("enter");
    await settle(app);
    expect(callsOf(app, "change")).toEqual([["2"]]);
    expect(callsOf(app, "selectionChange")).toEqual([["2"]]);
    // `resetInputValue` fell back through `findItem` to the datum's `name`.
    expect(app.value("id:combo-box-input")).toBe("Two");

    // The same fallback on mount: `defaultValue="2"` with the row hidden
    // still shows the item's text.
    const mounted = await openCombo("items", { bm: "1", hide: "2", dk: "2" });
    expect(mounted.value("id:combo-box-input")).toBe("Two");

    // `defaultItems` keeps its filtered render path: typing narrows the
    // mounted rows exactly as before.
    const defaults = await openCombo("default-items", {});
    await defaults.press("id:combo-box-trigger");
    await defaults.waitFor("role:listbox");
    await defaults.type("id:combo-box-input", "Two");
    await defaults.clock!.runFor(80);
    expect(defaults.count("role:option")).toBe(1);
    expect(defaults.shows("role:option[Two]")).toBe(true);
    expect(defaults.shows("role:option[One]")).toBe(false);
  });

  // adapt-sheets/combo-box.md M-014 (基线): default-environment zero-drift
  // sample — the pre-existing semantics the existing suites pin, re-asserted
  // here so the mobile file proves the adaptation changed nothing on the
  // pointer side. `accessibilityState.expanded` has no `nsh/test` readout
  // (sheet §6) and stays with the existing tests; the blur-Tab guard needs
  // `keyboard.press("tab")` to move focus, which is a focus-capable-host
  // channel — it lives in combo-box.mobile.web.test.tsx.
  //
  // The row's sample is split over three tests: every `open` keeps its app
  // alive until the test ends, and the web target dies at roughly ten
  // simultaneous instances — one 24-open test cannot survive
  // `--target web`. Coverage is unchanged, only the grouping.
  test("M-014 baseline sample: triggers, selection contract and collection edges", async () => {
    // menuTrigger "focus" (default): focusing the input opens and reports
    // the focus source.
    const focus = await openCombo("log", {});
    await focus.press("id:combo-box-input");
    await focus.waitFor("role:listbox");
    await settle(focus, 60);
    expect(callsOf(focus, "openChange")).toEqual([[true, "focus"]]);
    expect(focus.shows("role:option[Cat]")).toBe(true);

    // menuTrigger "input": focus alone does not open; typing does, and
    // reports "input".
    const inputMode = await openCombo("log", { mt: "input" });
    await inputMode.press("id:combo-box-input");
    await inputMode.clock!.runFor(80);
    expect(inputMode.shows("role:listbox")).toBe(false);
    expect(callsOf(inputMode, "openChange")).toHaveLength(0);
    await inputMode.type("id:combo-box-input", "d");
    await inputMode.clock!.runFor(80);
    expect(callsOf(inputMode, "openChange")).toEqual([[true, "input"]]);
    expect(inputMode.shows("role:listbox")).toBe(true);

    // menuTrigger "manual": only the trigger (or list keys) opens, reported
    // as "manual".
    const manual = await openCombo("manual", {});
    await manual.press("id:combo-box-trigger");
    await manual.waitFor("role:listbox");
    await settle(manual, 60);
    expect(callsOf(manual, "openChange")).toEqual([[true, "manual"]]);

    // allowsCustomValue: unmatched text survives the close as the value.
    const custom = await openCombo("custom-value", { out: "1" });
    await custom.press("id:combo-box-trigger");
    await custom.waitFor("role:listbox");
    await custom.type("id:combo-box-input", "Bird");
    await custom.clock!.runFor(60);
    await custom.press("id:outside");
    await settle(custom);
    expect(custom.value("id:combo-box-input")).toBe("Bird");
    expect(custom.shows("role:listbox")).toBe(false);

    // allowsEmptyCollection: the empty list still opens with zero options.
    const empty = await openCombo("no-items-allowed", {});
    await empty.press("id:combo-box-trigger");
    await empty.waitFor("role:listbox");
    await settle(empty, 60);
    expect(empty.shows("role:listbox")).toBe(true);
    expect(empty.count("role:option")).toBe(0);

    // disabledKeys: the keyed row reports disabled, its siblings do not.
    const keyed = await openCombo("disabled-keys", {});
    await keyed.press("id:combo-box-trigger");
    await keyed.waitFor("role:listbox");
    await settle(keyed, 60);
    expect(keyed.enabled("role:option[Two]")).toBe(false);
    expect(keyed.enabled("role:option[One]")).toBe(true);
    expect(keyed.enabled("role:option[Three]")).toBe(true);

    // The deprecated `selectedKey` spelling still reaches the selection:
    // the controlled key shows as the input text on mount and selection
    // callbacks keep firing (the controlled value itself is pinned by the
    // existing controlled-key test).
    const spelled = await openCombo("controlled-key", { selkey: "2" });
    expect(spelled.value("id:combo-box-input")).toBe("Two");
    await spelled.press("id:combo-box-trigger");
    await spelled.waitFor("role:listbox");
    await spelled.press("role:option[Three]");
    await settle(spelled);
    expect(callsOf(spelled, "change")).toEqual([["3"]]);
    expect(callsOf(spelled, "selectionChange")).toEqual([["3"]]);

    // defaultFilter: a caller filter narrows the mounted rows.
    const filtered = await openCombo("filter-custom", {});
    await filtered.press("id:combo-box-trigger");
    await filtered.waitFor("role:listbox");
    await filtered.type("id:combo-box-input", "do");
    await filtered.clock!.runFor(80);
    expect(filtered.shows("role:option[Dog]")).toBe(true);
    expect(filtered.shows("role:option[Panda]")).toBe(false);
    expect(filtered.shows("role:option[Cat]")).toBe(false);
  }, 120_000);

  test("M-014 baseline sample: Value texts, blur commit and ownsState", async () => {
    // Multiple selection's Value text: the joined selected text, and the
    // placeholder while nothing is selected.
    const multi = await openCombo("multiple-default", {});
    expect(multi.shows("text:One and Two")).toBe(true);
    const multiEmpty = await openCombo("multiple-log", {});
    expect(multiEmpty.shows("text:No animals selected")).toBe(true);

    // Blur commit via Tab lives in combo-box.mobile.web.test.tsx — Tab
    // focus traversal is a focus-capable-host channel ios/android reject.

    // Outside press is the commit-close channel: the text resets to the
    // selection-derived value and `onOpenChange(false)` lands once.
    const outside = await openCombo("outside", {});
    await outside.press("id:combo-box-trigger");
    await outside.waitFor("role:listbox");
    await outside.clock!.runFor(60);
    await outside.type("id:combo-box-input", "pa");
    await outside.clock!.runFor(60);
    await outside.press("id:outside");
    await settle(outside);
    expect(outside.shows("role:listbox")).toBe(false);
    expect(callsOf(outside, "openChange")).toEqual([[true, "manual"], [false, null]]);
    expect(outside.value("id:combo-box-input")).toBe("");

    // focusReturnPending: the Enter commit's own blur/focus pair must not
    // reopen the list — it stays closed through the settle window.
    const commit = await openCombo("b-mobile", {});
    await commit.press("id:combo-box-trigger");
    await commit.waitFor("role:listbox");
    await commit.type("id:combo-box-input", "dog");
    await commit.clock!.runFor(80);
    await commit.keyboard.press("arrowdown");
    await commit.clock!.runFor(50);
    await commit.keyboard.press("enter");
    await settle(commit, 300);
    expect(commit.shows("role:listbox")).toBe(false);
    expect(callsOf(commit, "openChange")).toEqual([[true, "manual"], [false, null]]);

    // ownsState: a Popover given its own `isOpen` ignores the root's
    // trigger — the trigger toggles the field's state but the layer stays
    // where the prop put it, and the popover's own `onOpenChange` still
    // reports user closes.
    const owned = await openCombo("b-exit", { ownopen: "0" });
    expect(owned.shows("role:listbox")).toBe(false);
    await owned.press("id:combo-box-trigger");
    await owned.clock!.runFor(120);
    expect(owned.shows("role:listbox")).toBe(false);
    expect(callsOf(owned, "ownOpenChange")).toHaveLength(0);

    // ownsState open + outside press: the popover reports its own close
    // but stays mounted-open because the controlled prop has not moved.
    const ownOpen = await openCombo("b-exit", {});
    expect(ownOpen.shows("role:listbox")).toBe(true);
    await ownOpen.press("id:outside");
    await ownOpen.clock!.runFor(120);
    expect(callsOf(ownOpen, "ownOpenChange")).toEqual([[false]]);
    expect(ownOpen.shows("role:listbox")).toBe(true);
    await ownOpen.host.send("combo.close");
    await settle(ownOpen);
    expect(ownOpen.shows("role:listbox")).toBe(false);

    // isExiting retains the mount through the exit; shouldSkipAnimation
    // unmounts at once; reopening re-presents.
    const held = await openCombo("b-exit", { hold: "1" });
    await held.host.send("combo.close");
    await settle(held);
    expect(held.shows("role:listbox")).toBe(true);
    await held.host.send("combo.reopen");
    await held.clock!.runFor(80);
    expect(held.shows("role:listbox")).toBe(true);
  }, 120_000);

  test("M-014 baseline sample: exit paths, modal underlay, kb gate and field texts", async () => {
    // shouldSkipAnimation unmounts at once — the other half of the
    // isExiting pair asserted above.
    const skipped = await openCombo("b-exit", { skip: "1" });
    await skipped.host.send("combo.close");
    await skipped.clock!.runFor(30);
    expect(skipped.shows("role:listbox")).toBe(false);

    // isNonModal:false mounts the underlay: the same outside press closes
    // through the underlay's own channel.
    const modal = await openCombo("outside", { modal: "1" });
    await modal.press("id:combo-box-trigger");
    await modal.waitFor("role:listbox");
    await modal.clock!.runFor(60);
    await modal.press("id:outside");
    await settle(modal);
    expect(modal.shows("role:listbox")).toBe(false);
    expect(callsOf(modal, "openChange")).toEqual([[true, "manual"], [false, null]]);

    // isKeyboardDismissDisabled gates Escape on the panel carrier too.
    const kb = await openCombo("b-mobile", { kb: "1" });
    await kb.press("id:combo-box-trigger");
    await kb.waitFor("role:listbox");
    await kb.clock!.runFor(60);
    await kb.keyboard.press("escape");
    await kb.clock!.runFor(200);
    expect(kb.shows("role:listbox")).toBe(true);
    expect(callsOf(kb, "openChange")).toEqual([[true, "manual"]]);

    // shouldFocusWrap wraps the highlight at both ends.
    const wrap = await openCombo("wrap", {});
    await wrap.press("id:combo-box-input");
    await wrap.waitFor("role:listbox");
    await wrap.clock!.runFor(50);
    await wrap.keyboard.press("arrowup");
    await wrap.clock!.runFor(50);
    expect(wrap.shows("role:option[Three] >> text:Three*")).toBe(true);
    expect(wrap.shows("role:option[One] >> text:One*")).toBe(false);

    // Label / Description / FieldError registration texts: the invalid
    // field shows its error and hides the description (R-002), the plain
    // field shows all three, and ErrorMessage renders verbatim.
    const invalid = await openCombo("invalid", {});
    expect(invalid.shows("text:Please choose an animal")).toBe(true);
    expect(invalid.shows("text:Description")).toBe(false);
    const described = await openCombo("label-description", {});
    expect(described.shows("text:Label")).toBe(true);
    expect(described.shows("text:Description")).toBe(true);
    expect(described.shows("text:Placeholder")).toBe(true);
    const errored = await openCombo("error-message", {});
    expect(errored.shows("text:ErrorMessage")).toBe(true);

    // The field's input keeps the combobox role on both carriers' default.
    const role = await openCombo("log", {});
    expect(role.value("role:combobox")).not.toBeNull();
  }, 120_000);

  // adapt-sheets/combo-box.md M-015 (A-012): the fixture machinery itself —
  // `Scoped`'s `input`/`width`/`density` params reach `EnvironmentScope`
  // (touch + compact + modal resolves the sheet carrier with no platform
  // change), the `presentation`/`modal`/`hide`/`bm`/`dk` params mount and
  // discriminate, and the `cb-panel`/`cb-sheet`/`ctx`/`trigger-box`/
  // `focusedKey`/`fieldCtx` probes answer `shows`/`count`/storage reads.
  test("M-015 fixture Scoped params, case params and probes all mount and discriminate", async () => {
    const baseline = await openCombo("b-mobile");
    expect(baseline.shows("id:combo-box-trigger")).toBe(true);
    expect(lastCtx(baseline).enabled).toBe(false);

    const injected = await openCombo("b-mobile", {
      input: "touch",
      width: "compact",
      modal: "1",
    });
    await injected.press("id:combo-box-trigger");
    await injected.waitFor("role:listbox");
    await settle(injected, 60);
    expect(injected.shows("id:cb-sheet")).toBe(true);
    expect(injected.shows("id:cb-panel")).toBe(false);
    expect(lastCtx(injected).enabled).toBe(true);

    const pinned = await openCombo("b-mobile", { presentation: "panel" });
    await pinned.press("id:combo-box-trigger");
    await pinned.waitFor("role:listbox");
    await settle(pinned, 60);
    expect(pinned.shows("id:cb-panel")).toBe(true);
    expect(pinned.shows("id:cb-sheet")).toBe(false);

    const hidden = await openCombo("items", { bm: "1", hide: "2" });
    await hidden.press("id:combo-box-trigger");
    await hidden.waitFor("role:listbox");
    await hidden.clock!.runFor(60);
    expect(hidden.count("role:option")).toBe(2);
    expect(callsOf(hidden, "focusedKey").length).toBeGreaterThan(0);

    const keyed = await openCombo("items", { bm: "1", hide: "2", dk: "2" });
    expect(keyed.value("id:combo-box-input")).toBe("Two");

    const fields = await openCombo("b-mobile", { ac: "email", kt: "phone-pad" });
    await fields.press("id:combo-box-trigger");
    await fields.waitFor("role:listbox");
    await fields.clock!.runFor(60);
    const field = callsOf(fields, "fieldCtx")
      .map((call) => call[0] as { autoComplete: string | null })
      .at(-1)!;
    expect(field.autoComplete).toBe("email");
    expect(fields.shows("role:option[Cat]")).toBe(true);
  });
});
