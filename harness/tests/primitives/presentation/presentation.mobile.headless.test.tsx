import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions, Platform } from "nsh/test";

/*
 * Local (headless/web-tooling) assertions for the create-presentation
 * mechanism unit — the rows of adapt-sheets/create-presentation.md §4 that
 * need what a native iOS/Android host cannot provide: `open`'s `platform`
 * and `width`/`height` options (M-011, the M-005…M-008 latch rows) and
 * `app.setViewport` (the same latch rows — a real phone's screen cannot be
 * resized mid-test), so they live here instead of in
 * `presentation.mobile.test.tsx`. The `.mobile.headless.` suffix keeps the
 * file out of the native target list; it runs locally on headless only —
 * the M-011 `platform:"ios"`/`"android"` spoof row rejects under
 * `--target web` with ERR_NSH_TEST_UNSUPPORTED.
 */

type Scope = "" | "touch" | "touch-compact" | "pointer-compact" | "regular";

function openPresentation(
  caseName: string,
  params: { scope?: Scope } = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../presentation.fixtures.tsx", {
    platform: "windows",
    width: 390,
    height: 844,
    ...options,
    host: {
      params: {
        case: caseName,
        ...(params.scope ? { scope: params.scope } : {}),
      },
    },
  });
}

/*
 * The fixture mounts with `open=false` already on screen, so waiting for
 * `text:open=false` would resolve on the stale mount state. Each helper
 * waits for the state that can only exist after the press: `open=true` after
 * toggle-on (never shown before), `open=false` after toggle-off (the open
 * state replaced it, so it is absent until the close renders).
 */
async function openOverlay(app: App): Promise<void> {
  await app.press("id:toggle");
  await app.waitFor("text:open=true");
}

async function closeOverlay(app: App): Promise<void> {
  await app.press("id:toggle");
  await app.waitFor("text:open=false");
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
      const app = await openPresentation("probe", {}, {
        platform,
        width: 390,
        height: 844,
      });

      await app.press("id:toggle");
      await app.waitFor("text:open=true");
      expect(app.texts()).toContain("presentation=sheet");
    }
  });

  // adapt-sheets/create-presentation.md M-005 (A-001): the value is computed
  // once on the open edge and held — rotating the window to regular while
  // the overlay is open must not swap sheet for panel (encapsulation §7).
  // Moved verbatim from `presentation.mobile.test.tsx`: setViewport and
  // `open`'s width/height reject on native iOS/Android.
  test("M-005 touch+compact latched: rotating to regular while open keeps sheet", async () => {
    const app = await openPresentation(
      "probe",
      { scope: "touch" },
      { width: 390, height: 844 },
    );

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=sheet");

    await app.setViewport(1024, 768);
    expect(app.texts()).toContain("presentation=sheet");
    expect(app.texts()).not.toContain("presentation=panel");
  });

  // adapt-sheets/create-presentation.md M-006 (A-001): the reverse latch —
  // shrinking to compact while a panel is open must not upgrade it to sheet.
  test("M-006 touch+regular latched: shrinking to compact while open keeps panel", async () => {
    const app = await openPresentation(
      "probe",
      { scope: "touch" },
      { width: 1024, height: 768 },
    );

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=panel");

    await app.setViewport(390, 844);
    expect(app.texts()).toContain("presentation=panel");
    expect(app.texts()).not.toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-007 (A-001): the width class is a
  // short-side rule, not a width rule — a landscape phone (844×390, short
  // side still <640) is compact and presents sheet.
  test("M-007 touch landscape 844×390 (short side under 640) presents sheet", async () => {
    const app = await openPresentation(
      "probe",
      { scope: "touch" },
      { width: 844, height: 390 },
    );

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-008 (A-001): the latch releases on
  // close — reopening after the rotation re-evaluates against the new
  // environment and yields panel (the M-005 end state continued).
  test("M-008 closing releases the latch: reopen after rotation re-evaluates to panel", async () => {
    const app = await openPresentation(
      "probe",
      { scope: "touch" },
      { width: 390, height: 844 },
    );

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=sheet");

    await app.setViewport(1024, 768);
    await closeOverlay(app);
    await openOverlay(app);
    expect(app.texts()).toContain("presentation=panel");
    expect(app.texts()).not.toContain("presentation=sheet");
  });
});
