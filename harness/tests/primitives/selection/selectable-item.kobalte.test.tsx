/*
 * Kobalte has no unit tests for `src/selection/create-selectable-item.ts`
 * (checked at commit 675b4a11f4). These are direct behavioral tests of the
 * NSH redesign: the handlers take NSH payloads instead of DOM events, the
 * owner reports the pointer type, and activation happens on press down or
 * press up as react-aria's ListBox does. See the file header of
 * `src/primitives/selection/create-selectable-item.ts` for the decisions.
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

async function openItem(
  params: Params,
  options: { platform?: "web" | "windows" } = {},
): Promise<App> {
  return openScenario("primitives/selectable-item", {
    params,
    ...(options.platform ? { platform: options.platform } : {}),
  });
}

async function act(app: App, action: string): Promise<ItemResult> {
  const before = callsOf(app, "result").length;
  await app.press(`id:action-${action}`);
  await app.waitUntil(() => callsOf(app, "result").length > before);

  const calls = callsOf(app, "result");
  return calls[calls.length - 1][0] as ItemResult;
}

async function run(
  params: Params,
  action: string,
  second?: string,
  options: { platform?: "web" | "windows" } = {},
): Promise<ItemResult> {
  const app = await openItem(params, options);

  await act(app, action);
  if (second) {
    await act(app, second);
  }

  const calls = callsOf(app, "result");
  return calls[calls.length - 1][0] as ItemResult;
}

function changes(app: App): string[][] {
  return callsOf(app, "selection").map((call) => call[0] as string[]);
}

function actions(app: App): string[] {
  return callsOf(app, "action").map((call) => String(call[0]));
}

describe("press order", () => {
  test("a full pointer press selects once, on press down by default", async () => {
    const app = await openItem({ mode: "multiple", behavior: "replace" });

    const result = await act(app, "press");
    expect(result.selected).toEqual(["banana"]);
    // Down selects, up and the click must not select again.
    expect(changes(app)).toHaveLength(1);
    expect(actions(app)).toHaveLength(1);
  });

  test("onPressDown alone selects when shouldSelectOnPressUp is false", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace" },
      "press-down",
    );

    expect(result.selected).toEqual(["banana"]);
  });

  test("onPressUp alone does nothing when selection happens on press down", async () => {
    const app = await openItem({ mode: "multiple", behavior: "replace" });

    const result = await act(app, "press-up");
    expect(result.selected).toEqual([]);
    expect(changes(app)).toEqual([]);
    expect(actions(app)).toEqual([]);
  });

  test("shouldSelectOnPressUp delays activation to the release", async () => {
    const downOnly = await run(
      { mode: "multiple", behavior: "replace", pressUp: true },
      "press-down",
    );
    expect(downOnly.selected).toEqual([]);

    const upOnly = await run(
      { mode: "multiple", behavior: "replace", pressUp: true },
      "press-up",
    );
    expect(upOnly.selected).toEqual(["banana"]);
  });

  test("a full press with shouldSelectOnPressUp selects once, on the release", async () => {
    const app = await openItem({
      mode: "multiple",
      behavior: "replace",
      pressUp: true,
    });

    const result = await act(app, "press");
    expect(result.selected).toEqual(["banana"]);
    expect(changes(app)).toHaveLength(1);
    expect(actions(app)).toHaveLength(1);
  });
});

describe("selection on press", () => {
  test("replaces the selection under replace behavior", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace", target: "banana" },
      "press",
    );

    expect(result.selected).toEqual(["banana"]);
    expect(result.itemSelected).toBe(true);
  });

  test("toggles under toggle behavior", async () => {
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

  test("on the web, the platform (Command/Super) modifier also toggles", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace", target: "banana" },
      "press",
      "press-meta",
      { platform: "web" },
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

  test("a pointer press under virtual focus does not take the focus", async () => {
    const result = await run(
      {
        mode: "multiple",
        behavior: "replace",
        virtualFocus: true,
      },
      "press",
    );

    // The owning input keeps the focus; the click still selects.
    expect(result.selected).toEqual(["banana"]);
    expect(result.focusedKey).toBeNull();
    expect(result.isFocused).toBe(false);
    expect(result.itemIsFocused).toBe(false);
  });
});

describe("actions", () => {
  test("an enabled item reports its action once per activation", async () => {
    const app = await openItem({ mode: "multiple" });
    await act(app, "press");

    expect(actions(app)).toEqual(["banana"]);
  });

  test("an item disabled for everything reports no action", async () => {
    const app = await openItem({
      mode: "multiple",
      disabled: true,
    });
    await act(app, "press");

    expect(actions(app)).toEqual([]);
  });

  test("an item disabled only for selection still reports its action", async () => {
    const app = await openItem({
      mode: "multiple",
      behavior: "replace",
      disabled: true,
      disabledBehavior: "selection",
    });

    const result = await act(app, "press");

    expect(actions(app)).toEqual(["banana"]);
    // No selection, but focusable and actionable.
    expect(result.selected).toEqual([]);
    expect(result.itemDisabled).toBe(false);
    expect(result.itemAllowsSelection).toBe(false);
    expect(result.focusedKey).toBe("banana");
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

    expect(result.focusedKey).toBeNull();
    expect(result.isFocused).toBe(false);
  });

  test("Enter selects the item and reports its action", async () => {
    const app = await openItem({ mode: "multiple", behavior: "replace" });
    const result = await act(app, "enter");

    expect(result.selected).toEqual(["banana"]);
    expect(actions(app)).toEqual(["banana"]);
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

  test("on the web, Alt+keyboard activation is the non-contiguous toggle", async () => {
    const result = await run(
      { mode: "multiple", behavior: "replace", selected: "banana" },
      "press-keyboard-alt",
      undefined,
      { platform: "web" },
    );

    expect(result.selected).toEqual([]);
  });
});

describe("disabled items", () => {
  test("disabledBehavior all: cannot be selected, focused or reached by the Tab order", async () => {
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

  test("disabledBehavior selection: focusable, not selectable", async () => {
    const focused = await run(
      {
        mode: "multiple",
        target: "banana",
        disabled: true,
        disabledBehavior: "selection",
      },
      "focus",
    );

    expect(focused.focusedKey).toBe("banana");
    expect(focused.isFocused).toBe(true);
    expect(focused.itemDisabled).toBe(false);
    expect(focused.itemAllowsSelection).toBe(false);
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

  test("blur still clears the focus after the item became disabled", async () => {
    const app = await openItem({ mode: "multiple" });
    const focused = await act(app, "focus");
    expect(focused.isFocused).toBe(true);

    const disabled = await act(app, "disable");
    expect(disabled.itemDisabled).toBe(true);

    const blurred = await act(app, "blur");
    expect(blurred.isFocused).toBe(false);
    expect(blurred.itemIsFocused).toBe(false);
  });
});

describe("selection mode none", () => {
  test("disallows selection but still reports an action", async () => {
    const app = await openItem({ mode: "none" });
    const result = await act(app, "press");

    expect(result.selected).toEqual([]);
    expect(result.itemAllowsSelection).toBe(false);
    expect(actions(app)).toEqual(["banana"]);
  });
});
