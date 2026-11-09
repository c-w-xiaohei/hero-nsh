/*
 * Kobalte has no unit tests for `src/selection/create-selectable-item.ts`
 * (checked at commit 675b4a11f4). These are direct behavioral tests of the
 * NSH redesign: the handlers take NSH payloads instead of DOM events, and the
 * owner reports the pointer type. See the file header of
 * `src/primitives/selection/create-selectable-item.ts` for what was dropped
 * (press-down selection, `button`, `allowsDifferentPressOrigin`) and why.
 *
 * The upstream behavior comes from `useSelectableItem` in React Aria and
 * Kobalte's `createSelectableItem`.
 */

import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type ItemResult = {
  selected: string[];
  focusedKey: string | null;
  isFocused: boolean;
  itemSelected: boolean;
  itemDisabled: boolean;
  itemAllowsSelection: boolean;
  itemFocusable: boolean;
  itemIsFocused: boolean;
};

type Params = Record<string, string | number | boolean>;

async function run(
  params: Params,
  action: string,
  second?: string,
): Promise<ItemResult> {
  const app = await openScenario("primitives/selectable-item", { params });

  await app.press(`id:action-${action}`);
  await app.waitUntil(() => callsOf(app, "result").length > 0);

  if (second) {
    const before = callsOf(app, "result").length;
    await app.press(`id:action-${second}`);
    await app.waitUntil(() => callsOf(app, "result").length > before);
  }

  const calls = callsOf(app, "result");
  return calls[calls.length - 1][0] as ItemResult;
}

describe("selection on press", () => {
  test("a pointer press replaces the selection under replace behavior", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace", target: "banana" },
      "press",
    );

    expect(result.selected).toEqual(["banana"]);
    expect(result.itemSelected).toBe(true);
  });

  test("a pointer press toggles under toggle behavior", async () => {
    const result = await run(
      { mode: "multiple", behavior: "toggle", target: "banana" },
      "press",
      "press",
    );

    expect(result.selected).toEqual([]);
    expect(result.itemSelected).toBe(false);
  });

  test("Control+press toggles a key under replace behavior", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace", target: "banana" },
      "press",
      "press-ctrl",
    );

    expect(result.selected).toEqual([]);
  });

  test("a touch press toggles under replace behavior", async () => {
    const result = await run(
      {
        mode: "multiple",
        behavior: "replace",
        target: "banana",
        pointerType: "touch",
      },
      "press",
      "press",
    );

    expect(result.selected).toEqual([]);
  });

  test("single mode replaces, then toggles off when empty selection is allowed", async () => {
    const result = await run({ mode: "single", target: "banana" }, "press");
    expect(result.selected).toEqual(["banana"]);

    const toggled = await run(
      { mode: "single", target: "banana" },
      "press",
      "press",
    );
    expect(toggled.selected).toEqual([]);
  });

  test("single mode keeps its key when empty selection is disallowed", async () => {
    const result = await run(
      {
        mode: "single",
        target: "banana",
        disallowEmpty: true,
      },
      "press",
      "press",
    );

    expect(result.selected).toEqual(["banana"]);
  });

  test("a pointer press focuses the item, as a DOM click would", async () => {
    const result = await run({ mode: "multiple" }, "press");

    expect(result.focusedKey).toBe("banana");
    expect(result.isFocused).toBe(true);
    expect(result.itemIsFocused).toBe(true);
    expect(result.itemFocusable).toBe(true);
  });
});

describe("keyboard activation", () => {
  test("a keyboard press selects the item", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace" },
      "press-keyboard",
    );

    expect(result.selected).toEqual(["banana"]);
  });

  test("a keyboard press does not take the focus by itself", async () => {
    const result = await run({ mode: "multiple" }, "press-keyboard");

    // In Kobalte Enter/Space only arrive while the item is focused already;
    // here the handler must not invent focus it did not have.
    expect(result.focusedKey).toBeNull();
    expect(result.isFocused).toBe(false);
  });

  test("Enter selects the item", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace" },
      "enter",
    );

    expect(result.selected).toEqual(["banana"]);
  });

  test("Space selects the item", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace" },
      "space",
    );

    expect(result.selected).toEqual(["banana"]);
  });

  test("Control+Enter toggles the item", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace" },
      "enter",
      "ctrl-enter",
    );

    expect(result.selected).toEqual([]);
  });
});

describe("disabled items", () => {
  test("cannot be selected, focused or reached by the Tab order", async () => {
    const selected = await run(
      { mode: "multiple", target: "banana", disabled: true },
      "press",
    );

    expect(selected.selected).toEqual([]);
    expect(selected.itemDisabled).toBe(true);
    expect(selected.itemAllowsSelection).toBe(false);
    expect(selected.itemFocusable).toBe(false);

    const focused = await run(
      { mode: "multiple", target: "banana", disabled: true },
      "focus",
    );

    expect(focused.focusedKey).toBeNull();
    expect(focused.isFocused).toBe(false);
  });
});

describe("focus handlers", () => {
  test("focus sets the focused key and the item's focused state", async () => {
    const result = await run({ mode: "multiple" }, "focus");

    expect(result.focusedKey).toBe("banana");
    expect(result.isFocused).toBe(true);
    expect(result.itemIsFocused).toBe(true);
  });

  test("blur clears the collection's focused state", async () => {
    const result = await run({ mode: "multiple" }, "focus", "blur");

    expect(result.isFocused).toBe(false);
    expect(result.itemIsFocused).toBe(false);
  });
});

describe("selection mode none", () => {
  test("disallows selection entirely", async () => {
    const result = await run({ mode: "none" }, "press");

    expect(result.selected).toEqual([]);
    expect(result.itemAllowsSelection).toBe(false);
  });
});
