import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the textfield adapt unit — the row of
 * adapt-sheets/textfield.md §4 that needs a capability only the headless
 * engine has: M-008 (`open({platform:"ios"})` host derivation — `--target
 * web` rejects a `platform` option outright, so the file carries the
 * `.headless.` suffix and never runs on web).
 *
 * The fixture is `harness/textfield.fixtures.tsx`; `host.params.case` +
 * `scope`. The ios opens pin no desktop platform and no `EnvironmentScope`:
 * the phone-sized host deriving `input == "touch"` on its own is the
 * subject (the date-input-group headless convention).
 */

function openIos(caseName: string): Promise<App> {
  return open("../../../textfield.fixtures.tsx", {
    platform: "ios",
    width: 390,
    height: 844,
    host: { params: { case: caseName } },
  });
}

type LayoutEntry = { width: number; height: number };

function lastLayout(app: App, name: string): LayoutEntry {
  return callsOf(app, name).at(-1)![0] as LayoutEntry;
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
});
