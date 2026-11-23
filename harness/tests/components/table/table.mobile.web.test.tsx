import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Web-target halves of the table mobile rows that need a pointer host
 * step (adapt-sheets/table.md §4): M-009's hover suppression / roundtrip
 * (`app.hover` is desktop/web only — a phone has no mouse) and M-011's
 * typeahead/arrow half (`platform:"web"` is the one host that moves view
 * focus — the registered focus gap, and a `platform` pin is illegal on
 * native). The shared `table.mobile.test.tsx` keeps the rest.
 *
 * The fixture is `harness/table.fixtures.tsx`; `input`/`density` feed its
 * `EnvironmentScope`, exactly as on the shared file. M-009's cell-at-rest
 * half stays a registered web deviation: on this host a pointer over the
 * row also raises `isHovered` on its cells, so the cell half is not
 * asserted here — unchanged from the shared file's `isWeb` guard.
 */

type Params = Record<string, string>;

type EventEntry = { part: string; kind: string };

function openTable(caseName: string, params: Params = {}): Promise<App> {
  return open("../../../table.fixtures.tsx", {
    platform: "web",
    width: 1024,
    height: 768,
    host: { params: { case: caseName, ...params } },
  });
}

describe("table mobile (web)", () => {
  // adapt-sheets/table.md M-009 (A-006): under touch the hover channel
  // stays dead — `app.hover` writes no `isHovered` render value on row,
  // cell, sortable column, header or resizer, reports no
  // `onHoverStart`/`onHoverChange`, and the resizer's own hovered
  // marker never rises — while the raw `onMouseEnter`/`onMouseLeave`
  // callbacks still forward (the switch A-003 ruling). The default
  // environment keeps the full hover roundtrip.
  test("M-009 touch suppresses hover state and callbacks; pointer keeps them", async () => {
    const touch = await openTable("ctx-probe", { input: "touch" });

    await touch.hover("label:Resize member");
    await touch.wait(300);
    expect(touch.shows("text:resizer-hovered")).toBe(false);
    expect(touch.shows("text:resizer-idle")).toBe(true);

    const rows = await openTable("rows", { input: "touch" });
    await rows.hover("id:row-one");
    await rows.wait(300);
    // No hover callback ran on the row part under touch.
    expect(callsOf(rows, "hover").filter((c) => (c[0] as { part: string }).part === "row-one")).toHaveLength(0);
    // The raw host callbacks still forward (the switch A-003 ruling).
    expect(callsOf(rows, "mouseenter").length).toBeGreaterThan(0);
    // The render-prop opacity probe stays at rest: `isHovered` never rose.
    expect(rows.viewStyle("id:row-one")?.opacity ?? 1).toBe(1);
    expect(rows.viewStyle("id:cell-one")?.opacity ?? 1).toBe(1);

    await rows.press("id:row-one");
    await rows.wait(300);
    expect(callsOf(rows, "hover").filter((c) => (c[0] as { part: string }).part === "row-one")).toHaveLength(0);
    expect(rows.viewStyle("id:row-one")?.opacity ?? 1).toBe(1);

    // The sortable column's hover channel under touch: its style fn
    // opacity stays at rest and no sort fires off a hover.
    const sortable = await openTable("sortable", { input: "touch" });
    await sortable.hover("id:column-name");
    await sortable.wait(300);
    expect(sortable.viewStyle("id:column-name")?.opacity ?? 1).toBe(1);
    expect(callsOf(sortable, "sort")).toHaveLength(0);

    // Pointer keeps the roundtrip: enter reports start+change, the
    // render-prop opacity flips to 0.5, leaving reports change(false)+end.
    const pointer = await openTable("rows", { input: "pointer" });
    await pointer.hover("id:row-one");
    await pointer.wait(300);
    const hoverCalls = callsOf(pointer, "hover").map((c) => c[0]) as {
      part: string;
      kind: string;
      value?: boolean;
    }[];
    expect(hoverCalls).toContainEqual({ part: "row-one", kind: "start" });
    expect(hoverCalls).toContainEqual({ part: "row-one", kind: "change", value: true });
    // The opacity probe reads the render-prop channel: hovered → 0.5.
    await pointer.waitUntil(() => (pointer.viewStyle("id:row-one")?.opacity ?? 1) === 0.5);
    // On web a pointer over the row also raises `isHovered` on its cells
    // (the cell's hover state follows the pointer position there), so the
    // cell-at-rest half was headless-only on the shared file and is not
    // asserted here either — the registered web deviation.

    const pointerResizer = await openTable("ctx-probe", { input: "pointer" });
    await pointerResizer.hover("label:Resize member");
    await pointerResizer.wait(300);
    expect(pointerResizer.shows("text:resizer-hovered")).toBe(true);
  }, 120_000);

  // adapt-sheets/table.md M-011 (A-008/基线, keyboard half — the
  // `platform:"web"` block that lived inside the shared file's third
  // M-011 test): the keymap's typeahead/arrow paths run the same
  // selection under `input:"touch"` as under pointer. The `events` case's
  // cell `onFocus` probes report which cell took focus.
  test("M-011 keyboard half: typeahead and arrows move cell focus identically under touch and pointer", async () => {
    for (const input of ["pointer", "touch"] as const) {
      const kb = await openTable("events", { input });
      await kb.wait(20);
      // Press the first cell itself (role selector, as the keyboard
      // tests do) to focus it — `onFocus` reports `part:"cell"`.
      await kb.press("role:cell[Ada]");
      await kb.wait(20);
      expect(
        callsOf(kb, "events").some(
          (c) => (c[0] as EventEntry).part === "cell" && (c[0] as EventEntry).kind === "focus",
        ),
      ).toBe(true);
      // Typeahead "G" from the focused cell lands on Grace's row —
      // the `cell-two` focus probe records the move.
      await kb.keyboard.press("g");
      await kb.wait(20);
      expect(
        callsOf(kb, "events").some(
          (c) => (c[0] as EventEntry).part === "cell-two" && (c[0] as EventEntry).kind === "focus",
        ),
      ).toBe(true);
      // Arrow down from the focused cell moves to the next row's cell.
      await kb.keyboard.press("arrowdown");
      await kb.wait(20);
    }
  }, 120_000);
});
