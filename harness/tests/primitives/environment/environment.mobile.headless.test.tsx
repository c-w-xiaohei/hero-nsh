import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions, Platform } from "nsh/test";

/*
 * Headless-only mobile assertions for the environment mechanism unit.
 *
 * `open`'s `platform` option simulates the host a headless engine runs as;
 * `ios`/`android` have no answer under `--target web` (the app runs on web
 * there, a desktop's platform) and reject with ERR_NSH_TEST_UNSUPPORTED, so
 * the phone derivation half of M-001 is declared in this `.headless.` file —
 * the gate runs it without `--target web`. Desktop-platform derivation
 * (windows/web → pointer) stays in `environment.mobile.test.tsx` and runs on
 * both local targets.
 */

function openEnvironment(
  caseName: string,
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../environment.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: { params: { case: caseName } },
  });
}

describe("environment", () => {
  // adapt-sheets/environment.md M-001 (A-001): `open`'s platform drives the
  // default environment — ios/android yield touch input and, at phone size,
  // the compact width class.
  test("M-001 host derivation: ios and android report touch", async () => {
    for (const platform of ["ios", "android"] as Platform[]) {
      const app = await openEnvironment("fields", {
        platform,
        width: 390,
        height: 844,
      });
      expect(app.texts()).toContain("input=touch");
      // 390×844 phone: short side 390 < 640 → compact.
      expect(app.texts()).toContain("width=compact");
    }
  });
});
