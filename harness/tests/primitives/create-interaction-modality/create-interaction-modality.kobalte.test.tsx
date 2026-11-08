/*
 * Upstream: there is no Kobalte primitive or test for this file. Kobalte never
 * tracks an interaction modality; it relies on the browser's `:focus-visible`.
 * NSH has no such selector (`focus-visible:` is `focus:`), so the primitive is
 * the NSH counterpart of React Aria's interaction modality store
 * (`@react-aria/interactions` `useFocusVisible` / `useInteractionModality`),
 * ported at kobaltedev/kobalte commit 675b4a11f4's react-spectrum tree.
 *
 * The React Aria tests listen on `document` for `keydown` / `pointerdown`;
 * NSH exposes neither to TypeScript, so those titles are kept below with
 * `test.skip` and the event-driven cases exercise the same contract through
 * the events an owner actually receives (press, key command, focus).
 */

import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type Modality = "keyboard" | "pointer" | null;
type PointerType = "mouse" | "pen" | "touch" | null;

type Result = {
  initial: {
    modality: Modality;
    pointerType: PointerType;
    isKeyboard: boolean;
    isPointer: boolean;
  };
  modality: Modality;
  pointerType: PointerType;
  isKeyboard: boolean;
  isPointer: boolean;
  changes: [Modality, PointerType][];
};

async function run(caseName: string): Promise<Result> {
  const app = await openScenario("primitives/interaction-modality", {
    params: { case: caseName },
  });
  await app.press("id:run");
  await app.waitUntil(() => callsOf(app, "result").length > 0);
  return callsOf(app, "result")[0][0] as Result;
}

describe("createInteractionModality", () => {
  test("starts without a modality", async () => {
    const result = await run("initial");

    expect(result.initial.modality).toBeNull();
    expect(result.initial.pointerType).toBeNull();
    expect(result.initial.isKeyboard).toBe(false);
    expect(result.initial.isPointer).toBe(false);
    expect(result.changes).toEqual([]);
  });

  test("a pointer interaction sets the pointer modality", async () => {
    const result = await run("pointer");

    expect(result.modality).toBe("pointer");
    expect(result.pointerType).toBe("mouse");
    expect(result.isPointer).toBe(true);
    expect(result.isKeyboard).toBe(false);
    expect(result.changes).toEqual([["pointer", "mouse"]]);
  });

  test("keeps the pointer type the caller reports", async () => {
    const result = await run("pointer-touch");

    expect(result.modality).toBe("pointer");
    expect(result.pointerType).toBe("touch");
    expect(result.changes).toEqual([["pointer", "touch"]]);
  });

  test("a keyboard interaction sets the keyboard modality", async () => {
    const result = await run("keyboard");

    expect(result.modality).toBe("keyboard");
    expect(result.pointerType).toBeNull();
    expect(result.isKeyboard).toBe(true);
    expect(result.isPointer).toBe(false);
  });

  test("focus is a keyboard interaction", async () => {
    const result = await run("focus");

    expect(result.modality).toBe("keyboard");
    expect(result.changes).toEqual([["keyboard", null]]);
  });

  test("reports a change once, not once per event", async () => {
    const result = await run("change-once");

    expect(result.modality).toBe("keyboard");
    expect(result.changes).toEqual([
      ["pointer", "mouse"],
      ["keyboard", null],
    ]);
  });

  test("resets to the default modality", async () => {
    const result = await run("reset");

    expect(result.modality).toBeNull();
    expect(result.pointerType).toBeNull();
    expect(result.changes).toEqual([["keyboard", null]]);
  });

  test("can start in keyboard modality", async () => {
    const result = await run("default-keyboard");

    expect(result.initial.modality).toBe("keyboard");
    expect(result.initial.isKeyboard).toBe(true);
    expect(result.changes).toEqual([]);
  });

  /*
   * DOM-only upstream cases.
   */
  test.skip(
    // NSH has no document-level keydown: keys arrive as an input's onKeyPress or a keymap command.
    "should use keyboard modality on keydown anywhere in the document (DOM-only: no document keydown in NSH)",
    () => {},
  );

  test.skip(
    // NSH has no document-level pointerdown: a view hears its own presses, and outside presses belong to Overlay or Dialog.
    "should use pointer modality on pointerdown anywhere in the document (DOM-only: no document pointerdown in NSH)",
    () => {},
  );

  test.skip(
    // NSH's PressEvent carries no pointerType; the caller reports it to setPointerModality.
    "should set the pointer type from touchstart / mousedown / pointerdown (DOM-only: PressEvent has no pointerType)",
    () => {},
  );
});

/*
 * V4 of research section 10: what NSH actually delivers to TypeScript for keys,
 * focus, Tab order and pointer presses. These are not upstream tests; they
 * exist so the research row is backed by a real run.
 */
describe("V4 key and focus events on a real engine", () => {
  function events(app: App): string[] {
    return callsOf(app, "event").map((call) => {
      const name = String(call[0]);
      const value = call[1];
      if (name === "keymap") {
        return `${name}:${String((value as { keystroke?: unknown }).keystroke)}`;
      }
      return `${name}:${String(value)}`;
    });
  }

  test("Tab moves focus through focusable views in tree order", async () => {
    const app = await openScenario("v4/events", {
      params: { case: "events" },
      platform: "web",
    });

    await app.keyboard.press("tab");
    await app.waitUntil(() => events(app).includes("focus:a"));
    expect(events(app)).toContain("focus:a");

    await app.keyboard.press("tab");
    await app.waitUntil(() => events(app).includes("focus:b"));
    expect(events(app)).toContain("blur:a");
    expect(events(app)).toContain("focus:b");
  });

  test("the app's keymap hears named keys, arrows included", async () => {
    const app = await openScenario("v4/events", {
      params: { case: "events" },
      platform: "web",
    });

    await app.keyboard.press("k");
    await app.waitUntil(() => events(app).includes("keymap:k"));
    expect(events(app)).toContain("keymap:k");

    await app.keyboard.press("down");
    await app.waitUntil(() => events(app).includes("keymap:down"));
    expect(events(app)).toContain("keymap:down");
  });

  test("an input reports each typed key through onKeyPress", async () => {
    const app = await openScenario("v4/events", {
      params: { case: "events" },
      platform: "web",
    });

    await app.type("id:field", "k");
    await app.waitUntil(() => events(app).includes("keypress:k"));

    expect(events(app)).toContain("focus:field");
    expect(events(app)).toContain("keypress:k");
  });

  test("a pointer press fires onPress but does not move the keyboard focus", async () => {
    const app = await openScenario("v4/events", {
      params: { case: "events" },
      platform: "web",
    });

    await app.press("id:stop-b");
    await app.waitUntil(() => events(app).includes("press:b"));

    expect(events(app)).toContain("press:b");
    expect(events(app).filter((event) => event.startsWith("focus:"))).toEqual([]);
  });
});
