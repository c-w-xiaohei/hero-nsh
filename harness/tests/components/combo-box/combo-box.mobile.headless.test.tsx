import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the combo-box adapt unit: M-005,
 * M-006 and M-013 of adapt-sheets/combo-box.md §4.
 *
 * These rows open `platform: "ios"` — `open`'s platform option rejects
 * `ios`/`android` under `--target web` (the page is a desktop there), and
 * M-005 additionally drives `setViewport`, so the host-derived half of the
 * presentation rule (touch input + compact short side from the phone-sized
 * engine, no `EnvironmentScope`) can only run headless. The
 * `EnvironmentScope`-injected halves of the same rule — including M-003 —
 * live in `combo-box.mobile.test.tsx` and run on both targets.
 *
 * `platform: "ios"` at 390×844 derives `input: "touch"` and `width:
 * "compact"`, so `modal="1"` (`isNonModal={false}`) lets `presentation:
 * "auto"` resolve the Sheet carrier — the `id:cb-sheet` / `id:cb-panel`
 * testID probes discriminate it (`shows`, not `count`: both branches stay
 * mounted and the closed sheet hides through `SheetBackdrop`'s own
 * keep-alive chain, adapt sheet §8).
 */

const IOS = { platform: "ios", width: 390, height: 844 } as const;

function openMobileIos(
  params: Record<string, string> = {},
  caseName = "b-mobile",
): Promise<App> {
  return open("../../../combo-box.fixtures.tsx", {
    ...IOS,
    clock: {},
    host: { params: { case: caseName, ...params } },
  });
}

