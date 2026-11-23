import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless-only mobile assertions for the color-picker adapt unit: M-004
 * and M-006 of adapt-sheets/color-picker.md §4.
 *
 * Both rows need the host-derived environment — `platform: "ios"` at
 * 390×844 derives `input: "touch"` and `width: "compact"` with no
 * `EnvironmentScope`, and `open`'s platform option rejects `ios`/`android`
 * under `--target web`, so they can only run headless. The
 * EnvironmentScope-injected halves of the same rule live in
 * `color-picker.mobile.test.tsx` and run on both targets.
 *
 * Carrier probes: `testID="cp"` derives `id:cp-panel` / `id:cp-sheet`.
 * Open state is observed through the fixture's `OpenProbe`
 * (`OverlayTriggerContext` edges reported as `openChange`) — see the
 * fixture header for why the Popover's own `onOpenChange` is not the
 * channel in the trigger-driven composition.
 */

const IOS = { platform: "ios", width: 390, height: 844 } as const;
const TRIGGER = "role:button[Pick a color]";

type Params = Record<string, string>;

function openIos(
  params: Params = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../color-picker.fixtures.tsx", {
    ...IOS,
    clock: {},
    ...options,
    host: { params: { case: "with-swatches", ...params } },
  });
}

describe("color-picker mobile (headless)", () => {
  // adapt-sheets/color-picker.md M-004 (A-002): the presentation value
  // latches on the open edge — growing the window to a regular short side
  // while the sheet is open must not swap carriers mid-open; after close
  // the next open re-evaluates against the new environment (touch +
  // regular → panel).
  test("M-004 latched sheet survives viewport growth; reopen re-evaluates to panel", async () => {
    const app = await openIos();

    await app.press(TRIGGER);
    expect(app.count("id:cp-sheet")).toBe(1);
    expect(app.count("id:cp-panel")).toBe(0);

    await app.setViewport(1024, 768);
    expect(app.count("id:cp-sheet")).toBe(1);
    expect(app.count("id:cp-panel")).toBe(0);

    await app.keyboard.press("escape");
    expect(callsOf(app, "openChange")).toEqual([[true], [false]]);
    await app.waitFor("id:cp-sheet", { state: "gone" });

    await app.press(TRIGGER);
    await app.waitFor("id:cp-panel");
    expect(app.count("id:cp-panel")).toBe(1);
    expect(app.count("id:cp-sheet")).toBe(0);
    expect(app.shows("text:Hue")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true], [false], [true]]);
  });

  // adapt-sheets/color-picker.md M-006 (A-002, A-007): `platform: "ios"`
  // with no scope — the host-derived touch + compact environment resolves
  // `auto` to the sheet carrier, the trigger press opens it and the color
  // children render inside. This is the host-derivation half of M-002.
  test("M-006 ios host derives touch+compact: auto presents the sheet carrier", async () => {
    const app = await openIos();

    await app.press(TRIGGER);

    expect(app.count("id:cp-sheet")).toBe(1);
    expect(app.count("id:cp-panel")).toBe(0);
    expect(app.shows("role:group[Color area]")).toBe(true);
    expect(app.shows("role:listbox[Color presets]")).toBe(true);
    expect(app.shows("text:Hue")).toBe(true);
    expect(callsOf(app, "openChange")).toEqual([[true]]);
  });
});
