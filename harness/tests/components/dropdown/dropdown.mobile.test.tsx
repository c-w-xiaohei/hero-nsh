import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { dropdownVariants } from "../../../../src/components/dropdown/dropdown.styles";

/*
 * Mobile assertions for the dropdown adapt unit, one test per row of
 * adapt-sheets/dropdown.md §4: M-001…M-005, M-007 (observable halves),
 * M-009, M-011, M-014…M-017 here (ios + android); M-013 and the M-015
 * contextMenu half live in `dropdown.mobile.web.test.tsx` because
 * `app.hover`/`app.rightClick` are desktop/web-only; M-006, M-008, M-010 and
 * M-012 live in `dropdown.mobile.headless.test.tsx` because they need
 * `open({platform:"ios"})` or `app.drag`.
 *
 * The fixture is `harness/dropdown.fixtures.tsx`: `case:"mobile"` is the
 * parameterized trigger + popover + three-row menu, `case:"mobile-submenu"`
 * adds the `dd-sub` submenu layer, `context-menu`/`standalone`/
 * `no-close-on-select` feed the baseline sample. `host.params.input`/
 * `width`/`density` feed the fixture's `EnvironmentScope`; `presentation`/
 * `nonmodal`/`narrow`/`kbDismiss`/`retained`/`disabled`/`pending`/`items`/
 * `hide`/`select`/`skip`/`open` parameterize the parts. The carrier probes
 * are the derived testIDs — `id:dd-pop-panel` / `id:dd-pop-sheet` /
 * `id:dd-sub-panel` / `id:dd-sub-sheet`.
 *
 * `hitSlop` itself has no `nsh/test` readout (sheet §6 host gap): the
 * assertions read the seam's own `ctx`/`ctx-channels` accessors plus the
 * trigger child's `onLayout` box; the real hit expansion is real-device
 * acceptance.
 */

type Params = Record<string, string>;

