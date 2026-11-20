import { describe, expect, open, test } from "nsh/test";
import type { App, OpenOptions, Platform } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the environment mechanism unit, one test per row of
 * adapt-sheets/environment.md §4 (M-001…M-010). The fixture is
 * `harness/environment.fixtures.tsx`, opened by `host.params.case`/`scope`/
 * `pointer`; every assertion reads what `nsh/test` can observe — `texts()`
 * and the `@scenario/probe` calls in `app.storage()`.
 *
 * Both environments are covered in the same file: the default (pointer,
 * which is also the desktop-parity baseline) and injected ones through
 * `EnvironmentScope` (params.scope) or the host itself (`open`'s `platform`).
 */

type Scope = "" | "touch" | "density" | "nested";

// `open` resolves its entry against the test file; this file sits three
// levels below harness/, same as every other primitives test.
function openEnvironment(
  caseName: string,
  params: { scope?: Scope; pointer?: string } = {},
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
        ...(params.pointer ? { pointer: params.pointer } : {}),
      },
    },
  });
}

type SelectionResult = { selected: string[]; focusedKey: string | null };
type ModalityResult = { pointerType: string | null; modality: string | null };

function lastCall<T>(app: App, name: string): T {
  const calls = callsOf(app, name);
  return calls[calls.length - 1][0] as T;
}

async function pressAndSettle(app: App, id: string): Promise<void> {
  const before =
    callsOf(app, "selection").length + callsOf(app, "modality").length;
  await app.press(`id:${id}`);
  await app.waitUntil(
    () =>
      callsOf(app, "selection").length + callsOf(app, "modality").length >
      before,
  );
}

