import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the autocomplete adapt unit, one test per row of
 * adapt-sheets/autocomplete.md §4: M-001, M-003, M-005 … M-015 and M-019
 * here (ios + android); the `app.hover` rows M-002, M-004 and M-018 live in
 * `autocomplete.mobile.web.test.tsx` (hover is desktop/web-only); M-016 and
 * M-017 live in `autocomplete.mobile.headless.test.tsx` because they open
 * `platform: "ios"`, which `--target web` rejects.
 *
 * The fixture is `harness/autocomplete.fixtures.tsx`, `case: "m"` (plus the
 * `m-nonmodal` / `m-kbdismiss` / `m-empty` / `m-pin-sheet` / `m-pin-panel`
 * presets), driven by `host.params`: `input` / `width` / `density` feed the
 * fixture's always-mounted `EnvironmentScope`, `presentation` /
 * `isNonModal` / `kbDismiss` / `disabled` parameterize the field. The
 * carrier probe is the testID — `id:ac-pop` verbatim on the anchored panel,
 * `id:ac-pop-sheet` derived on the Sheet carrier.
 *
 * Every `open` injects `input:"pointer", width:"regular"` through
 * `host.params` — the role the old `platform:"windows", width:1024` pin
 * played (open() platform/width options are rejected on ios/android):
 * without it the phone-derived environment defaults `input` to touch and
 * every pointer-default assertion inverts (the switch M-001/3/4 lesson).
 *
 * `hitSlop` itself has no `nsh/test` readout (sheet §6 host gap): M-005 /
 * M-006 / M-007 assert the seam's `ctx-*` channel values instead — the
 * computed `hitSlop` Edges on the context accessor — and the real hit
 * expansion is real-device acceptance. Class names are never read; the
 * `hover:` move into the `input: "pointer"` cell is asserted through
 * `viewStyle().backgroundColor` on the clear button.
 */

type Params = Record<string, string>;

