import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the switch-group adapt unit, one test per row of
 * adapt-sheets/switch-group.md §4 (M-001…M-007). The fixture is
 * `harness/switch-group.fixtures.tsx`; `host.params.testInput` picks the
 * environment explicitly — "pointer" is the host-independent
 * desktop-parity baseline, "touch" wraps the case in
 * `EnvironmentScope input="touch"` — so every row runs identically on the
 * headless, web and native ios/android targets this single file covers.
 *
 * Native hosts fill the device screen and reject the `platform` /
 * `width` / `height` open options (`ERR_NSH_TEST_UNSUPPORTED`), so this
 * file carries none: the old desktop pin's pointer-baseline job is now
 * `testInput:"pointer"` on every open. Assertions read only what
 * `nsh/test` observes: `shows`/`texts`/`enabled`, `onLayout` probe payloads,
 * `viewStyle` backgroundColor, and `app.storage()` probe calls — never class
 * names (D18).
 *
 * SwitchGroup is a layout container with no context, no state and no press
 * surface of its own: the children `Switch`es never read it. The mobile rows
 * therefore prove two things — that the group's bare surface forwards nothing
 * to its children under either environment (M-002/M-003), and that the group
 * adds no `input`/`density` axis of its own while the children's inherited
 * touch behaviour (the 44 pt face, ControlField's `min-h-11`) survives inside
 * the `items` layout (M-004/M-005/M-006).
 */

type LayoutCall = {
  name: "group" | "wifi" | "bluetooth" | "cf-row";
  x: number;
  y: number;
  width: number;
  height: number;
};

function openCase(params: Record<string, string> = {}): Promise<App> {
  return open("../../../switch-group.fixtures.tsx", {
    host: { params: { case: "layout", ...params } },
  });
}

function lastLayout(app: App, name: LayoutCall["name"]): LayoutCall {
  const calls = callsOf(app, "layout")
    .map((args) => args[0] as LayoutCall)
    .filter((call) => call.name === name);
  const found = calls[calls.length - 1];

  if (!found) throw new Error(`no layout call recorded for ${name}`);

  return found;
}

function expectClose(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThan(0.6);
}

describe("switch-group mobile", () => {
  // adapt-sheets/switch-group.md M-001 (A-003): pointer baseline — pressing an
  // unselected Switch inside the group commits exactly once through its own
  // onChange, the selection takes effect, and the sibling Switch's state is
  // untouched: the group shares and intercepts nothing.
  test("M-001 pointer baseline: one onChange, selection applies, sibling unchanged", async () => {
    const app = await openCase({ case: "independent", testInput: "pointer" });

    await app.press("role:switch[Wifi]");

    expect(callsOf(app, "change")).toEqual([["Wifi", true]]);
    expect(app.texts()).toContain("Wifi On");
    expect(app.texts()).toContain("Bluetooth Off");
  });

  // adapt-sheets/switch-group.md M-002 (A-001): the bare group surface — the
  // spacer the fixture places between the items — owns no press path, so the
  // press step finds nothing that hears presses (NOT_FOUND, the same
  // observable the error-message unit uses for a non-interactive part) and no
  // child callback or selection change follows.
  test("M-002 pointer: pressing the bare group surface reaches no child", async () => {
    const app = await openCase({ case: "independent", testInput: "pointer" });

    await expect(app.press("id:gap")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    expect(callsOf(app, "change")).toEqual([]);
    expect(app.texts()).toContain("Wifi Off");
    expect(app.texts()).toContain("Bluetooth Off");
  });

  // adapt-sheets/switch-group.md M-003 (A-001): the same bare-surface press
  // under injected touch — "the group adds no press surface of its own" holds
  // on mobile exactly as on pointer.
  test("M-003 touch: pressing the bare group surface still reaches no child", async () => {
    const app = await openCase({ case: "independent", testInput: "touch" });

    await expect(app.press("id:gap")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    expect(callsOf(app, "change")).toEqual([]);
    expect(app.texts()).toContain("Wifi Off");
    expect(app.texts()).toContain("Bluetooth Off");
  });

  // adapt-sheets/switch-group.md M-004 (A-003): under touch a press on an
  // unselected Switch commits once; the short switch (no Label, content-sized
  // face) measures at least the inherited 44 pt touch minimum inside the
  // group's items layout; and a disabled Switch in the same group stays
  // blocked — the host refuses the press and no onChange is recorded.
  test("M-004 touch: one onChange, 44pt face, disabled stays blocked", async () => {
    const app = await openCase({ testInput: "touch", disabled: "1" });

    await app.press("role:switch[Wifi]");

    expect(callsOf(app, "change")).toEqual([["wifi", true]]);
    expect(lastLayout(app, "wifi").height).toBeGreaterThanOrEqual(44);

    await expect(app.press("role:switch[Bluetooth]")).rejects.toMatchObject({
      code: "ERR_NSH_TEST_DISABLED",
    });
    expect(callsOf(app, "change")).toEqual([["wifi", true]]);
  });

  // adapt-sheets/switch-group.md M-005 (A-002): the group root's and both
  // items' bounds are identical under pointer and injected touch — the group
  // has no `input`/`density` axis of its own (the fixture pins the switches to
  // a fixed height so only the group's boxes are compared, not the children's
  // own touch minimum). With `orientation="horizontal"` the second item stays
  // on the first's row and sits one item width plus the `gap-4` 16pt away —
  // layout semantics the environment does not move.
  test("M-005 group bounds are environment-invariant; horizontal gap stays 16pt", async () => {
    const pointer = await openCase({ still: "1", testInput: "pointer" });
    const touch = await openCase({ still: "1", testInput: "touch" });

    for (const name of ["group", "wifi", "bluetooth"] as const) {
      const a = lastLayout(pointer, name);
      const b = lastLayout(touch, name);
      expectClose(b.x, a.x);
      expectClose(b.y, a.y);
      expectClose(b.width, a.width);
      expectClose(b.height, a.height);
    }

    const row = await openCase({
      case: "layout",
      orientation: "horizontal",
      testInput: "touch",
      still: "1",
    });
    const wifi = lastLayout(row, "wifi");
    const bluetooth = lastLayout(row, "bluetooth");

    expectClose(bluetooth.y, wifi.y);
    expectClose(bluetooth.x - wifi.x, wifi.width + 16);
  });

  // adapt-sheets/switch-group.md M-006 (A-004): a ControlField row inside the
  // group commits exactly once through onSelectedChange on press — the
  // default switch indicator's commit channels all point at the row, so no
  // second toggle can come out of the piece — its track repaints to the
  // selected colour as the row's value flips, and the short row measures at
  // least 44 pt under touch (control-field's `min-h-11` survives inside the
  // group's items layout).
  test("M-006 touch: ControlField row commits once, indicator follows, row is 44pt", async () => {
    const app = await openCase({ case: "control-field", testInput: "touch" });

    expect(app.shows("id:cf-row")).toBe(true);
    expect(app.shows("id:cf-switch-track")).toBe(true);

    const before = app.viewStyle("id:cf-switch-track")?.backgroundColor;

    await app.press("id:cf-row");
    await app.waitUntil(() => callsOf(app, "row-change").length === 1);

    expect(callsOf(app, "row-change")).toEqual([[true]]);

    const after = app.viewStyle("id:cf-switch-track")?.backgroundColor;
    expect(after).toBeDefined();
    expect(after).not.toBe(before);

    expect(lastLayout(app, "cf-row").height).toBeGreaterThanOrEqual(44);
  });

  // adapt-sheets/switch-group.md M-007 (baseline): desktop drift sample — the
  // default layout case keeps the group root visible with the 16pt items gap,
  // the class-name case's `w-40` still lands 160pt on the root, and a bare
  // string child renders as text instead of vanishing. The existing
  // switch-group.heroui.test.tsx regression file stays untouched.
  test("M-007 desktop drift: root visible, 16pt gap, w-40 class, bare string renders", async () => {
    const layout = await openCase({ testInput: "pointer" });

    expect(layout.shows("id:group")).toBe(true);
    const wifi = lastLayout(layout, "wifi");
    const bluetooth = lastLayout(layout, "bluetooth");
    expectClose(bluetooth.y - (wifi.y + wifi.height), 16);

    const withClass = await openCase({ case: "class-name", testInput: "pointer" });
    expectClose(lastLayout(withClass, "group").width, 160);

    const text = await openCase({ case: "text", testInput: "pointer" });
    expect(text.shows("text:Just a label")).toBe(true);
  });
});
