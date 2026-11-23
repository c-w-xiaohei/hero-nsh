import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions, Platform } from "nsh/test";

/*
 * Local (headless/web-tooling) assertions for the environment mechanism
 * unit — the rows of adapt-sheets/environment.md §4 that need `open`
 * options a native iOS/Android host rejects (`width`/`height`,
 * `platform`), so they live here instead of in
 * `environment.mobile.test.tsx`. The file's `.mobile.headless.` suffix
 * keeps it out of the native target list; it runs locally on headless
 * only — the M-001 `platform:"ios"`/`"android"` spoof row rejects under
 * `--target web` with ERR_NSH_TEST_UNSUPPORTED.
 */

type Scope = "" | "touch" | "density" | "nested";

function openEnvironment(
  caseName: string,
  params: { scope?: Scope } = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../environment.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: {
      params: {
        case: caseName,
        ...(params.scope ? { scope: params.scope } : {}),
      },
    },
  });
}

describe("environment", () => {
  // adapt-sheets/environment.md M-001 (A-001): `open`'s platform drives the
  // default environment — ios/android yield touch input and, at phone size,
  // the compact width class.
  test("M-001 host derivation: ios and android report touch", async () => {
    for (const platform of ["ios", "android"] as Platform[]) {
      const app = await openEnvironment("fields", {}, {
        platform,
        width: 390,
        height: 844,
      });
      expect(app.texts()).toContain("input=touch");
      // 390×844 phone: short side 390 < 640 → compact.
      expect(app.texts()).toContain("width=compact");
    }
  });

  // The same row's derivation half: desktop platforms keep the desktop idiom
  // on every local target (a desktop's `platform` is legal under
  // `--target web`). Moved verbatim from `environment.mobile.test.tsx`:
  // `open`'s `platform` option rejects on native iOS/Android.
  test("M-001 host derivation: windows and web report pointer", async () => {
    for (const platform of ["windows", "web"] as Platform[]) {
      const app = await openEnvironment(
        "fields",
        {},
        { platform, width: 1024, height: 768 },
      );
      expect(app.texts()).toContain("input=pointer");
      expect(app.texts()).toContain("width=regular");
    }
  });

  // adapt-sheets/environment.md M-009 (A-001): the width class follows the
  // short side of the window open() was given — here on a desktop platform,
  // so the compact result cannot come from input=touch. Moved verbatim from
  // `environment.mobile.test.tsx`: `open`'s `width`/`height` reject on
  // native iOS/Android, where the real phone screen is already compact.
  test("M-009 width is compact when the window's short side is under 640 points", async () => {
    const portrait = await openEnvironment(
      "fields",
      {},
      { width: 500, height: 800 },
    );
    expect(portrait.texts()).toContain("input=pointer");
    expect(portrait.texts()).toContain("width=compact");

    // Landscape with a short side still under 640 stays compact (844×390).
    const landscape = await openEnvironment(
      "fields",
      {},
      { width: 844, height: 390 },
    );
    expect(landscape.texts()).toContain("width=compact");

    // The boundary itself is regular: short side exactly 640.
    const boundary = await openEnvironment(
      "fields",
      {},
      { width: 800, height: 640 },
    );
    expect(boundary.texts()).toContain("width=regular");
  });
});