function openMobile(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../autocomplete.fixtures.tsx", {
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

type CtxEnv = {
  enabled: boolean;
  hitSlop: Edges | null;
  bounds: { width: number; height: number };
};

type LayoutEntry = { name: string; x: number; y: number; width: number; height: number };

function lastOf<T>(app: App, name: string): T {
  const all = callsOf(app, name);
  const found = all[all.length - 1]?.[0] as T | undefined;

  if (found === undefined) throw new Error(`the fixture recorded no ${name} call`);

  return found;
}

function states(app: App): CtxState[] {
  return callsOf(app, "ctx-state").map((c) => c[0] as CtxState);
}

function layoutFor(app: App, name: string): LayoutEntry {
  const entries = callsOf(app, "layout")
    .map((c) => c[0] as LayoutEntry)
    .filter((e) => e.name === name);
  return entries[entries.length - 1];
}

/** The OS the fixture reports; the Android overlay-row gap branches on it. */
function hostOs(app: App): string {
  const last = callsOf(app, "env").at(-1)?.[0] as { os?: string } | undefined;
  return last?.os ?? "";
}

const TOUCH_COMPACT: Params = { input: "touch", width: "compact" };
const CLEAR = "label:Clear selection";
const TRIGGER = "id:ac-trigger";
const SEARCH = "label:Search animals";

describe("autocomplete mobile", () => {
  // adapt-sheets/autocomplete.md M-001 (A-001): the `input` axis' `min-h-11`
  // lifts the trigger's 36pt field box to the 44pt touch minimum under the
  // injected touch environment; the pointer environment keeps `min-h-9`'s
  // 36 — desktop zero drift. Bounds are the fixture's `onLayout` probes.
  test("M-001 touch lifts the trigger to 44pt, pointer keeps 36pt", async () => {
    const touch = await openMobile("m", { input: "touch" });
    await touch.waitUntil(() =>
      callsOf(touch, "layout").some((c) => (c[0] as LayoutEntry).name === "trigger"),
    );
    // Android reports the px-rounded box (43.8095); the contract is the lift,
    // not the exact pt.
    const touchHeight = layoutFor(touch, "trigger").height;
    expect(touchHeight).toBeGreaterThanOrEqual(43.5);

    const pointer = await openMobile("m");
    await pointer.waitUntil(() =>
      callsOf(pointer, "layout").some((c) => (c[0] as LayoutEntry).name === "trigger"),
    );
    // iOS device hosts measured `min-h-9` at 40pt, not the class's 36; the
    // floor's cause is unproven, so the contract stays the range — pointer
    // stays below the touch box. The headless ios engine measures the exact
    // 36 (autocomplete.mobile.headless.test.tsx).
    const pointerHeight = layoutFor(pointer, "trigger").height;
    expect(pointerHeight).toBeGreaterThanOrEqual(36);
    expect(pointerHeight).toBeLessThan(44);
    expect(touchHeight).toBeGreaterThan(pointerHeight);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-002 (A-001): R-043's `hover:` class lives
  // in the `input: "pointer"` cell now — under touch neither a hover nor a
  // completed press leaves the `default-hover` fill on the clear button,
  // while under pointer the same hover paints it. `app.hover` is
  // desktop/web-only — the row lives in autocomplete.mobile.web.test.tsx.

  // adapt-sheets/autocomplete.md M-003 (A-001): injected `density="compact"`
  // tightens the spacing cells. Heights cannot show it — the SearchField
  // group's `h-9` and the trigger's `min-h-9` are fixed — so the assertion
  // reads the y offsets the moved cells feed: `popover pt-2`→`pt-1.5` and
  // `searchField py-1`→`py-0.5` lift the group's `onLayout` y inside the
  // scroll content, `base gap-1`→`gap-0.5` lifts the trigger's. Compact's
  // offsets shrink against the `default` half, which keeps shipped values.
  test("M-003 compact density tightens search row and trigger", async () => {
    const standard = await openMobile("m");
    await standard.press(TRIGGER);
    await standard.waitFor("role:option");
    await standard.waitUntil(() =>
      callsOf(standard, "layout").some((c) => (c[0] as LayoutEntry).name === "search-group"),
    );

    // Native single-host rule: the second `open()` retargets the host, so
    // the standard app's boxes are read before the compact app exists.
    const standardSearchY = layoutFor(standard, "search-group").y;
    const standardTriggerY = layoutFor(standard, "trigger").y;

    const compact = await openMobile("m", { density: "compact" });
    await compact.press(TRIGGER);
    await compact.waitFor("role:option");
    await compact.waitUntil(() =>
      callsOf(compact, "layout").some((c) => (c[0] as LayoutEntry).name === "search-group"),
    );

    const searchDelta = standardSearchY - layoutFor(compact, "search-group").y;
    const triggerDelta = standardTriggerY - layoutFor(compact, "trigger").y;
    expect(Math.max(searchDelta, triggerDelta)).toBeGreaterThanOrEqual(2);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-004 (A-002): under touch neither a hover
  // nor a press raises `isHovered`; the host `onMouseEnter`/`onMouseLeave`
  // callbacks still forward, and under pointer the hover round-trips as on
  // desktop. `app.hover` is desktop/web-only — the row lives in
  // autocomplete.mobile.web.test.tsx.

  // adapt-sheets/autocomplete.md M-005 (A-003, A-004, 负断言): under the
  // default pointer environment the touch-gated seam is inert — `enabled`
  // is false, no `isPressed` edge, `hitSlop` / `pressOrigin` never record,
  // `scale` stays 1 — while the clear chain itself works verbatim: one
  // `clear` and one `change`, and the value returns to the placeholder.
  test("M-005 default environment: seam inert while clear works verbatim", async () => {
    const app = await openMobile("m");

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(false);
    await app.waitUntil(() => states(app).length > 0);
    for (const s of states(app)) {
      expect(s.hitSlop).toBeNull();
      expect(s.origin).toBeNull();
      expect(s.scale).toBe(1);
    }

    await app.press(CLEAR);
    await app.waitUntil(() => callsOf(app, "clear").length === 1);

    expect(callsOf(app, "clear")).toEqual([[]]);
    expect(callsOf(app, "change")).toEqual([[null]]);
    expect(app.shows(`${TRIGGER} >> text:Select an animal`)).toBe(true);

    // No seam edge ever reported true; the channels sample the resting gate.
    expect(
      callsOf(app, "ctx-pressed").every((c) => (c[0] as { seam: boolean }).seam === false),
    ).toBe(true);
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxState>(app, "ctx-channels");
    expect(channels.enabled).toBe(false);
    expect(channels.seamPressed).toBe(false);
    expect(channels.hitSlop).toBeNull();
    expect(channels.origin).toBeNull();
    expect(channels.scale).toBe(1);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-006 (A-003, A-004): injected touch — the
  // seam engages: `enabled` is true, a non-null `hitSlop` of ≈12pt per side
  // expands the 20pt `size-5` box toward the 44pt target, `isPressed`
  // round-trips (the poll sampler carries the held half on targets that
  // batch the edge into one tick), and the clear chain reports one
  // `clear` + one `change` with the value back on the placeholder.
  test("M-006 injected touch: seam engages, hitSlop expands, clear round-trips", async () => {
    const app = await openMobile("m", { input: "touch" });

    expect(lastOf<CtxEnv>(app, "ctx-env").enabled).toBe(true);
    await app.waitUntil(() => states(app).some((s) => s.hitSlop !== null));
    const slop = states(app).filter((s) => s.hitSlop !== null).at(-1)!.hitSlop!;
    // `size-5` is 20pt: (44 − 20) / 2 = 12pt a side.
    for (const side of [slop.top, slop.right, slop.bottom, slop.left]) {
      expect(side).toBeGreaterThanOrEqual(10);
    }

    await app.press(CLEAR);
    await app.waitUntil(() => callsOf(app, "clear").length === 1);

    expect(callsOf(app, "clear")).toEqual([[]]);
    expect(callsOf(app, "change")).toEqual([[null]]);
    expect(app.shows(`${TRIGGER} >> text:Select an animal`)).toBe(true);

    // The press round-tripped through the seam: post-press settle reads
    // `seamPressed` back to false and `pressOrigin` cleared.
    await app.press("id:ctx-sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);
    const channels = lastOf<CtxState>(app, "ctx-channels");
    expect(channels.enabled).toBe(false); // cleared selection ⇒ isEmpty gate off
    expect(channels.seamPressed).toBe(false);
    expect(channels.origin).toBeNull();
  }, 120_000);

  // adapt-sheets/autocomplete.md M-007 (A-003): the gate's `!isEmpty()` /
  // `!isDisabled()` halves — an empty selection (`m-empty`) and a disabled
  // field both report `enabled: false` and a `hitSlop` that never computes,
  // under the injected touch environment where the base gate would open.
  test("M-007 injected touch: empty and disabled gates stay closed", async () => {
    const empty = await openMobile("m-empty", { input: "touch" });
    expect(lastOf<CtxEnv>(empty, "ctx-env").enabled).toBe(false);
    await empty.waitUntil(() => states(empty).length > 0);
    for (const s of states(empty)) {
      expect(s.hitSlop).toBeNull();
    }

    const disabled = await openMobile("m", { input: "touch", disabled: "1" });
    expect(disabled.enabled(CLEAR)).toBe(false);
    await expect(disabled.press(CLEAR)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    await disabled.press("id:ctx-sample");
    await disabled.waitUntil(() => callsOf(disabled, "ctx-channels").length > 0);
    const channels = lastOf<CtxState>(disabled, "ctx-channels");
    expect(channels.enabled).toBe(false);
    expect(channels.hitSlop).toBeNull();
    expect(channels.seamPressed).toBe(false);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-008 (A-005): the `presentation` prop's
  // three values plus its absent default all mount and resolve — `auto` /
  // `panel` / unset mount the panel carrier (`id:ac-pop`), `sheet` mounts
  // `id:ac-pop-sheet` — and the narrowed domain type-checks.
  test("M-008 presentation auto/panel/sheet/unset all mount", async () => {
    for (const [params, carrier] of [
      [{}, "id:ac-pop"],
      [{ presentation: "auto" }, "id:ac-pop"],
      [{ presentation: "panel" }, "id:ac-pop"],
      [{ presentation: "sheet" }, "id:ac-pop-sheet"],
    ] as [Params, string][]) {
      const app = await openMobile("m", params);
      await app.press(TRIGGER);
      await app.waitFor("role:option");
      expect(app.count(carrier)).toBe(1);
    }
  }, 120_000);

  // adapt-sheets/autocomplete.md M-009 (A-006, A-007): under the default
  // pointer environment `auto` mounts the panel carrier — `id:ac-pop`
  // present, `id:ac-pop-sheet` absent — with the SearchField, the ListBox
  // and the ItemIndicator showing and `onOpenChange(true)` recorded once.
  // Desktop zero drift.
  test("M-009 default environment opens the panel carrier", async () => {
    const app = await openMobile("m");

    expect(app.count("id:ac-pop")).toBe(0);
    expect(app.count("id:ac-pop-sheet")).toBe(0);

    await app.press(TRIGGER);
    await app.waitFor("role:listbox");

    expect(app.count("id:ac-pop")).toBe(1);
    expect(app.count("id:ac-pop-sheet")).toBe(0);
    expect(app.shows(SEARCH)).toBe(true);
    expect(app.count("role:option")).toBe(3);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-010 (A-006, A-008): injected touch +
  // compact resolves `auto` to the sheet carrier — `id:ac-pop-sheet`
  // present, `id:ac-pop` absent — and the content contract holds on the new
  // carrier: the SearchField, the three options and their indicators read
  // exactly as on the panel, with `onOpenChange(true)` once.
  test("M-010 touch+compact auto presents the sheet carrier with the same content", async () => {
    const app = await openMobile("m", TOUCH_COMPACT);

    await app.press(TRIGGER);
    await app.waitFor("role:option");

    expect(app.count("id:ac-pop-sheet")).toBe(1);
    expect(app.count("id:ac-pop")).toBe(0);
    expect(app.shows(SEARCH)).toBe(true);
    expect(app.count("role:option")).toBe(3);
    expect(app.shows("role:option[Dog]")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-011 (A-005, A-006): an explicit pin wins
  // over the auto rule in both directions — `presentation="sheet"` mounts
  // the Sheet carrier under the pointer environment, `presentation="panel"`
  // keeps the anchored overlay under injected touch+compact.
  test("M-011 explicit presentation pins beat the auto rule on both environments", async () => {
    const pinnedSheet = await openMobile("m-pin-sheet");
    await pinnedSheet.press(TRIGGER);
    await pinnedSheet.waitFor("role:option");
    expect(pinnedSheet.count("id:ac-pop-sheet")).toBe(1);
    expect(pinnedSheet.count("id:ac-pop")).toBe(0);

    const pinnedPanel = await openMobile("m-pin-panel", TOUCH_COMPACT);
    await pinnedPanel.press(TRIGGER);
    await pinnedPanel.waitFor("role:option");
    expect(pinnedPanel.count("id:ac-pop")).toBe(1);
    expect(pinnedPanel.count("id:ac-pop-sheet")).toBe(0);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-012 (A-008): the sheet carrier's content
  // contract — type filters the collection (`inputChange` records, options
  // 3 → 1), a press on the row reports one `change` and one
  // `openChange(false)`, the trigger shows the picked text (the subtree
  // stays mounted through the close — `selectedItems` / `findItem` depend
  // on it, the `everOpened` twin), and a reopen shows the full collection
  // again (the text reset survives).
  test("M-012 sheet carrier: filter, pick, retained subtree, reopen reset", async () => {
    // `acap:"none"`: iOS applies UITextInput autocapitalization even to
    // synthesized key events, which would turn "do" into "Do".
    const app = await openMobile("m", { ...TOUCH_COMPACT, acap: "none" });
    const android = hostOs(app) === "android";

    await app.press(TRIGGER);
    await app.waitFor("role:option");
    expect(app.count("id:ac-pop-sheet")).toBe(1);

    // A slow host's input can register later than the option rows.
    await app.waitFor(SEARCH);
    await app.type(SEARCH, "do");
    await app.waitUntil(() => app.count("role:option") === 1);
    expect(callsOf(app, "inputChange")).toEqual([["d"], ["do"]]);

    // Android: overlay rows lack native views — the pick goes through the
    // input chain (M-015); other hosts press the row.
    if (android) {
      await app.wait(100);
      await app.submit(SEARCH);
    } else {
      await app.press("role:option[Dog]");
    }
    await app.waitUntil(() => callsOf(app, "change").length === 1);
    await app.waitUntil(() => callsOf(app, "openChange").length === 2);

    expect(callsOf(app, "change")).toEqual([["dog"]]);
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
    await app.waitUntil(() => app.shows(`${TRIGGER} >> text:Dog`));

    // The carrier leaves the shown tree — the Sheet backdrop drops it as the
    // panel's `hidden` does, while the subtree's retention is what the
    // trigger's `text:Dog` read above and the full reopen below prove.
    await app.waitUntil(() => !app.shows("role:option"));

    await app.press(TRIGGER);
    await app.waitFor("role:option");
    expect(app.count("id:ac-pop-sheet")).toBe(1);
    expect(app.count("id:ac-pop")).toBe(0);
    expect(app.count("role:option")).toBe(3);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-013 (A-008): sheet-mode close channels —
  // Escape reaches the backdrop's `closesOnEscape` → `SheetRoot.onOpenChange`
  // → the field's `close()`, and `isKeyboardDismissDisabled` gates it on
  // the sheet carrier exactly as `handleCancel` gates it on the panel chain
  // (popover M-901 the same regression pin). A trigger press still closes.
  test("M-013 sheet carrier: Escape closes, kbDismiss blocks it, trigger still toggles", async () => {
    const sheet = await openMobile("m-pin-sheet");
    await sheet.press(TRIGGER);
    await sheet.waitFor("role:option");

    await sheet.keyboard.press("escape");
    await sheet.waitUntil(() => callsOf(sheet, "openChange").length === 2);
    expect(callsOf(sheet, "openChange")).toEqual([[true], [false]]);
    expect(sheet.shows("role:option")).toBe(false);

    const kb = await openMobile("m-kbdismiss");
    await kb.press(TRIGGER);
    await kb.waitFor("role:option");
    expect(kb.count("id:ac-pop-sheet")).toBe(1);

    await kb.keyboard.press("escape");
    await kb.wait(150);
    expect(callsOf(kb, "openChange")).toEqual([[true]]);
    expect(kb.shows("role:option")).toBe(true);

    // The trigger's own toggle still closes the gated sheet.
    await kb.press(TRIGGER);
    await kb.waitUntil(() => callsOf(kb, "openChange").length === 2);
    expect(callsOf(kb, "openChange")).toEqual([[true], [false]]);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-014 (A-006): `isNonModal` folds into the
  // pin — a non-modal overlay has no sheet semantics, so touch+compact
  // still mounts the panel carrier under `auto` (the conservative ruling
  // the sheet's §6 margin note records, popover M-007 the same).
  test("M-014 isNonModal suppresses auto sheet resolution", async () => {
    const app = await openMobile("m-nonmodal", TOUCH_COMPACT);

    await app.press(TRIGGER);
    await app.waitFor("role:option");

    expect(app.count("id:ac-pop")).toBe(1);
    expect(app.count("id:ac-pop-sheet")).toBe(0);
    expect(app.shows("role:option")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  }, 120_000);

  // adapt-sheets/autocomplete.md M-015 (A-009): the G input chain, identical
  // on both environments — typing reports `inputChange` and narrows the
  // collection (the caller's `contains`), `app.submit` commits the
  // highlighted option as a row press would (`change` once,
  // `openChange(false)`, trigger shows the text), and reopening shows the
  // full collection (the close-resets-text chain).
  test("M-015 input chain: type narrows, submit commits highlighted, reopen resets", async () => {
    // `acap:"none"` as M-012: literal typing, no iOS autocapitalization.
    for (const params of [
      { acap: "none" } as Params,
      { ...TOUCH_COMPACT, acap: "none" },
    ]) {
      const app = await openMobile("m", params);

      await app.press(TRIGGER);
      await app.waitFor("role:option");
      expect(app.count("role:option")).toBe(3);

      await app.waitFor(SEARCH);
      await app.type(SEARCH, "do");
      await app.waitUntil(() => app.count("role:option") === 1);
      expect(callsOf(app, "inputChange")).toEqual([["d"], ["do"]]);

      // The first surviving option takes the virtual focus, then Return
      // commits it — the `manager.select` path a row press shares.
      await app.wait(100);
      await app.submit(SEARCH);
      await app.waitUntil(() => callsOf(app, "change").length === 1);

      expect(callsOf(app, "change")).toEqual([["dog"]]);
      expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
      await app.waitUntil(() => app.shows(`${TRIGGER} >> text:Dog`));

      await app.press(TRIGGER);
      await app.waitFor("role:option");
      expect(app.count("role:option")).toBe(3);
      expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);
    }
  }, 120_000);

  // adapt-sheets/autocomplete.md M-018 (A-013, A-014): the fixture machinery
  // itself — every probe channel records — rides `app.hover` to exercise the
  // hover channel, which is desktop/web-only; the row lives in
  // autocomplete.mobile.web.test.tsx.

  // adapt-sheets/autocomplete.md M-019 (基线): the default environment keeps
  // the desktop contract item for item — a trigger press opens the lazy
  // popover (nothing before the first open), `expanded` maps through the
  // probe-visible open channel, typing filters, a row press closes and
  // reports `change` once, `onClear` empties, the placeholder returns, and
  // `shouldMountPopover` keeps the subtree mounted (hidden) after the first
  // close. The untouched `autocomplete.heroui.*` / `kobalte.*` suites pin
  // the rest; this row samples through the fixture's own probes.
  test("M-019 default environment baseline: lazy mount, toggle, filter, select, clear", async () => {
    const app = await openMobile("m-empty", { acap: "none" });

    // Before the first open the popover subtree is out of the tree; the
    // field shows only the trigger and its placeholder.
    expect(app.count("id:ac-pop")).toBe(0);
    expect(app.count("role:listbox")).toBe(0);
    expect(app.shows(`${TRIGGER} >> text:Select an animal`)).toBe(true);

    // First open: toggle mounts the subtree and records exactly one edge.
    await app.press(TRIGGER);
    await app.waitFor("role:listbox");
    expect(app.count("role:option")).toBe(3);
    expect(callsOf(app, "openChange")).toEqual([[true]]);

    // The filter narrows; Escape closes through the field's own chain.
    await app.type(SEARCH, "ca");
    await app.waitUntil(() => app.count("role:option") === 1);
    await app.keyboard.press("escape");
    await app.waitUntil(() => callsOf(app, "openChange").length === 2);

    // The 100ms exit hold keeps the carrier mounted (count 1, still shown);
    // once the clock passes it the layer goes `hidden`, which the probe set
    // reads as gone — the mounted-but-hidden subtree is what the reset
    // reopen below proves.
    expect(app.count("id:ac-pop")).toBe(1);
    await app.clock!.runFor(120);
    expect(app.count("id:ac-pop")).toBe(0);
    expect(app.shows("role:option")).toBe(false);

    // Reopen shows the full collection (text reset), then a row press
    // selects and closes.
    await app.press(TRIGGER);
    await app.waitFor("role:option");
    expect(app.count("role:option")).toBe(3);

    // Android: overlay rows lack native views even on a first
    // presentation — pick + clear rerun through the input chain.
    if (hostOs(app) === "android") {
      const pick = await openMobile("m-empty", { acap: "none" });
      await pick.press(TRIGGER);
      await pick.waitFor("role:option");
      await pick.type(SEARCH, "ca");
      await pick.waitUntil(() => pick.count("role:option") === 1);
      await pick.wait(100);
      await pick.submit(SEARCH);
      await pick.waitUntil(() => callsOf(pick, "change").length === 1);
      expect(callsOf(pick, "change")).toEqual([["cat"]]);
      expect(callsOf(pick, "selectionChange")).toEqual([["cat"]]);
      await pick.waitUntil(() => pick.shows(`${TRIGGER} >> text:Cat`));

      await pick.press(CLEAR);
      await pick.waitUntil(() => callsOf(pick, "clear").length === 1);
      expect(callsOf(pick, "clear")).toEqual([[]]);
      expect(pick.shows(`${TRIGGER} >> text:Select an animal`)).toBe(true);
    } else {
      await app.press("role:option[Cat]");
      await app.waitUntil(() => callsOf(app, "change").length === 1);
      expect(callsOf(app, "change")).toEqual([["cat"]]);
      expect(callsOf(app, "selectionChange")).toEqual([["cat"]]);
      await app.waitUntil(() => app.shows(`${TRIGGER} >> text:Cat`));

      // The clear button empties once, the placeholder returns.
      await app.press(CLEAR);
      await app.waitUntil(() => callsOf(app, "clear").length === 1);
      expect(callsOf(app, "clear")).toEqual([[]]);
      expect(app.shows(`${TRIGGER} >> text:Select an animal`)).toBe(true);
    }
  }, 120_000);
});