describe("environment", () => {
  // adapt-sheets/environment.md M-001 (A-001): the default environment derives
  // input from platform.desktop and width from the window's short side.
  test("M-001 default environment reports pointer input, default density and the host width class", async () => {
    const app = await openEnvironment("fields");

    expect(app.texts()).toContain("input=pointer");
    expect(app.texts()).toContain("density=default");
    expect(app.texts()).toContain("densityKey=default");
    // 1024×768: the short side is 768 ≥ 640, so the window is regular.
    expect(app.texts()).toContain("width=regular");
  });

  // The same row's derivation half: desktop platforms keep the desktop idiom
  // on every local target (a desktop's `platform` is legal under
  // `--target web`). The phone half lives in
  // `environment.mobile.headless.test.tsx`: `open({platform: "ios" |
  // "android"})` is headless-only and rejects on `--target web`
  // (ERR_NSH_TEST_UNSUPPORTED).
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

  // adapt-sheets/environment.md M-002 (A-002): a partial EnvironmentScope
  // overrides only the fields it names.
  test("M-002 EnvironmentScope input=touch changes input and keeps density and width", async () => {
    const app = await openEnvironment("fields", { scope: "touch" });

    expect(app.texts()).toContain("input=touch");
    expect(app.texts()).toContain("density=default");
    expect(app.texts()).toContain("width=regular");
  });

  // adapt-sheets/environment.md M-003 (A-002): nested scopes merge
  // field-by-field, innermost wins, and leaving the inner subtree restores
  // the outer value.
  test("M-003 nested EnvironmentScope: the inner override wins inside, the outer value outside", async () => {
    const app = await openEnvironment("fields", { scope: "nested" });

    const inputs = app.texts().filter((text) => text.startsWith("input="));
    // Two probes: the inner scope's (input=pointer, width=regular) and the
    // outer scope's (input=touch, host width). Both must appear — the inner
    // wins where it applies, the outer survives outside it.
    expect(inputs).toContain("input=pointer");
    expect(inputs).toContain("input=touch");
    expect(inputs).toHaveLength(2);

    expect(app.texts()).toContain("width=regular");
  });

  // adapt-sheets/environment.md M-004 (A-003, A-004): a non-default density
  // preset flows through createDensity() and stays inside the
  // EnvironmentDensity domain — densityKey() resolves it, not "default".
  test("M-004 EnvironmentScope density=compact reaches createDensity and the densityKey lookup", async () => {
    const app = await openEnvironment("fields", { scope: "density" });

    expect(app.texts()).toContain("density=compact");
    expect(app.texts()).toContain("densityKey=compact");
    // Untouched fields keep the outer (default) values.
    expect(app.texts()).toContain("input=pointer");
    expect(app.texts()).toContain("width=regular");
  });

  // adapt-sheets/environment.md M-005 (A-006): under an injected touch
  // environment a press on a selected item toggles it off; under the default
  // environment the same press replaces and keeps it.
  test("M-005 touch environment toggles a selected item on press; default environment replaces", async () => {
    const touch = await openEnvironment("selection", { scope: "touch" });
    await pressAndSettle(touch, "press");
    expect(lastCall<SelectionResult>(touch, "selection").selected).toEqual([]);

    const pointer = await openEnvironment("selection");
    await pressAndSettle(pointer, "press");
    expect(lastCall<SelectionResult>(pointer, "selection").selected).toEqual([
      "banana",
    ]);
  });

  // adapt-sheets/environment.md M-006 (A-006, 负断言): without a touch
  // injection the toggle path must not exist — repeated presses keep the
  // replace result, never emptying the selection.
  test("M-006 default environment: repeated presses never toggle the selection off", async () => {
    const app = await openEnvironment("selection");

    await pressAndSettle(app, "press");
    expect(lastCall<SelectionResult>(app, "selection").selected).toEqual([
      "banana",
    ]);

    await pressAndSettle(app, "press");
    expect(lastCall<SelectionResult>(app, "selection").selected).toEqual([
      "banana",
    ]);
  });

  // adapt-sheets/environment.md M-007 (A-007): setPointerModality() with no
  // argument derives the pointer type from the environment.
  test("M-007 setPointerModality() reports touch under injected touch, mouse by default", async () => {
    const touch = await openEnvironment("modality", { scope: "touch" });
    await pressAndSettle(touch, "press-pointer");
    const touchResult = lastCall<ModalityResult>(touch, "modality");
    expect(touchResult.pointerType).toBe("touch");
    expect(touchResult.modality).toBe("pointer");

    const pointer = await openEnvironment("modality");
    await pressAndSettle(pointer, "press-pointer");
    const pointerResult = lastCall<ModalityResult>(pointer, "modality");
    expect(pointerResult.pointerType).toBe("mouse");
    expect(pointerResult.modality).toBe("pointer");
  });

  // adapt-sheets/environment.md M-008 (A-006, A-007): explicit overrides beat
  // the injected environment on both seams.
  test("M-008 explicit pointerType arguments and props win over the injected touch environment", async () => {
    // Interaction modality: setPointerModality("pen") stays "pen".
    const modality = await openEnvironment("modality", { scope: "touch" });
    await pressAndSettle(modality, "press-explicit");
    expect(lastCall<ModalityResult>(modality, "modality").pointerType).toBe(
      "pen",
    );

    // Selectable item: pointerType="mouse" prop keeps the replace path, so
    // the pre-selected item survives the press even under input="touch".
    const item = await openEnvironment("selection", {
      scope: "touch",
      pointer: "mouse",
    });
    await pressAndSettle(item, "press");
    expect(lastCall<SelectionResult>(item, "selection").selected).toEqual([
      "banana",
    ]);
  });

  // adapt-sheets/environment.md M-009 (A-001): the width class follows the
  // short side of the window open() was given — here on a desktop platform,
  // so the compact result cannot come from input=touch.
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

  // adapt-sheets/environment.md M-010 (A-005, A-008, A-009): the fixture
  // itself imports EnvironmentScope/createInput/densityKey from the public
  // `hero-nsh` entry; mounting and rendering the probe texts proves the
  // primitives barrel and the src/index.ts export line make the API reachable.
  test("M-010 EnvironmentScope, createInput and the density tokens are importable from the public entry", async () => {
    const app = await openEnvironment("fields", { scope: "touch" });

    expect(app.shows("text:input=touch")).toBe(true);
    expect(app.shows("text:density=default")).toBe(true);
    expect(app.shows("text:densityKey=default")).toBe(true);
    expect(app.shows("text:width=regular")).toBe(true);
  });
});
