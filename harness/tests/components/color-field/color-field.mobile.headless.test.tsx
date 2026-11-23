import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Headless mobile assertions for the color-field adapt unit — the row of
 * adapt-sheets/color-field.md §4 that needs a capability only the
 * headless engine has: M-008 (`open({platform:"ios"})` host derivation —
 * `--target web` rejects a `platform` option outright, so the phone-sized
 * host deriving `input == "touch"` can only be exercised here).
 *
 * The fixture is `harness/color-field.fixtures.tsx`; `host.params.case`
 * is `layout`. The ios open pins no desktop platform and no
 * `EnvironmentScope` — the host deriving `input == "touch"` on its own is
 * the subject (the date-input-group headless convention).
 */

function openIos(caseName: string): Promise<App> {
  return open("../../../color-field.fixtures.tsx", {
    platform: "ios",
    width: 390,
    height: 844,
    host: { params: { case: caseName } },
  });
}

type GroupLayout = { width: number; height: number };

describe("color-field mobile (headless)", () => {
  // adapt-sheets/color-field.md M-008 (A-003): `platform:"ios"` with no
  // `EnvironmentScope` — the host derives `input()==="touch"` on its own,
  // so the inherited `min-h-11` lifts the Group row past the 44 pt hit
  // target exactly as the injected half (M-001) does.
  test("M-008 ios host derivation: the group row measures at least 44pt without a scope", async () => {
    const app = await openIos("layout");

    await app.waitUntil(() => callsOf(app, "layout").length > 0);
    const records = callsOf(app, "layout").map((args) => args[0] as GroupLayout);
    const layout = records[records.length - 1];

    expect(layout.height).toBeGreaterThanOrEqual(44);
  }, 120_000);
});
