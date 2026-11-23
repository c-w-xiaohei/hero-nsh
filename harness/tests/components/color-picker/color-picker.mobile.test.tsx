import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { calls, callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the color-picker adapt unit, one test per row of
 * adapt-sheets/color-picker.md §4: M-001, M-002, M-003, M-005, M-007, M-008,
 * M-009 and M-010 here (native phones + headless + web); M-004 and M-006
 * live in `color-picker.mobile.headless.test.tsx` because they open
 * `platform: "ios"`, which `--target web` rejects, and M-009's Trigger
 * hover chain lives in `color-picker.mobile.web.test.tsx` (`app.hover` is
 * desktop/web only — a phone has no mouse).
 *
 * The fixture is `harness/color-picker.fixtures.tsx`: `case` =
 * "with-swatches" (default) / "default" / "controlled"; `host.params.input` /
 * `width` / `density` feed its `EnvironmentScope`; `presentation` /
 * `nonmodal` / `defaultopen` / `controlledopen` / `kbdismiss` / `skipanim` /
 * `placement` / `offset` / `trigdisabled` parameterize the Popover and the
 * Trigger. Carrier probes are the derived testIDs — `id:cp-panel` on the
 * anchored overlay, `id:cp-sheet` on the Sheet carrier.
 *
 * Open state is observed through the fixture's `OpenProbe`, which reads the
 * root-owned `OverlayTriggerContext` and reports `openChange` edges:
 * `ColorPicker.Popover.onOpenChange` fires only when the Popover owns its
 * state (RAC/`PopoverContent` semantics, verbatim), so in the normal
 * trigger-driven composition the probe on the Popover itself stays silent
 * and `OpenProbe` is the channel the "onOpenChange 一轮" rows assert. In the
 * owns-state cases (`defaultopen` / `controlledopen`) the Popover's own
 * `onOpenChange` is the live channel instead — same probe name, never both
 * at once.
 *
 * Native hosts fill the device screen, so the viewport `width`/`height`
 * and `platform` options are gone. The desktop-parity baseline is the
 * explicit `POINTER` scope instead (`input="pointer" width="regular"`
 * through the fixture's `EnvironmentScope`): without it a phone-derived
 * `input` of touch would invert every pointer-default assertion.
 */

const TRIGGER = "role:button[Pick a color]";

type Params = Record<string, string>;

// The desktop-parity environment the pointer-default rows assert: an
// explicit scope injection (host-independent), not a launch option.
const POINTER: Params = { input: "pointer", width: "regular" };

// Every probe name the fixture wires; M-007's "no picker-layer new
// observable surface" asserts the recorded set stays inside it.
const FIXTURE_PROBES = new Set([
  "onChange",
  "openChange",
  "triggerPress",
  "hoverStart",
  "hoverEnd",
  "focus",
  "blur",
]);

function openPicker(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../color-picker.fixtures.tsx", {
    clock: {},
    host: { params: { case: caseName, ...params } },
  });
}

