import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the environment mechanism unit, one test per row of
 * adapt-sheets/environment.md §4 (M-001…M-008, M-010; the desktop
 * platform-spoof and window-size halves live in
 * `environment.mobile.headless.test.tsx`). The fixture is
 * `harness/environment.fixtures.tsx`, opened by `host.params.case`/`scope`/
 * `pointer`; every assertion reads what `nsh/test` can observe — `texts()`
 * and the `@scenario/probe` calls in `app.storage()`.
 *
 * No `platform`/`width`/`height` open options: native iOS/Android hosts run
 * this file with their real screen and platform and reject those options,
 * so every test either injects the environment it needs through
 * `EnvironmentScope` (params.scope — "pointer" included, since a real
 * phone's default is touch) or derives its expectations from the fixture's
 * `env` probe (the host's `platform` facts and the real `windowSize`). The
 * default-environment rows therefore run meaningfully on every host: a real
 * phone reports touch + its own width class, a desktop or web host reports
 * pointer + its own.
 */

type Scope = "" | "touch" | "pointer" | "density" | "nested";

// `open` resolves its entry against the test file; this file sits three
// levels below harness/, same as every other primitives test.
async function openEnvironment(
  caseName: string,
  params: { scope?: Scope; pointer?: string } = {},
): Promise<App> {
  const app = await open("../../../environment.fixtures.tsx", {
    host: {
      params: {
        case: caseName,
        ...(params.scope ? { scope: params.scope } : {}),
        ...(params.pointer ? { pointer: params.pointer } : {}),
      },
    },
  });
  // The fixture's mount-time `env` probe writes Storage asynchronously;
  // `open` resolving does not guarantee the write is visible yet, and
  // `envOf`/`derived` read it unconditionally in several tests.
  await app.waitUntil(() => callsOf(app, "env").length > 0);
  return app;
}

type EnvReport = {
  os: string;
  desktop: boolean;
  idiom: string;
  w: number;
  h: number;
};

/** The host platform/window report the fixture probes once per mount. */
function envOf(app: App): EnvReport {
  return callsOf(app, "env").at(-1)?.[0] as EnvReport;
}

/**
 * What the default environment must report on this host: `input` follows
 * `platform.desktop` (touch on iOS/Android and mobile browsers, pointer on
 * desktops and desktop-idiom web), `width` follows the real window's short
 * side against the 640-point compact threshold.
 */
function derived(app: App): { input: string; width: string } {
  const env = envOf(app);
  return {
    input: env.desktop ? "pointer" : "touch",
    width: Math.min(env.w, env.h) < 640 ? "compact" : "regular",
  };
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
  // adapt-sheets/environment.md M-001 (A-001): the default environment
  // derives input from platform.desktop and width from the window's short
  // side — asserted against the host's own report, so a real phone proves
  // touch + compact while a desktop or web host proves pointer + regular.
  // The explicit host-spoof half (open's platform option, headless-only)
  // stays in `environment.mobile.headless.test.tsx`.
  test("M-001 default environment reports the host-derived input, default density and the host width class", async () => {
    const app = await openEnvironment("fields");

    const env = envOf(app);
    const expected = derived(app);
    expect(app.texts()).toContain(`input=${expected.input}`);
    expect(app.texts()).toContain("density=default");
    expect(app.texts()).toContain("densityKey=default");
    // The reported window size is the one the width class derived from —
    // a phone's real screen on native, the headless window or web page
    // locally. No viewport is forced.
    expect(env.w).toBeGreaterThan(0);
    expect(env.h).toBeGreaterThan(0);
    expect(app.texts()).toContain(`width=${expected.width}`);
  });

  // adapt-sheets/environment.md M-002 (A-002): a partial EnvironmentScope
  // overrides only the fields it names.
  test("M-002 EnvironmentScope input=touch changes input and keeps density and width", async () => {
    const app = await openEnvironment("fields", { scope: "touch" });

    expect(app.texts()).toContain("input=touch");
    expect(app.texts()).toContain("density=default");
    expect(app.texts()).toContain(`width=${derived(app).width}`);
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

    const widths = app.texts().filter((text) => text.startsWith("width="));
    // The inner scope pins width=regular; the outer probe reads the
    // host-derived class (a real phone's short side yields compact).
    expect(widths).toContain("width=regular");
    expect(widths).toContain(`width=${derived(app).width}`);
  });

  // adapt-sheets/environment.md M-004 (A-003, A-004): a non-default density
  // preset flows through createDensity() and stays inside the
  // EnvironmentDensity domain — densityKey() resolves it, not "default".
  test("M-004 EnvironmentScope density=compact reaches createDensity and the densityKey lookup", async () => {
    const app = await openEnvironment("fields", { scope: "density" });

    expect(app.texts()).toContain("density=compact");
    expect(app.texts()).toContain("densityKey=compact");
    // Untouched fields keep the outer (host-derived) values.
    const expected = derived(app);
    expect(app.texts()).toContain(`input=${expected.input}`);
    expect(app.texts()).toContain(`width=${expected.width}`);
  });

  // adapt-sheets/environment.md M-005 (A-006): under an injected touch
  // environment a press on a selected item toggles it off; under an
  // injected pointer environment the same press replaces and keeps it.
  test("M-005 touch environment toggles a selected item on press; pointer environment replaces", async () => {
    const touch = await openEnvironment("selection", { scope: "touch" });
    await pressAndSettle(touch, "press");
    expect(lastCall<SelectionResult>(touch, "selection").selected).toEqual([]);

    const pointer = await openEnvironment("selection", { scope: "pointer" });
    await pressAndSettle(pointer, "press");
    expect(lastCall<SelectionResult>(pointer, "selection").selected).toEqual([
      "banana",
    ]);
  });

  // adapt-sheets/environment.md M-006 (A-006, 负断言): without a touch
  // injection the toggle path must not exist — repeated presses under an
  // explicit pointer environment keep the replace result, never emptying
  // the selection.
  test("M-006 pointer environment: repeated presses never toggle the selection off", async () => {
    const app = await openEnvironment("selection", { scope: "pointer" });

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
  test("M-007 setPointerModality() reports touch under injected touch, mouse under injected pointer", async () => {
    const touch = await openEnvironment("modality", { scope: "touch" });
    await pressAndSettle(touch, "press-pointer");
    const touchResult = lastCall<ModalityResult>(touch, "modality");
    expect(touchResult.pointerType).toBe("touch");
    expect(touchResult.modality).toBe("pointer");

    const pointer = await openEnvironment("modality", { scope: "pointer" });
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

  // adapt-sheets/environment.md M-010 (A-005, A-008, A-009): the fixture
  // itself imports EnvironmentScope/createInput/densityKey from the public
  // `hero-nsh` entry; mounting and rendering the probe texts proves the
  // primitives barrel and the src/index.ts export line make the API reachable.
  test("M-010 EnvironmentScope, createInput and the density tokens are importable from the public entry", async () => {
    const app = await openEnvironment("fields", { scope: "touch" });

    expect(app.shows("text:input=touch")).toBe(true);
    expect(app.shows("text:density=default")).toBe(true);
    expect(app.shows("text:densityKey=default")).toBe(true);
    expect(app.shows(`text:width=${derived(app).width}`)).toBe(true);
  });
});