describe("combo-box mobile (headless)", () => {
  // adapt-sheets/combo-box.md M-005 (A-002): the presentation value latches
  // on the open edge — growing the viewport to regular while the sheet is
  // open must not swap carriers mid-open; after close the next open
  // re-evaluates against the new environment and yields the panel.
  test("M-005 latched sheet survives viewport growth; reopen re-evaluates to panel", async () => {
    const app = await openMobileIos({ modal: "1" });

    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await app.clock!.runFor(60);
    expect(app.shows("id:cb-sheet")).toBe(true);
    expect(app.shows("id:cb-panel")).toBe(false);
    expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);

    // Open-edge latch: the environment grew but the mounted carrier stays.
    await app.setViewport(1024, 768);
    await app.clock!.runFor(60);
    expect(app.shows("id:cb-sheet")).toBe(true);
    expect(app.shows("id:cb-panel")).toBe(false);
    expect(app.shows("role:listbox")).toBe(true);

    // Close, then reopen: the new environment (pointer + regular) resolves
    // `auto` to the panel carrier.
    await app.keyboard.press("escape");
    await app.clock!.runFor(200);
    expect(app.shows("role:listbox")).toBe(false);
    expect(callsOf(app, "openChange")).toEqual([[true, "manual"], [false, null]]);

    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await app.clock!.runFor(60);
    expect(app.shows("id:cb-panel")).toBe(true);
    expect(app.shows("id:cb-sheet")).toBe(false);
    expect(callsOf(app, "openChange")).toEqual([
      [true, "manual"],
      [false, null],
      [true, "manual"],
    ]);
  });

  // adapt-sheets/combo-box.md M-006 (A-004): sheet-mode close semantics.
  // The literal backdrop paint has no selector and covered-element presses
  // bypass it (sheet §6 host gap), so Escape — `SheetBackdrop`'s own
  // dismissal through `SheetRoot.onOpenChange` → the popover's `close()` —
  // stands in for the outside press on the same channel. The staged
  // custom-value half proves it is the commit-close channel and not the
  // panel's `handleCancel` revert: with "Dog" selected and the text edited
  // to "Do", `commitValue` keeps the typed text and clears the selection
  // (`change(null)`), where `revert` would restore "Dog".
  test("M-006 sheet closes commit like an outside press; selection closes; kb gates Escape", async () => {
    // Commit-close channel: type a filtering text, Escape → one
    // `onOpenChange(false)`, text settles per `commitValue` (empty
    // selection → ""), no `change`.
    const typed = await openMobileIos({ modal: "1" });
    await typed.press("id:combo-box-trigger");
    await typed.waitFor("role:listbox");
    await typed.type("id:combo-box-input", "pa");
    await typed.clock!.runFor(80);
    await typed.keyboard.press("escape");
    await typed.clock!.runFor(200);

    expect(callsOf(typed, "openChange")).toEqual([[true, "manual"], [false, null]]);
    expect(typed.shows("role:listbox")).toBe(false);
    expect(typed.shows("id:cb-sheet")).toBe(false);
    expect(callsOf(typed, "change")).toHaveLength(0);
    expect(typed.value("id:combo-box-input")).toBe("");

    // The commit-vs-revert discriminator: `allowsCustomValue` + a live
    // selection + edited text. `commitValue` → `commitCustomValue` keeps
    // "Do" and clears the selection; `revert` would restore "Dog".
    const custom = await openMobileIos({ modal: "1" }, "custom-value");
    await custom.press("id:combo-box-trigger");
    await custom.waitFor("role:listbox");
    await custom.press("role:option[Dog]");
    await custom.clock!.runFor(150);
    expect(custom.value("id:combo-box-input")).toBe("Dog");

    await custom.press("id:combo-box-trigger");
    await custom.waitFor("role:listbox");
    await custom.clock!.runFor(80);
    await custom.press("id:combo-box-input");
    await custom.keyboard.press("backspace");
    await custom.clock!.runFor(80);
    expect(custom.value("id:combo-box-input")).toBe("Do");
    expect(custom.shows("role:listbox")).toBe(true);

    await custom.keyboard.press("escape");
    await custom.clock!.runFor(200);
    expect(custom.value("id:combo-box-input")).toBe("Do");
    expect(callsOf(custom, "change")).toEqual([["dog"], [null]]);
    expect(callsOf(custom, "openChange")).toEqual([
      [true, "manual"],
      [false, null],
      [true, "manual"],
      [false, null],
    ]);
    expect(custom.shows("role:listbox")).toBe(false);

    // closeOnSelection: a single-select option press closes the sheet
    // through the same owner, with the selection callbacks once each.
    const pick = await openMobileIos({ modal: "1" });
    await pick.press("id:combo-box-trigger");
    await pick.waitFor("role:listbox");
    await pick.clock!.runFor(60);
    await pick.press("role:option[Dog]");
    await pick.clock!.runFor(200);

    expect(callsOf(pick, "change")).toEqual([["dog"]]);
    expect(callsOf(pick, "selectionChange")).toEqual([["dog"]]);
    expect(callsOf(pick, "openChange")).toEqual([[true, "manual"], [false, null]]);
    expect(pick.value("id:combo-box-input")).toBe("Dog");
    expect(pick.shows("role:listbox")).toBe(false);
    expect(pick.shows("id:cb-sheet")).toBe(false);

    // `isKeyboardDismissDisabled` reaches `SheetBackdrop`: Escape is gated
    // on this carrier exactly as `handleCancel` gates it on the panel —
    // the sheet stays open and no close reports; an option press still
    // closes, so the gate is Escape-scoped.
    const kb = await openMobileIos({ modal: "1", kb: "1" });
    await kb.press("id:combo-box-trigger");
    await kb.waitFor("role:listbox");
    await kb.clock!.runFor(60);
    await kb.keyboard.press("escape");
    await kb.clock!.runFor(200);

    expect(kb.shows("id:cb-sheet")).toBe(true);
    expect(kb.shows("role:listbox")).toBe(true);
    expect(callsOf(kb, "openChange")).toEqual([[true, "manual"]]);

    await kb.press("role:option[Panda]");
    await kb.clock!.runFor(200);
    expect(kb.shows("role:listbox")).toBe(false);
    expect(callsOf(kb, "openChange")).toEqual([[true, "manual"], [false, null]]);
    expect(callsOf(kb, "change")).toEqual([["panda"]]);
  });

  // adapt-sheets/combo-box.md M-013 (A-002, A-004, A-006): the host-derived
  // half — `open({platform:"ios"})` with no `EnvironmentScope` params lets
  // the phone-sized engine derive `input:"touch"` + `width:"compact"`, so
  // `modal="1"` resolves `auto` to the sheet carrier and the input's type →
  // filter chain works on it (the M-003/M-009 assertions through the host
  // export instead of the scope).
  test("M-013 ios host derives touch+compact: modal=1 resolves sheet and the input filters", async () => {
    const app = await openMobileIos({ modal: "1" });

    await app.press("id:combo-box-trigger");
    await app.waitFor("role:listbox");
    await app.clock!.runFor(60);
    expect(app.shows("id:cb-sheet")).toBe(true);
    expect(app.shows("id:cb-panel")).toBe(false);
    expect(app.shows("role:listbox")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true, "manual"]]);

    await app.type("id:combo-box-input", "dog");
    await app.clock!.runFor(80);
    expect(app.shows("role:option[Dog]")).toBe(true);
    expect(app.shows("role:option[Cat]")).toBe(false);
    expect(app.shows("role:option[Panda]")).toBe(false);
    expect(callsOf(app, "inputChange")).toEqual([["d"], ["do"], ["dog"]]);
  });
});
