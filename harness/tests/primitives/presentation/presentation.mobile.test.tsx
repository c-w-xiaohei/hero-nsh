import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions } from "nsh/test";

/*
 * Mobile assertions for the create-presentation mechanism unit, one test per
 * row of adapt-sheets/create-presentation.md §4 (M-001…M-010; M-011 lives in
 * `presentation.mobile.headless.test.tsx`, M-012 is the pickup fact itself).
 * The fixture is `harness/presentation.fixtures.tsx`, opened by
 * `host.params.case`/`scope`/`allowed`; every assertion reads what `nsh/test`
 * can observe — `texts()` and `app.setViewport`.
 *
 * Both environments are covered in the same file: the default (pointer,
 * which is also the desktop-parity baseline and carries the sheet-path
 * negative assertion M-002) and injected ones through `EnvironmentScope`
 * (params.scope = "touch", width left to the host window so the real
 * windowSize → width derivation is what produces compact/regular).
 */

type Scope = "" | "touch" | "touch-compact" | "regular";
type Allowed = "ps" | "pf";

// `open` resolves its entry against the test file; this file sits three
// levels below harness/, same as every other primitives test.
function openPresentation(
  caseName: string,
  params: { scope?: Scope; allowed?: Allowed } = {},
  options: Pick<OpenOptions, "platform" | "width" | "height"> = {},
): Promise<App> {
  return open("../../../presentation.fixtures.tsx", {
    platform: "windows",
    width: 1024,
    height: 768,
    ...options,
    host: {
      params: {
        case: caseName,
        ...(params.scope ? { scope: params.scope } : {}),
        ...(params.allowed ? { allowed: params.allowed } : {}),
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
  // adapt-sheets/create-presentation.md M-001 (A-001): the default pointer
  // environment at a regular window presents panel — desktop zero drift.
  test("M-001 default environment at 1024×768 presents panel", async () => {
    const app = await openPresentation(
      "probe",
      {},
      { width: 1024, height: 768 },
    );

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=panel");
  });

  // adapt-sheets/create-presentation.md M-002 (A-001, 负断言): a compact
  // window under the pointer environment still presents panel — the sheet
  // path does not exist without input="touch".
  test("M-002 default environment at 390×844 still presents panel — no sheet path under pointer", async () => {
    const app = await openPresentation(
      "probe",
      {},
      { width: 390, height: 844 },
    );

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=panel");
    expect(app.texts()).not.toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-003 (A-001): injected touch +
  // compact window (short side 390 < 640) presents sheet — both halves of
  // the auto rule hold.
  test("M-003 injected touch at 390×844 presents sheet", async () => {
    const app = await openPresentation(
      "probe",
      { scope: "touch" },
      { width: 390, height: 844 },
    );

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-004 (A-001): injected touch at a
  // regular window lacks the compact half, so the auto rule falls to panel.
  test("M-004 injected touch at 1024×768 presents panel — compact missing", async () => {
    const app = await openPresentation(
      "probe",
      { scope: "touch" },
      { width: 1024, height: 768 },
    );

    await openOverlay(app);
    expect(app.texts()).toContain("presentation=panel");
    expect(app.texts()).not.toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-005 (A-001): the value is computed
  // once on the open edge and held — rotating the window to regular while
  // the overlay is open must not swap sheet for panel (encapsulation §7).
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

  // adapt-sheets/create-presentation.md M-009 (A-001): a pinned prop beats
  // the auto rule outright, and once open the latch covers pin changes too —
  // flipping pin to "sheet" mid-open must not move the value.
  test("M-009 pin beats the auto rule, and the latch covers pin changes while open", async () => {
    // case=pin: pin="panel" fixed — under touch+compact the auto rule would
    // say sheet, the pin says panel.
    const pinned = await openPresentation(
      "pin",
      { scope: "touch" },
      { width: 390, height: 844 },
    );

    await openOverlay(pinned);
    expect(pinned.texts()).toContain("presentation=panel");
    expect(pinned.texts()).not.toContain("presentation=sheet");

    // case=pin-toggle: pin starts "panel"; the press flips it to "sheet"
    // while the overlay is open — the latched "panel" must not move.
    const toggled = await openPresentation(
      "pin-toggle",
      { scope: "touch" },
      { width: 390, height: 844 },
    );

    await openOverlay(toggled);
    expect(toggled.texts()).toContain("presentation=panel");

    await toggled.press("id:pin-toggle");
    await toggled.waitFor("text:pin=sheet");
    expect(toggled.texts()).toContain("presentation=panel");
    expect(toggled.texts()).not.toContain("presentation=sheet");
  });

  // adapt-sheets/create-presentation.md M-010 (A-001): `allowed` narrows the
  // codomain — auto wants sheet but ["panel","fullscreen"] has none, so the
  // result falls back to panel without leaving the set; with sheet allowed
  // the same environment still yields sheet.
  test("M-010 allowed narrows the auto result: no sheet falls back to panel, sheet allowed stays sheet", async () => {
    const pf = await openPresentation(
      "allowed2",
      { scope: "touch", allowed: "pf" },
      { width: 390, height: 844 },
    );

    await openOverlay(pf);
    expect(pf.texts()).toContain("presentation=panel");
    expect(pf.texts()).not.toContain("presentation=sheet");

    const ps = await openPresentation(
      "allowed2",
      { scope: "touch", allowed: "ps" },
      { width: 390, height: 844 },
    );

    await openOverlay(ps);
    expect(ps.texts()).toContain("presentation=sheet");
  });
});
