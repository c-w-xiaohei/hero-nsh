import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions, Platform } from "nsh/test";

/*
 * Headless-only mobile assertions for the create-presentation mechanism unit.
 *
 * `open`'s `platform` option simulates the host a headless engine runs as;
 * `ios`/`android` have no answer under `--target web` (the app runs on web
 * there, a desktop's platform) and reject with ERR_NSH_TEST_UNSUPPORTED, so
 * the host-derivation half of the presentation rule is declared in this
 * `.headless.` file — the gate runs it without `--target web`. The
 * EnvironmentScope-injected half stays in `presentation.mobile.test.tsx` and
 * runs on both local targets.
 */

function openPresentation(
  caseName: string,
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../presentation.fixtures.tsx", {
    platform: "windows",
    width: 390,
    height: 844,
    ...options,
    host: { params: { case: caseName } },
  });
}

describe("createPresentation", () => {
  // adapt-sheets/create-presentation.md M-011 (A-001…A-005): with no
  // EnvironmentScope, `open({platform})` alone must derive touch+compact —
  // presentation=sheet can only appear when the host-derived input is
  // "touch" AND the host-derived width class is "compact". The fixture
  // imports `createPresentation` from the public `@heroui/react` entry, so a
  // successful mount is also the barrel-export proof (A-002/A-003).
  test("M-011 ios and android hosts derive touch+compact and present sheet", async () => {
    for (const platform of ["ios", "android"] as Platform[]) {
      const app = await openPresentation("probe", {
        platform,
        width: 390,
        height: 844,
      });

      await app.press("id:toggle");
      await app.waitFor("text:open=true");
      expect(app.texts()).toContain("presentation=sheet");
    }
  });
});