describe("color-picker mobile", () => {
  // adapt-sheets/color-picker.md M-001 (A-002, A-007): the default pointer
  // environment mounts the panel carrier — `cp-panel` present, `cp-sheet`
  // absent — the trigger content shows and the root-owned open channel
  // records the open edge once. Desktop zero drift.
  test("M-001 default environment opens the panel carrier", async () => {
    const app = await openPicker("with-swatches", POINTER);

    expect(app.count("id:cp-panel")).toBe(0);
    expect(app.count("id:cp-sheet")).toBe(0);
    expect(app.shows("text:open-state:closed")).toBe(true);

    await app.press(TRIGGER);

    expect(app.count("id:cp-panel")).toBe(1);
    expect(app.count("id:cp-sheet")).toBe(0);
    expect(app.shows(TRIGGER)).toBe(true);
    expect(app.shows("text:Hue")).toBe(true);
    expect(app.shows("text:open-state:open")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
    expect(callsOf(app, "triggerPress")).toHaveLength(1);
  });

  // adapt-sheets/color-picker.md M-002 (A-002, A-007): injected touch +
  // compact resolves `auto` to the sheet carrier — `cp-sheet` mounts with
  // the swatch presets, the ColorArea and the ColorSlider all showing and
  // enabled, and the open edge still records once.
  test("M-002 injected touch+compact resolves auto to the sheet carrier", async () => {
    const app = await openPicker("with-swatches", {
      input: "touch",
      width: "compact",
    });

    await app.press(TRIGGER);

    expect(app.count("id:cp-sheet")).toBe(1);
    expect(app.count("id:cp-panel")).toBe(0);
    expect(app.shows("role:listbox[Color presets]")).toBe(true);
    expect(app.count("role:option")).toBe(3);
    expect(app.shows("role:group[Color area]")).toBe(true);
    expect(app.enabled("role:adjustable[Hue]")).toBe(true);
    expect(app.shows("text:Hue")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/color-picker.md M-003 (A-001, A-002): an explicit pin wins
  // over the auto rule in both directions — `presentation="sheet"` mounts
  // the Sheet carrier even under pointer, and `presentation="panel"` keeps
  // the anchored overlay under injected touch+compact where auto would
  // pick sheet.
  test("M-003 explicit presentation pin beats the auto rule on both environments", async () => {
    const pinnedSheet = await openPicker("with-swatches", {
      ...POINTER,
      presentation: "sheet",
    });
    await pinnedSheet.press(TRIGGER);
    expect(pinnedSheet.count("id:cp-sheet")).toBe(1);
    expect(pinnedSheet.count("id:cp-panel")).toBe(0);
    expect(pinnedSheet.shows("text:Hue")).toBe(true);

    const pinnedPanel = await openPicker("with-swatches", {
      presentation: "panel",
      input: "touch",
      width: "compact",
    });
    await pinnedPanel.press(TRIGGER);
    expect(pinnedPanel.count("id:cp-panel")).toBe(1);
    expect(pinnedPanel.count("id:cp-sheet")).toBe(0);
    expect(pinnedPanel.shows("text:Hue")).toBe(true);
  });

  // adapt-sheets/color-picker.md M-005 (A-002): `isNonModal` folds into the
  // pin — a non-modal layer has no sheet semantics, so under
  // `auto` + touch + compact the resolved carrier stays `panel` with its
  // underlay-free chain. Proves the prop still reaches the presentation
  // fold verbatim.
  test("M-005 isNonModal suppresses auto sheet resolution", async () => {
    const app = await openPicker("with-swatches", {
      nonmodal: "1",
      input: "touch",
      width: "compact",
    });

    await app.press(TRIGGER);

    expect(app.count("id:cp-panel")).toBe(1);
    expect(app.count("id:cp-sheet")).toBe(0);
    expect(app.shows("text:Hue")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });

  // adapt-sheets/color-picker.md M-007 (A-003): injected touch — the press
  // chain is verbatim (`triggerPress` → `openChange(true)` → carrier
  // mount), and no picker-layer observable surface appears: every recorded
  // probe name is one the fixture itself wires. The B hit-area inheritance
  // (`feedback.hitSlop()`) is popover M-008's assertion; this row only pins
  // that the ColorPicker composition adds nothing on top.
  test("M-007 injected touch keeps the verbatim press chain with no new surface", async () => {
    const app = await openPicker("with-swatches", {
      input: "touch",
      width: "compact",
    });

    await app.press(TRIGGER);

    expect(callsOf(app, "triggerPress")).toHaveLength(1);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
    expect(app.count("id:cp-sheet")).toBe(1);
    expect(calls(app).every((call) => FIXTURE_PROBES.has(call.name))).toBe(true);
  });

  // adapt-sheets/color-picker.md M-008 (A-004): inside the sheet carrier
  // the color subcomponents still render and stay interactive — the
  // swatch presets, the ColorArea group and the named slider thumb all
  // show/enabled, and a preset press still writes the root's `onChange`
  // exactly once. Value semantics of the drag paths stay with the
  // color-area / color-slider units; this row only pins that the carrier
  // does not break the children's own contract.
  test("M-008 sheet carrier keeps the color children rendered and interactive", async () => {
    const app = await openPicker("with-swatches", {
      input: "touch",
      width: "compact",
    });

    await app.press(TRIGGER);
    expect(app.count("id:cp-sheet")).toBe(1);

    expect(app.shows("role:listbox[Color presets]")).toBe(true);
    expect(app.count("role:option")).toBe(3);
    expect(app.shows("role:group[Color area]")).toBe(true);
    expect(app.enabled("role:adjustable[Hue]")).toBe(true);

    await app.press("role:option >> nth=1");
    expect(callsOf(app, "onChange")).toEqual([[{ hex: "#22c55e" }]]);
  });

  // adapt-sheets/color-picker.md M-009 (基线): default-environment zero
  // drift, sampled across the contract surface the fixture can drive —
  // trigger open / `openChange` rounds, `onChange` through a preset with
  // the hex verbatim, uncontrolled `defaultValue` and controlled `value`
  // semantics, `defaultOpen` / controlled `isOpen` self-ownership,
  // `placement` / `offset` pass-through (the geometry itself is the §6
  // host gap), `isKeyboardDismissDisabled` gating Escape while outside
  // press still closes, `shouldSkipAnimation` dropping the exit hold,
  // outside-press and Escape closes, and the Trigger's disabled / hover
  // callback chain. `isExiting` / `isEntering` only force animation
  // states (classes are unobservable), `triggerRef` only feeds anchor
  // geometry, and the focus-return `onFocus` has no observable channel —
  // the trigger `View` is not `focusable`, so `focusTrigger()` cannot
  // land, and `nsh/test` cannot query focus regardless (measured: the
  // probe stays silent after a close on both targets). All three ride
  // the same unobservable surface and get no separate assertion here.
  test("M-009 default environment baseline sample across the contract surface", async () => {
    const app = await openPicker("with-swatches", POINTER);

    // Trigger open, preset write, Escape close — the T-006 / T-007 semantics.
    await app.press(TRIGGER);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
    expect(app.count("id:cp-panel")).toBe(1);

    await app.press("role:option >> nth=1");
    expect(callsOf(app, "onChange")).toEqual([[{ hex: "#22c55e" }]]);

    await app.keyboard.press("escape");
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
    // The 100ms exit hold keeps the carrier mounted, then releases it.
    await app.clock!.runFor(20);
    expect(app.count("id:cp-panel")).toBe(1);
    await app.clock!.runFor(120);
    expect(app.count("id:cp-panel")).toBe(0);

    // The hover half of the callback chain moved to
    // `color-picker.mobile.web.test.tsx` (`app.hover` is desktop/web only);
    // the focus half stays the unobservable gap the header note records.

    // Outside press: while open the underlay covers the trigger, so the
    // press lands on the outside-press close (the popover M-011 pattern).
    await app.press(TRIGGER);
    expect(callsOf(app, "openChange")).toEqual([
      [true],
      [false],
      [true],
    ]);
    await app.press(TRIGGER);
    expect(callsOf(app, "openChange")).toEqual([
      [true],
      [false],
      [true],
      [false],
    ]);
    await app.clock!.runFor(120);
    expect(app.count("id:cp-panel")).toBe(0);

    // Trigger disabled: no press, no open, the disabled look's `enabled`
    // read false.
    const disabled = await openPicker("with-swatches", {
      ...POINTER,
      trigdisabled: "1",
    });
    expect(disabled.enabled(TRIGGER)).toBe(false);
    await expect(disabled.press(TRIGGER)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(disabled.count("id:cp-panel")).toBe(0);
    expect(callsOf(disabled, "openChange")).toHaveLength(0);
    expect(callsOf(disabled, "triggerPress")).toHaveLength(0);

    // isKeyboardDismissDisabled gates Escape on the panel chain; the
    // outside-press close still works.
    const kb = await openPicker("with-swatches", { ...POINTER, kbdismiss: "1" });
    await kb.press(TRIGGER);
    await kb.keyboard.press("escape");
    expect(kb.count("id:cp-panel")).toBe(1);
    expect(callsOf(kb, "openChange")).toEqual([[true]]);
    await kb.press(TRIGGER);
    expect(callsOf(kb, "openChange")).toEqual([[true], [false]]);

    // `defaultOpen` self-ownership: the Popover mounts open without a
    // trigger press, and Escape closes through the Popover's own
    // `onOpenChange` — the owns-state channel (the root trigger stays
    // untouched, so `OpenProbe` stays silent and the recorded round is the
    // Popover's own `[false]`).
    const selfOpen = await openPicker("with-swatches", {
      ...POINTER,
      defaultopen: "1",
    });
    expect(selfOpen.count("id:cp-panel")).toBe(1);
    expect(selfOpen.shows("text:Hue")).toBe(true);
    await selfOpen.keyboard.press("escape");
    expect(callsOf(selfOpen, "openChange")).toEqual([[false]]);
    await selfOpen.clock!.runFor(120);
    expect(selfOpen.count("id:cp-panel")).toBe(0);

    // Controlled `isOpen`: a host-driven open mounts the carrier without
    // an `onOpenChange` round (the parent set the state), and Escape
    // closes through the Popover's `onOpenChange`, which the fixture
    // writes back into the signal.
    const controlled = await openPicker("with-swatches", {
      ...POINTER,
      controlledopen: "1",
    });
    await controlled.host.send("cp.open");
    await controlled.waitFor("id:cp-panel");
    expect(controlled.count("id:cp-panel")).toBe(1);
    expect(callsOf(controlled, "openChange")).toHaveLength(0);
    await controlled.keyboard.press("escape");
    expect(callsOf(controlled, "openChange")).toEqual([[false]]);
    await controlled.waitFor("id:cp-panel", { state: "gone" });

    // `placement` / `offset` pass through: the panel carrier still mounts
    // and opens with a non-default anchor request (the resolved geometry
    // is the §6 host gap — only the mount is asserted).
    const placed = await openPicker("with-swatches", {
      ...POINTER,
      placement: "top",
      offset: "20",
    });
    await placed.press(TRIGGER);
    expect(placed.count("id:cp-panel")).toBe(1);
    expect(placed.shows("text:Hue")).toBe(true);
    expect(callsOf(placed, "openChange")).toEqual([[true]]);

    // Controlled `value`: the echo text shows the seed, a preset press
    // writes `onChange` once and the controlled round-trip updates the
    // displayed hex.
    const valued = await openPicker("controlled", POINTER);
    expect(valued.shows("text:selected:#325578")).toBe(true);
    await valued.press(TRIGGER);
    await valued.press("role:option >> nth=1");
    expect(callsOf(valued, "onChange")).toEqual([[{ hex: "#22c55e" }]]);
    expect(valued.shows("text:selected:#22c55e")).toBe(true);

    // `shouldSkipAnimation`: the exit hold is skipped — the carrier is
    // gone after a short clock run that would still be inside the 100ms
    // hold on the default path (asserted above on `app`).
    const skip = await openPicker("with-swatches", {
      ...POINTER,
      skipanim: "1",
    });
    await skip.press(TRIGGER);
    expect(skip.count("id:cp-panel")).toBe(1);
    await skip.keyboard.press("escape");
    await skip.clock!.runFor(20);
    expect(skip.count("id:cp-panel")).toBe(0);
    expect(callsOf(skip, "openChange")).toEqual([[true], [false]]);
  }, 120_000);

  // adapt-sheets/color-picker.md M-010 (A-007): the fixture machinery
  // itself — `Scoped`'s `input`/`width`/`density` params reach
  // `EnvironmentScope` (touch + compact resolves the sheet carrier with no
  // platform change), the `presentation` / `nonmodal` / `defaultopen`
  // params mount and discriminate, the `cp-panel` / `cp-sheet` carrier
  // probes answer `count`, the `OpenProbe` open-state channel reports
  // edges, and the Trigger callback probes record.
  test("M-010 fixture Scoped params, case params and carrier probes all mount and discriminate", async () => {
    const baseline = await openPicker("with-swatches", POINTER);
    expect(baseline.shows(TRIGGER)).toBe(true);
    expect(baseline.shows("text:open-state:closed")).toBe(true);

    const injected = await openPicker("with-swatches", {
      input: "touch",
      width: "compact",
    });
    await injected.press(TRIGGER);
    expect(injected.count("id:cp-sheet")).toBe(1);
    expect(injected.count("id:cp-panel")).toBe(0);

    const pinned = await openPicker("with-swatches", {
      ...POINTER,
      presentation: "sheet",
    });
    await pinned.press(TRIGGER);
    expect(pinned.count("id:cp-sheet")).toBe(1);
    expect(pinned.count("id:cp-panel")).toBe(0);

    const nonModal = await openPicker("with-swatches", {
      nonmodal: "1",
      input: "touch",
      width: "compact",
    });
    await nonModal.press(TRIGGER);
    expect(nonModal.count("id:cp-panel")).toBe(1);
    expect(nonModal.count("id:cp-sheet")).toBe(0);

    const selfOpen = await openPicker("with-swatches", {
      ...POINTER,
      defaultopen: "1",
    });
    expect(selfOpen.count("id:cp-panel")).toBe(1);

    const disabled = await openPicker("with-swatches", {
      ...POINTER,
      trigdisabled: "1",
    });
    expect(disabled.enabled(TRIGGER)).toBe(false);
    expect(callsOf(disabled, "openChange")).toHaveLength(0);
  });
});