// The default environment is pointer at regular width — the desktop-parity
// half of every row that does not inject, injected through `EnvironmentScope`
// params because `open()` platform/width/height options are rejected on
// ios/android (the old `platform:"windows"` pin's role, per _common's test
// facts). Rows needing `app.hover`/`rightClick` live in
// dropdown.mobile.web.test.tsx.
function openMobile(
  caseName: string,
  params: Params = {},
): Promise<App> {
  return open("../../../dropdown.fixtures.tsx", {
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

/** The `events` probe payloads as `{ev, seam}` records. */
function eventsOf(app: App) {
  return callsOf(app, "events").map(
    (args) => args[0] as { ev: string; seam: boolean | null },
  );
}

/** The press chain out of `events`: web `app.press` also synthesizes the DOM
 * mouse/hover events the trigger forwards verbatim, so order assertions read
 * this press-family subsequence rather than the raw prefix (combo-box M-002). */
function pressEventsOf(app: App) {
  return eventsOf(app).filter(
    (entry) => entry.ev === "down" || entry.ev === "up" || entry.ev === "press",
  );
}

/** The last `pan`/`ctx`/`ctx-channels` probe payload. */
function lastProbe(app: App, name: string) {
  const found = callsOf(app, name).map((args) => args[0] as Record<string, unknown> | undefined);
  return found.at(-1);
}

describe("dropdown mobile", () => {
  // adapt-sheets/dropdown.md M-001 (A-004, A-012): the default pointer
  // environment mounts the panel carrier — `dd-pop-panel` present,
  // `dd-pop-sheet` absent — with `role:menu` and the row texts showing and
  // `onOpenChange(true)` recorded once. Desktop zero drift.
  test("M-001 default environment opens the panel carrier", async () => {
    const app = await openMobile("mobile");

    await app.press("id:dd-trigger");

    expect(app.count("id:dd-pop-panel")).toBe(1);
    expect(app.count("id:dd-pop-sheet")).toBe(0);
    expect(app.shows("role:menu")).toBe(true);
    expect(app.shows("text:New file")).toBe(true);
    expect(app.shows("text:Copy link")).toBe(true);
    expect(app.shows("text:Delete file")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/dropdown.md M-002 (A-005, A-006, 负断言): under the default
  // pointer environment the press/open chain is verbatim and no touch-only
  // artifact appears — `down`/`up`/`press` in order with `seam` null on the
  // event reads (the seam's context mounts but is gated, so `triggerCtx`
  // resolves only after mount: the first reads may be null, none may be
  // true), the `ctx`/`ctx-channels` samples all at rest, and the pinned
  // sheet carrier's `pan` probe reports zero handler keys — no gesture path
  // exists under pointer. Web `app.press` also records the verbatim DOM
  // mouse/hover forwarding, so the order assertion reads the press-family
  // subsequence.
  test("M-002 default environment has no touch-only surface", async () => {
    const app = await openMobile("mobile");

    await app.press("id:dd-trigger");
    expect(app.count("id:dd-pop-panel")).toBe(1);

    await app.host.send("ctx.sample");
    await app.waitUntil(() => callsOf(app, "ctx-channels").length > 0);

    const sample = lastProbe(app, "ctx-channels");
    expect(sample?.seamPressed).toBe(false);
    expect(sample?.pressed).toBe(0);
    expect(sample?.scale).toBe(1);
    expect(sample?.origin).toBe(null);
    expect(sample?.hitSlop).toBe(null);
    expect(sample?.enabled).toBe(false);

    const presses = pressEventsOf(app);
    expect(presses.map((entry) => entry.ev)).toEqual(["down", "up", "press"]);
    expect(eventsOf(app).every((entry) => entry.seam !== true)).toBe(true);

    // The pinned sheet under pointer: `SheetDialog`'s content pan attaches
    // no listeners (`panHandlers()` resolves `{}`), the paired scrollProps
    // carry no keys either.
    const sheet = await openMobile("mobile", { presentation: "sheet" });
    await sheet.press("id:dd-trigger");
    expect(sheet.count("id:dd-pop-sheet")).toBe(1);
    const pan = lastProbe(sheet, "pan");
    expect(pan?.panKeys).toBe(0);
    expect(pan?.scrollKeys).toBe(0);
  });

  // adapt-sheets/dropdown.md M-003 (A-003, A-005): injected touch + compact
  // resolves `auto` to the sheet carrier — `dd-pop-sheet` present,
  // `dd-pop-panel` absent — with the menu, its rows and the selection
  // indicator all reachable, and `onOpenChange(true)` recorded once.
  test("M-003 injected touch+compact presents the sheet carrier", async () => {
    const app = await openMobile("mobile", {
      input: "touch",
      width: "compact",
      select: "1",
    });

    await app.press("id:dd-trigger");

    expect(app.count("id:dd-pop-sheet")).toBe(1);
    expect(app.count("id:dd-pop-panel")).toBe(0);
    expect(app.shows("role:menu")).toBe(true);
    expect(app.shows("text:New file")).toBe(true);
    // `select:"1"` mounts the single-selection menu with `copy-link`
    // pre-selected — the `✓` the indicator's render prop writes.
    expect(app.count("text:✓")).toBe(1);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/dropdown.md M-004 (A-002, A-005): an explicit pin wins over
  // the auto rule in both directions — `presentation="sheet"` mounts the
  // Sheet carrier even under pointer, `presentation="panel"` keeps the
  // anchored overlay under injected touch+compact where auto would pick
  // sheet.
  test("M-004 explicit presentation pin beats the auto rule on both environments", async () => {
    const pinnedSheet = await openMobile("mobile", { presentation: "sheet" });
    await pinnedSheet.press("id:dd-trigger");
    expect(pinnedSheet.count("id:dd-pop-sheet")).toBe(1);
    expect(pinnedSheet.count("id:dd-pop-panel")).toBe(0);
    expect(pinnedSheet.shows("text:New file")).toBe(true);

    const pinnedPanel = await openMobile("mobile", {
      presentation: "panel",
      input: "touch",
      width: "compact",
    });
    await pinnedPanel.press("id:dd-trigger");
    expect(pinnedPanel.count("id:dd-pop-panel")).toBe(1);
    expect(pinnedPanel.count("id:dd-pop-sheet")).toBe(0);
    expect(pinnedPanel.shows("text:New file")).toBe(true);
  });

  // adapt-sheets/dropdown.md M-005 (A-003): `isNonModal` suppresses the
  // sheet resolution under `auto` — a non-modal popover has no sheet
  // semantics (upstream's bottom-sheet is always modal), so injected
  // touch+compact still mounts the panel carrier.
  test("M-005 isNonModal suppresses auto sheet resolution", async () => {
    const app = await openMobile("mobile", {
      nonmodal: "1",
      input: "touch",
      width: "compact",
    });

    await app.press("id:dd-trigger");

    expect(app.count("id:dd-pop-panel")).toBe(1);
    expect(app.count("id:dd-pop-sheet")).toBe(0);
    expect(app.shows("role:menu")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/dropdown.md M-007 (A-005), the scope-injectable half:
  // a row press under the default `shouldCloseOnSelect` closes the layer
  // and fires `onAction` once, `no-close-on-select` keeps it open, Escape
  // closes through `SheetBackdrop`'s channel on the sheet carrier, and
  // `isKeyboardDismissDisabled` blocks Escape on both carriers. The
  // backdrop/outside-press and back-button halves run headless-only.
  test("M-007 close semantics: row select, escape and the dismiss gate on both carriers", async () => {
    // Panel carrier, default environment: a row select closes once.
    const panel = await openMobile("mobile");
    await panel.press("id:dd-trigger");
    await panel.press("text:Copy link");
    await panel.clock!.runFor(150);
    expect(callsOf(panel, "onAction")).toEqual([["copy-link"]]);
    expect(callsOf(panel, "openChange")).toEqual([[true], [false]]);
    expect(panel.shows("role:menu")).toBe(false);

    // no-close-on-select keeps the layer open after the action.
    const keep = await openMobile("no-close-on-select");
    await keep.press("id:dd-trigger");
    await keep.press("text:Copy link");
    await keep.clock!.runFor(150);
    expect(callsOf(keep, "onAction")).toEqual([["copy-link"]]);
    expect(keep.shows("role:menu")).toBe(true);
    expect(callsOf(keep, "openChange")).toEqual([[true]]);

    // Sheet carrier: Escape reaches `SheetRoot.onOpenChange(false)` → the
    // popover's `close()` — the same write path the underlay takes.
    const sheet = await openMobile("mobile", {
      input: "touch",
      width: "compact",
    });
    await sheet.press("id:dd-trigger");
    expect(sheet.count("id:dd-pop-sheet")).toBe(1);
    await sheet.keyboard.press("escape");
    await sheet.clock!.runFor(150);
    expect(callsOf(sheet, "openChange")).toEqual([[true], [false]]);
    expect(sheet.shows("role:menu")).toBe(false);

    // The contract prop gates Escape on both carriers.
    const kbPanel = await openMobile("mobile", { kbDismiss: "1" });
    await kbPanel.press("id:dd-trigger");
    await kbPanel.keyboard.press("escape");
    await kbPanel.clock!.runFor(150);
    expect(kbPanel.shows("role:menu")).toBe(true);
    expect(callsOf(kbPanel, "openChange")).toEqual([[true]]);

    const kbSheet = await openMobile("mobile", {
      kbDismiss: "1",
      input: "touch",
      width: "compact",
    });
    await kbSheet.press("id:dd-trigger");
    expect(kbSheet.count("id:dd-pop-sheet")).toBe(1);
    await kbSheet.keyboard.press("escape");
    await kbSheet.clock!.runFor(150);
    expect(kbSheet.count("id:dd-pop-sheet")).toBe(1);
    expect(callsOf(kbSheet, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/dropdown.md M-009 (A-003, A-011): the submenu layer is
  // always a panel — injected touch+compact plus a `"sheet"` pin still
  // mounts `dd-sub-panel` and never `dd-sub-sheet` (Native SubMenu has no
  // bottom-sheet form; the mismatch warning itself has no `nsh/test`
  // readout, sheet §6).
  test("M-009 submenu layer is forced to panel", async () => {
    const app = await openMobile("mobile-submenu", {
      input: "touch",
      width: "compact",
      presentation: "sheet",
    });

    await app.press("id:dd-trigger");
    expect(app.count("id:dd-pop-sheet")).toBe(1);

    // The submenu's `dd-sub-panel` mounts (hidden) even before the submenu
    // opens; the discriminator is that `dd-sub-sheet` never exists.
    expect(app.count("id:dd-sub-sheet")).toBe(0);
    expect(app.shows("text:Share")).toBe(true);

    await app.press("text:Share");
    expect(app.shows("text:Share to X")).toBe(true);
    expect(app.shows("text:sub-expanded")).toBe(true);
    expect(app.count("id:dd-sub-panel")).toBe(1);
    expect(app.count("id:dd-sub-sheet")).toBe(0);
  });

  // adapt-sheets/dropdown.md M-011 (A-006): injected touch — one press
  // opens exactly once, `down`→`up`→`press` in order, and the `seam` field
  // on the event reads is the full `true`→`false` round-trip
  // (`feedback.pressDown` runs before `onPressDown`, `feedback.pressUp`
  // before `onPressUp`, so each read samples the state at its own moment).
  // Web `app.press` records the verbatim mouse/hover forwarding around the
  // press chain and can land the `press` probe a frame after the step, so
  // the assertion waits for it and reads the press-family subsequence.
  // `narrow` reports a non-null `hitSlop` from the ctx probe; the standard
  // trigger reports none (`w-fit` already clears the 44 pt floor);
  // `disabled`/`pending` presses never reach the chain.
  test("M-011 injected touch drives the seam round-trip and hitSlop halves", async () => {
    const app = await openMobile("mobile", { input: "touch" });

    await app.press("id:dd-trigger");
    await app.waitUntil(() =>
      eventsOf(app).some((entry) => entry.ev === "press"),
    );

    expect(callsOf(app, "openChange")).toEqual([[true]]);
    const events = pressEventsOf(app);
    expect(events.map((entry) => entry.ev)).toEqual(["down", "up", "press"]);
    expect(events[0]?.seam).toBe(true);
    expect(events[1]?.seam).toBe(false);
    expect(events[2]?.seam).toBe(false);

    const ctx = lastProbe(app, "ctx");
    expect(ctx?.enabled).toBe(true);
    // Standard trigger child is min-h-11 p-3 — already ≥44 pt, so the
    // formula answers rest.
    expect(ctx?.hitSlop).toBe(null);

    const narrow = await openMobile("mobile", {
      narrow: "1",
      input: "touch",
    });
    const narrowCtx = lastProbe(narrow, "ctx");
    const slop = narrowCtx?.hitSlop as
      | { top?: number; right?: number; bottom?: number; left?: number }
      | null;
    expect(slop).not.toBe(null);
    expect(slop?.top).toBeGreaterThanOrEqual(0);
    expect(slop?.right).toBeGreaterThanOrEqual(0);
    expect(slop?.bottom).toBeGreaterThanOrEqual(0);
    expect(slop?.left).toBeGreaterThanOrEqual(0);

    const disabled = await openMobile("mobile", {
      disabled: "1",
      input: "touch",
    });
    await disabled.press("id:dd-trigger").catch(() => undefined);
    await disabled.clock!.runFor(50);
    expect(callsOf(disabled, "openChange")).toEqual([]);
    expect(pressEventsOf(disabled)).toEqual([]);
    expect(lastProbe(disabled, "ctx-pressed")?.seam).toBe(false);

    const pending = await openMobile("mobile", {
      pending: "1",
      input: "touch",
    });
    await pending.press("id:dd-trigger").catch(() => undefined);
    await pending.clock!.runFor(50);
    expect(callsOf(pending, "openChange")).toEqual([]);
    expect(pressEventsOf(pending)).toEqual([]);
  });

  // adapt-sheets/dropdown.md M-013 (A-007): injected touch silences the
  // hover chain — `isHovered` never paints, `hoverStart`/`hoverOn` never
  // fire — while the raw `mouseEnter`/`mouseLeave` callbacks still forward.
  // `app.hover` is desktop/web-only — the row (touch suppression + the
  // pointer round-trip) lives in dropdown.mobile.web.test.tsx.

  // adapt-sheets/dropdown.md M-014 (A-001): the `density` axis owns the
  // menu's spacing — `dropdownVariants` resolves `p-1.5 gap-0.5` at the
  // default and `p-1 gap-0` at `compact`, and the injected popover's
  // `onLayout` box shrinks with it. The verbatim half: under both axis
  // defaults the slot strings are exactly the pre-migration output.
  test("M-014 density axis moves the menu padding, defaults verbatim", async () => {
    const slots = dropdownVariants();
    expect(slots.menu()).toBe("outline-none p-1.5 gap-0.5");
    expect(
      dropdownVariants({ input: "pointer", density: "default" }).menu(),
    ).toBe("outline-none p-1.5 gap-0.5");
    expect(
      dropdownVariants({ input: "touch", density: "compact" }).menu(),
    ).toBe("outline-none p-1 gap-0");

    const baseline = await openMobile("mobile");
    await baseline.press("id:dd-trigger");
    const defaultBox = lastBox(baseline, "menu");

    const compact = await openMobile("mobile", { density: "compact" });
    await compact.press("id:dd-trigger");
    const compactBox = lastBox(compact, "menu");

    // `p-1.5 gap-0.5` → `p-1 gap-0` over three rows: the menu box shortens.
    expect(compactBox?.height).toBeLessThan(defaultBox?.height ?? 0);
  });

  // adapt-sheets/dropdown.md M-015 (A-008, A-014, 基线): the default
  // environment's pre-existing semantics, sampled on the mobile fixture —
  // trigger toggle round-trips through `onOpenChange`, Escape closes, the
  // modal underlay turns a covered trigger press into an outside close,
  // the non-modal chain keeps the trigger live, `ownsState` runs on a
  // standalone popover, `isExiting` retains the layer while
  // `shouldSkipAnimation` drops it. The `contextMenu` secondary-button
  // open is web-only (`app.rightClick`) and lives in
  // dropdown.mobile.web.test.tsx. Focus / aria-expanded / typeahead have
  // no `nsh/test` readout and stay with `dropdown.heroui.*` (sheet §6). The
  // covered-anchor press is host-specific below the close contract: web's
  // DOM underlay hit-tests and swallows it before the anchor handlers (the
  // verbatim mouse/hover forwarding still records), while headless routes
  // it through them — the dual-target assertion keeps the two unobstructed
  // open presses and the close outcome, not that host's event chain.
  test("M-015 baseline sample on the default environment", async () => {
    const app = await openMobile("mobile");

    await app.press("id:dd-trigger");
    expect(callsOf(app, "openChange")).toEqual([[true]]);

    await app.keyboard.press("escape");
    await app.clock!.runFor(150);
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
    expect(app.shows("role:menu")).toBe(false);

    // Reopen, then press the trigger the modal underlay covers. The close
    // contract is host-independent — the underlay's outside-press channel
    // wins one `onOpenChange(false)` and the layer stays closed. Whether the
    // covered anchor's own press handlers also run is a host hit-test
    // detail (headless routes the press through them; web's DOM underlay
    // swallows it before `down`/`up`/`press`), so the press-chain assertion
    // keeps only the two unobstructed opens both hosts produce.
    await app.press("id:dd-trigger");
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);
    await app.press("id:dd-trigger");
    await app.clock!.runFor(150);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true], [false]]);
    expect(app.shows("role:menu")).toBe(false);
    const modalPresses = pressEventsOf(app);
    expect(modalPresses.slice(0, 6).map((entry) => entry.ev)).toEqual([
      "down", "up", "press", "down", "up", "press",
    ]);

    // Non-modal: no underlay, so the same covered-position press toggles
    // closed through the trigger's own chain on both hosts.
    const nonModal = await openMobile("mobile", { nonmodal: "1" });
    await nonModal.press("id:dd-trigger");
    await nonModal.press("id:dd-trigger");
    await nonModal.clock!.runFor(150);
    expect(callsOf(nonModal, "openChange")).toEqual([[true], [false]]);
    expect(pressEventsOf(nonModal).map((entry) => entry.ev)).toEqual([
      "down", "up", "press", "down", "up", "press",
    ]);

    // ownsState: a standalone popover keeps its own channel.
    const standalone = await openMobile("standalone");
    expect(standalone.shows("role:menu")).toBe(true);
    expect(standalone.count("id:dd-pop-panel")).toBe(1);
    await standalone.keyboard.press("escape");
    expect(callsOf(standalone, "openChange")).toEqual([[false]]);

    // Retained vs skipped exit.
    const retained = await openMobile("mobile", { open: "1", retained: "1" });
    await retained.host.send("dropdown.close");
    await retained.clock!.runFor(150);
    expect(retained.shows("text:New file")).toBe(true);

    const skip = await openMobile("mobile", { open: "1", skip: "1" });
    await skip.host.send("dropdown.close");
    await skip.clock!.runFor(20);
    expect(skip.shows("text:New file")).toBe(false);

    // The `contextMenu` trigger's secondary-button open lives in
    // dropdown.mobile.web.test.tsx — `app.rightClick` is desktop/web-only.
  }, 120_000);

  // adapt-sheets/dropdown.md M-016 (A-009): the F-consumption regression —
  // the `items` data path and the static path behave identically on both
  // environments: `onAction`/`onSelectionChange` payloads, a row appended
  // under the live collection, and a `hide`-gated unmounted row. The
  // registry's own assertions live in `menu.mobile.*`; this row only proves
  // the dropdown wrappers stay transparent. 4 opens × the ~5s native host
  // relaunch each — over the 30s default.
  test("M-016 items data path matches the static path on both environments", async () => {
    const envs: Params[] = [{}, { input: "touch", width: "compact" }];

    for (const params of envs) {
      const injected = "input" in params;
      const carrier = injected ? "id:dd-pop-sheet" : "id:dd-pop-panel";

      const data = await openMobile("mobile", { ...params, items: "1" });
      await data.press("id:dd-trigger");
      expect(data.count(carrier)).toBe(1);
      await data.press("text:Copy link");
      await data.clock!.runFor(150);
      expect(callsOf(data, "onAction")).toEqual([["copy-link"]]);

      // The orphan row: appended through the reactive `items` list while
      // the layer is closed, it mounts and acts like a data row.
      await data.host.send("dropdown.reopen");
      await data.host.send("dropdown.addRow");
      await data.clock!.runFor(50);
      expect(data.shows("text:Orphan row")).toBe(true);
      await data.press("text:Orphan row");
      await data.clock!.runFor(150);
      expect(callsOf(data, "onAction").at(-1)).toEqual(["orphan"]);

      const static_ = await openMobile("mobile", { ...params, hide: "new-file" });
      await static_.press("id:dd-trigger");
      expect(static_.shows("text:New file")).toBe(false);
      expect(static_.shows("text:Copy link")).toBe(true);
      await static_.press("text:Delete file");
      await static_.clock!.runFor(150);
      expect(callsOf(static_, "onAction")).toEqual([["delete-file"]]);
    }
  }, 120_000);

  // adapt-sheets/dropdown.md M-017 (A-011…A-013): the fixture machinery
  // itself — `Scoped` injection reaches `EnvironmentScope` (touch+compact
  // resolves the sheet carrier with no platform change), every case param
  // mounts, and the `ctx`/`pan`/`layout`/`events` probes all answer.
  test("M-017 fixture params, case params and probes all mount and discriminate", async () => {
    const baseline = await openMobile("mobile");
    expect(baseline.shows("id:dd-trigger")).toBe(true);
    expect(lastBox(baseline, "trigger-box")?.height).toBeGreaterThanOrEqual(44);

    const injected = await openMobile("mobile", { input: "touch", width: "compact" });
    await injected.press("id:dd-trigger");
    expect(injected.count("id:dd-pop-sheet")).toBe(1);
    expect(injected.count("id:dd-pop-panel")).toBe(0);
    expect(lastProbe(injected, "pan")?.panKeys).toBeGreaterThanOrEqual(0);

    const pinned = await openMobile("mobile", { presentation: "sheet" });
    await pinned.press("id:dd-trigger");
    expect(pinned.count("id:dd-pop-sheet")).toBe(1);

    const nonModal = await openMobile("mobile", {
      nonmodal: "1",
      input: "touch",
      width: "compact",
    });
    await nonModal.press("id:dd-trigger");
    expect(nonModal.count("id:dd-pop-panel")).toBe(1);

    const submenu = await openMobile("mobile-submenu", { input: "touch", width: "compact" });
    await submenu.press("id:dd-trigger");
    expect(submenu.count("id:dd-pop-sheet")).toBe(1);
    expect(submenu.count("id:dd-sub-panel")).toBeGreaterThanOrEqual(0);
    expect(submenu.count("id:dd-sub-sheet")).toBe(0);
  });
});
