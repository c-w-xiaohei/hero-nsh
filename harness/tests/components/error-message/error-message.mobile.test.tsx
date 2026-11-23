import { describe, expect, open, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";

/*
 * Mobile assertions for the error-message adapt unit, one test per row of
 * adapt-sheets/error-message.md §4 (M-001…M-008). The fixture is
 * `harness/error-message.fixtures.tsx`: "in-container" and "gated" mount the
 * probed ErrorMessage inside a handwritten `FieldErrorContext.Provider`
 * (TagGroup's only relevant contribution, not ported yet), "bare" mounts it
 * with no provider; every case sits inside `EnvironmentScope` driven by
 * `host.params.input` / `host.params.density`.
 *
 * The environment axes are always explicit: `input:"pointer"` is the
 * desktop-parity baseline every assertion compares against and
 * `input:"touch"` the injected mobile half, because the host-derived
 * default differs per target (touch on ios/android, pointer on desktop
 * and web). No `platform`/`width` open options: native targets fill the
 * device screen and reject them.
 *
 * ErrorMessage is a non-interactive text part: the sheet keeps every 落点 at
 * "保留" — no `input`/`density` axis, no gesture owner, no presentation —
 * so the injected-environment assertions prove that nothing moves, not that
 * something changed. The observation channel is what `nsh/test` sees:
 * `shows`/`texts` for the message, `spanStyle` for text-xs + text-danger,
 * `onLayout` bounds for the partClass offset, and `app.storage()` probe
 * calls for register/unregister.
 */

const MESSAGE = "Please select at least one category";
const MESSAGE_SELECTOR = `text:${MESSAGE}`;

// The harness theme's light `danger` token resolves to #ff383cff — the same
// value the .heroui.test.tsx baseline asserts for `text-danger`.
const DANGER = "#ff383cff";

type Box = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EnvParams = {
  input?: "pointer" | "touch";
  density?: "default" | "compact";
};

function openMobile(caseName: string, env: EnvParams = {}): Promise<App> {
  return open("../../../error-message.fixtures.tsx", {
    host: {
      params: {
        case: caseName,
        ...(env.input ? { input: env.input } : {}),
        ...(env.density ? { density: env.density } : {}),
      },
    },
  });
}

/** The message's probed onLayout boxes, deduplicated (it can fire more than once). */
function messageBoxes(app: App): string[] {
  const set = new Set<string>();
  for (const args of callsOf(app, "layout")) {
    const box = args[0] as Box;
    if (box.name === "message") {
      set.add(
        JSON.stringify({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        }),
      );
    }
  }
  return [...set].sort();
}

async function settleLayout(app: App): Promise<void> {
  await app.waitUntil(() => messageBoxes(app).length > 0);
}

/** The cross-environment snapshot: everything the sheet asks to stay identical. */
function snapshot(app: App): {
  shown: boolean;
  texts: string[];
  fontSize: number;
  color: string;
  boxes: string[];
} {
  return {
    shown: app.shows(MESSAGE_SELECTOR),
    texts: app.texts(),
    fontSize: app.spanStyle(MESSAGE_SELECTOR).fontSize,
    color: app.spanStyle(MESSAGE_SELECTOR).color,
    boxes: messageBoxes(app),
  };
}

describe("error-message mobile", () => {
  // adapt-sheets/error-message.md M-001 (baseline): the default environment —
  // pointer + default density, no injected params — renders the message with
  // the same text, the same resolved text-xs/text-danger, and one field
  // registration, matching the .heroui.test.tsx desktop baseline exactly.
  test("M-001 default environment: text, style and registration match the desktop baseline", async () => {
    const app = await openMobile("in-container", { input: "pointer" });

    expect(app.shows(MESSAGE_SELECTOR)).toBe(true);
    expect(app.texts()).toContain(MESSAGE);
    expect(callsOf(app, "error-message.registered")).toEqual([[MESSAGE]]);

    const style = app.spanStyle(MESSAGE_SELECTOR);

    expect(style.fontSize).toBe(12);
    expect(style.color).toBe(DANGER);
  });

  // adapt-sheets/error-message.md M-002 (baseline): caller gating owns the
  // mount — pressing `clear` removes the message — and the container's
  // `partClass: "p-1"` lands on the message box, which `onLayout` reports
  // (the descendant-class channel works in the default environment just as
  // on the mobile side): bare's text box is content height only (15), the
  // container's carries the 4pt padding on both sides (23).
  test("M-002 default environment: caller gate removes the message; partClass pads its box", async () => {
    const app = await openMobile("gated", { input: "pointer" });

    expect(app.shows(MESSAGE_SELECTOR)).toBe(true);
    expect(callsOf(app, "error-message.registered")).toEqual([[MESSAGE]]);

    await settleLayout(app);
    const gatedBoxes = messageBoxes(app);

    const bare = await openMobile("bare", { input: "pointer" });
    await settleLayout(bare);

    const gatedBox = JSON.parse(gatedBoxes[0]!) as Omit<Box, "name">;
    const bareBox = JSON.parse(messageBoxes(bare)[0]!) as Omit<Box, "name">;
    expect(gatedBox.height).toBe(bareBox.height + 8);

    await app.press("id:clear");
    await app.waitUntil(() => !app.shows(MESSAGE_SELECTOR));

    expect(app.shows(MESSAGE_SELECTOR)).toBe(false);
  });

  // adapt-sheets/error-message.md M-003 (A-001, A-002): the `input` axis is
  // not wired — a non-interactive text part has no hit-area, hover or touch
  // feedback responsibility — so under injected touch every observable stays
  // identical to the pointer default across all three cases.
  test("M-003 injected touch: every observable matches the pointer default", async () => {
    for (const caseName of ["in-container", "gated", "bare"]) {
      const pointer = await openMobile(caseName, { input: "pointer" });
      const touch = await openMobile(caseName, { input: "touch" });

      await settleLayout(pointer);
      await settleLayout(touch);

      expect(snapshot(touch)).toEqual(snapshot(pointer));
      expect(callsOf(touch, "error-message.registered")).toEqual(
        callsOf(pointer, "error-message.registered"),
      );
    }
  });

  // adapt-sheets/error-message.md M-004 (A-001): the component's variant
  // table carries no density cell — text-xs is a typography contract, not
  // spacing — so a `density="compact"` scope produces no class difference;
  // bounds and span style stay identical to the default environment.
  test("M-004 injected density compact: bounds and span style unchanged", async () => {
    const plain = await openMobile("in-container", { input: "pointer" });
    const compact = await openMobile("in-container", {
      input: "touch",
      density: "compact",
    });

    await settleLayout(plain);
    await settleLayout(compact);

    expect(snapshot(compact)).toEqual(snapshot(plain));
  });

  // adapt-sheets/error-message.md M-005 (A-003): the registration channel is
  // environment-blind — under injected touch the probe still records the
  // children string exactly once, and unmounting the gated message fires the
  // unregister cleanup so the field no longer holds the text.
  test("M-005 injected touch: registration and unregistration behave as under pointer", async () => {
    const app = await openMobile("in-container", { input: "touch" });

    expect(callsOf(app, "error-message.registered")).toEqual([[MESSAGE]]);

    const gated = await openMobile("gated", { input: "touch" });

    expect(callsOf(gated, "error-message.registered")).toEqual([[MESSAGE]]);

    await gated.press("id:clear");
    await gated.waitUntil(() => !gated.shows(MESSAGE_SELECTOR));

    expect(callsOf(gated, "error-message.unregistered")).toHaveLength(1);
    expect(gated.shows(MESSAGE_SELECTOR)).toBe(false);
  });

  // adapt-sheets/error-message.md M-006 (A-005): the message owns no press or
  // gesture path — pressing it under injected touch records no component
  // callback and changes nothing (focusable=false keeps it out of the
  // interaction surface; nsh/test cannot query focus, so the no-op press is
  // the observable half).
  test("M-006 injected touch: pressing the message does nothing", async () => {
    const app = await openMobile("in-container", { input: "touch" });

    expect(callsOf(app, "error-message.registered")).toEqual([[MESSAGE]]);

    // The message itself is not a pressable view and nothing around it hears
    // presses either — the step rejects with NOT_FOUND, which is the
    // observable half of "no press path".
    await expect(app.press(MESSAGE_SELECTOR)).rejects.toMatchObject({
      code: "ERR_NSH_TEST_NOT_FOUND",
    });

    expect(app.shows(MESSAGE_SELECTOR)).toBe(true);
    expect(callsOf(app, "error-message.registered")).toEqual([[MESSAGE]]);
    expect(callsOf(app, "error-message.unregistered")).toEqual([]);
  });

  // adapt-sheets/error-message.md M-007 (A-006): the bare case renders
  // without a Provider — the registration channel idles without crashing —
  // and injected input/density change nothing on it.
  test("M-007 bare case: renders with no provider, no registration, stable under injection", async () => {
    const plain = await openMobile("bare", { input: "pointer" });

    expect(plain.shows(MESSAGE_SELECTOR)).toBe(true);
    expect(plain.texts()).toContain(MESSAGE);
    expect(callsOf(plain, "error-message.registered")).toEqual([]);

    await settleLayout(plain);

    for (const env of [
      { input: "touch" },
      { input: "pointer", density: "compact" },
    ] as EnvParams[]) {
      const injected = await openMobile("bare", env);
      await settleLayout(injected);

      expect(snapshot(injected)).toEqual(snapshot(plain));
      expect(callsOf(injected, "error-message.registered")).toEqual([]);
    }
  });

  // adapt-sheets/error-message.md M-008 (A-007): the pointer baseline
  // itself — `input:"pointer"` scope is what the old desktop pin derived,
  // and it must keep every M-001/M-002 observation identical on whichever
  // host the file runs on: the scope, not the launch platform, owns the
  // baseline now.
  test("M-008 pointer baseline: default-environment assertions hold under the pointer scope", async () => {
    const app = await openMobile("in-container", { input: "pointer" });

    expect(app.shows(MESSAGE_SELECTOR)).toBe(true);
    expect(callsOf(app, "error-message.registered")).toEqual([[MESSAGE]]);
    expect(app.spanStyle(MESSAGE_SELECTOR).fontSize).toBe(12);
    expect(app.spanStyle(MESSAGE_SELECTOR).color).toBe(DANGER);

    const gated = await openMobile("gated", { input: "pointer" });

    expect(gated.shows(MESSAGE_SELECTOR)).toBe(true);

    await gated.press("id:clear");
    await gated.waitUntil(() => !gated.shows(MESSAGE_SELECTOR));

    expect(gated.shows(MESSAGE_SELECTOR)).toBe(false);
  });
});
