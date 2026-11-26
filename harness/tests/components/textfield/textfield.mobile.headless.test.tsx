import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the textfield adapt unit — the rows of
 * adapt-sheets/textfield.md §4 that need capabilities only the headless
 * engine has:
 *
 *   M-002  `app.hover` — the touch hover-suppression row. The native
 *          ios/android CI lanes have no mouse channel, so the row moved
 *          here whole rather than split; `testInput` picks the fixture's
 *          environment exactly as the shared file does.
 *   M-008  `open({platform:"ios"})` host derivation — `--target web`
 *          rejects a `platform` option outright, so the file carries the
 *          `.headless.` suffix and never runs on web.
 *
 * The fixture is `harness/textfield.fixtures.tsx`; `host.params.case` +
 * `testInput` ("pointer"/"touch" — the same explicit environment pick the
 * shared file uses). The ios opens pin no desktop platform and no
 * environment param: the phone-sized host deriving `input == "touch"` on
 * its own is the subject (the date-input-group headless convention).
 */

function openCase(
  name: string,
  params: Record<string, string> = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../textfield.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    locale: "en-US",
    ...options,
    host: { params: { case: name, ...params } },
  });
}

function openIos(caseName: string): Promise<App> {
  return open("../../../textfield.fixtures.tsx", {
    platform: "ios",
    width: 390,
    height: 844,
    host: { params: { case: caseName } },
  });
}

type LayoutEntry = { width: number; height: number };
type HoverRecord = { isHovered: boolean };

function lastLayout(app: App, name: string): LayoutEntry {
  return callsOf(app, name).at(-1)![0] as LayoutEntry;
}

function hoverRecords(app: App): HoverRecord[] {
  return callsOf(app, "input-class").map((c) => c[0] as HoverRecord);
}

describe("textfield mobile (headless)", () => {
  // adapt-sheets/textfield.md M-008 (A-001, A-004): `platform:"ios"` with
  // no `EnvironmentScope` — the host derives `input()==="touch"` on its
  // own, so the `min-h-11` axis lifts the Input row to the 44 pt touch
  // target and the submit chain fires without any injected scope (the
  // Environment default-derivation half of the dual-environment rows).
  test("M-008 ios host derivation: Input row lifts to 44pt and submit fires without a scope", async () => {
    const layout = await openIos("layout");
    await layout.waitUntil(
      () => callsOf(layout, "input-layout").length > 0 && callsOf(layout, "textarea-layout").length > 0,
    );
    expect(lastLayout(layout, "input-layout").height).toBeGreaterThanOrEqual(44);
    expect(lastLayout(layout, "textarea-layout").height).toBe(56);

    const submit = await openIos("submit-standalone");
    await submit.press("id:name");
    await submit.type("id:name", "hi");
    await submit.submit("id:name");
    await submit.waitUntil(() => callsOf(submit, "onSubmit").length === 1);

    expect(callsOf(submit, "onSubmit")).toHaveLength(1);
    expect(callsOf(submit, "onSubmit")[0][0]).toEqual({ text: "hi" });
    expect(callsOf(submit, "onBlur")).toHaveLength(0);
  }, 120_000);

  // adapt-sheets/textfield.md M-002 (A-003): under touch neither a hover
  // nor a press (whose sticky web hover is the registered hazard) raises
  // `isHovered` — every className render-prop record stays false and the
  // three `onHover*` callbacks record nothing. The host's own
  // `onMouseEnter` / `onMouseLeave` pass-throughs still fire (A-003 keeps
  // them), which is also what proves the hover was really delivered.
  // Under pointer the hover round-trips exactly as on desktop.
  test("M-002 injected touch suppresses the hover face; pointer keeps the round-trip", async () => {
    const touch = await openCase("hover", { testInput: "touch" });

    await touch.hover("id:name");
    await touch.press("id:name");
    await touch.hover("id:hover-away");
    await touch.waitUntil(() => callsOf(touch, "onMouseLeave").length > 0);

    expect(hoverRecords(touch).length).toBeGreaterThan(0);
    expect(hoverRecords(touch).every((r) => r.isHovered === false)).toBe(true);
    expect(callsOf(touch, "onHoverStart")).toHaveLength(0);
    expect(callsOf(touch, "onHoverEnd")).toHaveLength(0);
    expect(callsOf(touch, "onHoverChange")).toHaveLength(0);
    expect(callsOf(touch, "onMouseEnter").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(touch, "onMouseLeave").length).toBeGreaterThanOrEqual(1);
    touch.dispose();

    const pointer = await openCase("hover", { testInput: "pointer" });

    await pointer.hover("id:name");
    await pointer.waitUntil(() => hoverRecords(pointer).at(-1)?.isHovered === true);
    expect(callsOf(pointer, "onHoverStart").length).toBeGreaterThanOrEqual(1);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true]]);
    expect(callsOf(pointer, "onMouseEnter").length).toBeGreaterThanOrEqual(1);

    await pointer.hover("id:hover-away");
    await pointer.waitUntil(() => callsOf(pointer, "onHoverEnd").length > 0);
    expect(hoverRecords(pointer).at(-1)?.isHovered).toBe(false);
    expect(callsOf(pointer, "onHoverChange")).toEqual([[true], [false]]);
    expect(callsOf(pointer, "onMouseLeave").length).toBeGreaterThanOrEqual(1);
    pointer.dispose();
  }, 120_000);
});
