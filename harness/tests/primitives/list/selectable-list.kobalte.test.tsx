/*
 * Kobalte has no unit tests for `src/selection/create-selectable-collection.ts`
 * or `src/list/create-selectable-list.ts` (checked at commit 675b4a11f4).
 * These are behavioral tests of the real design this port uses: a rendered
 * list of NSH views, item registration from `onLayout`, keyboard commands
 * forwarded from `keymap`, and focus moved through view refs.
 *
 * The upstream behavior comes from:
 *   packages/core/src/selection/create-selectable-collection.ts
 *   packages/core/src/selection/create-selectable-item.ts
 *   packages/core/src/selection/create-type-select.ts
 *   packages/core/src/list/create-selectable-list.ts
 *   packages/core/src/list/list-keyboard-delegate.ts
 * and their React Aria sources (`useSelectableCollection`, `useSelectableItem`,
 * `useTypeSelect`, `useSelectableList`, `ListKeyboardDelegate`).
 *
 * The DOM-only upstream pieces are documented in the source headers instead of
 * being tested here: pointerdown vs click selection, `pointerType`, Tab walking
 * and `scrollIntoView` queries.
 */

import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type ListSnapshot = {
  selected: string[];
  focusedKey: string | null;
  isFocused: boolean;
};

type Params = Record<string, string | number | boolean>;

function lastState(app: App): ListSnapshot | undefined {
  const states = callsOf(app, "state");
  return states.length
    ? (states[states.length - 1][0] as ListSnapshot)
    : undefined;
}

async function waitForLayout(app: App): Promise<void> {
  await app.waitUntil(
    () => new Set(callsOf(app, "item-layout").map((call) => call[0])).size >= 6,
  );
  await app.waitUntil(() => callsOf(app, "container-layout").length > 0);
}

async function openList(params: Params = {}): Promise<App> {
  const app = await openScenario("primitives/selectable-list", {
    params,
    platform: "web",
    clock: {},
  });
  await app.waitUntil(() => lastState(app) !== undefined);
  await waitForLayout(app);
  return app;
}

async function press(app: App, key: string): Promise<void> {
  await app.keyboard.press(key);
}

async function focusedKey(app: App): Promise<string | null | undefined> {
  return lastState(app)?.focusedKey;
}

async function waitFocused(app: App, key: string | null): Promise<void> {
  await app.waitUntil(() => lastState(app)?.focusedKey === key);
}

describe("arrow navigation", () => {
  test("ArrowDown with no focused key starts at the first item", async () => {
    const app = await openList();

    await press(app, "down");
    await waitFocused(app, "apple");
    expect(lastState(app)?.isFocused).toBe(true);
  });

  test("arrows skip disabled items in both directions", async () => {
    const app = await openList({
      disabled: "apricot,banana,cherry",
      behavior: "toggle",
    });

    await press(app, "down");
    await waitFocused(app, "apple");

    await press(app, "down");
    await waitFocused(app, "blueberry");

    await press(app, "down");
    await waitFocused(app, "date");

    await press(app, "up");
    await waitFocused(app, "blueberry");
  });

  test("Home and End jump to the first and last enabled item", async () => {
    const app = await openList({ disabled: "apple,date", behavior: "toggle" });

    await press(app, "home");
    await waitFocused(app, "apricot");

    await press(app, "end");
    await waitFocused(app, "cherry");
  });

  test("focus does not wrap by default", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "end");
    await waitFocused(app, "date");

    await press(app, "down");
    await app.wait(80);
    expect(await focusedKey(app)).toBe("date");
  });

  test("shouldFocusWrap wraps at both ends", async () => {
    const app = await openList({ wrap: true, behavior: "toggle" });

    await press(app, "end");
    await waitFocused(app, "date");

    await press(app, "down");
    await waitFocused(app, "apple");

    await press(app, "up");
    await waitFocused(app, "date");
  });

  test("horizontal orientation maps Right/Left to next/previous", async () => {
    const app = await openList({ orientation: "horizontal", behavior: "toggle" });

    await press(app, "right");
    await waitFocused(app, "apple");

    await press(app, "right");
    await waitFocused(app, "apricot");

    await press(app, "left");
    await waitFocused(app, "apple");
  });
});

describe("page navigation from reported layouts", () => {
  test("PageDown moves about one viewport down, PageUp back", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "home");
    await waitFocused(app, "apple");

    // Rows are 40pt and the viewport 160pt: the next page starts at blueberry.
    await press(app, "pagedown");
    await waitFocused(app, "blueberry");

    await press(app, "pageup");
    await waitFocused(app, "apple");
  });

  test("PageDown stops at the last item", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "end");
    await waitFocused(app, "date");

    await press(app, "pageup");
    await waitFocused(app, "banana");
  });
});

describe("typeahead", () => {
  test("a letter moves focus to the matching item, extending the prefix", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "b");
    await waitFocused(app, "banana");

    // "bl" matches Blueberry, not Banana.
    await press(app, "l");
    await waitFocused(app, "blueberry");
  });

  test("repeating one letter cycles through first-letter matches", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "a");
    await waitFocused(app, "apple");

    await press(app, "a");
    await waitFocused(app, "apricot");

    await press(app, "a");
    await waitFocused(app, "apple");
  });

  test("the prefix resets after 500ms on the manual clock", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "b");
    await waitFocused(app, "banana");

    await press(app, "l");
    await waitFocused(app, "blueberry");

    // Past the reset window, a new letter starts a new prefix. Were "bl"
    // still active, "blc" would match nothing.
    await app.wait(600);
    await press(app, "c");
    await waitFocused(app, "cherry");
  });

  test("disallowTypeAhead leaves the focused key alone", async () => {
    const app = await openList({ behavior: "toggle", disallowTypeAhead: true });

    await press(app, "d");
    await app.wait(80);
    expect(await focusedKey(app)).toBeNull();
  });
});

describe("selection on focus", () => {
  test("replace behavior selects the focused item while navigating", async () => {
    const app = await openList({ behavior: "replace" });

    await press(app, "down");
    await waitFocused(app, "apple");
    expect(lastState(app)?.selected).toEqual(["apple"]);

    await press(app, "down");
    await waitFocused(app, "apricot");
    expect(lastState(app)?.selected).toEqual(["apricot"]);
  });

  test("toggle behavior moves focus without selecting", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "down");
    await waitFocused(app, "apple");
    expect(lastState(app)?.selected).toEqual([]);
  });

  test("selectOnFocus=true selects even with toggle behavior", async () => {
    const app = await openList({ behavior: "toggle", selectOnFocus: true });

    await press(app, "down");
    await waitFocused(app, "apple");
    await app.waitUntil(() => lastState(app)?.selected.length === 1);
    expect(lastState(app)?.selected).toEqual(["apple"]);
  });
});

describe("pointer presses on items", () => {
  test("a press replaces the selection under replace behavior", async () => {
    const app = await openList({ behavior: "replace" });

    await app.press("id:row-banana");
    await app.waitUntil(() => lastState(app)?.selected.length === 1);
    expect(lastState(app)?.selected).toEqual(["banana"]);

    await app.press("id:row-cherry");
    await app.waitUntil(
      () => lastState(app)?.selected.join(",") === "cherry",
    );
    expect(lastState(app)?.selected).toEqual(["cherry"]);
  });

  test("a press toggles the selection under toggle behavior", async () => {
    const app = await openList({ behavior: "toggle" });

    await app.press("id:row-banana");
    await app.waitUntil(() => lastState(app)?.selected.length === 1);
    expect(lastState(app)?.selected).toEqual(["banana"]);

    await app.press("id:row-cherry");
    await app.waitUntil(() => lastState(app)?.selected.length === 2);
    expect(lastState(app)?.selected.sort()).toEqual(["banana", "cherry"]);

    await app.press("id:row-banana");
    await app.waitUntil(() => lastState(app)?.selected.length === 1);
    expect(lastState(app)?.selected).toEqual(["cherry"]);
  });

  test("a press focuses the pressed item through the item's focus handler", async () => {
    const app = await openList({ behavior: "toggle" });

    await app.press("id:row-cherry");
    await waitFocused(app, "cherry");
    expect(lastState(app)?.isFocused).toBe(true);
  });
});

describe("keyboard activation and shortcuts", () => {
  test("Enter on the focused item selects it", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "home");
    await waitFocused(app, "apple");

    await press(app, "enter");
    await app.waitUntil(() => (lastState(app)?.selected.length ?? 0) > 0);
    expect(lastState(app)?.selected).toEqual(["apple"]);
  });

  test("Control+A selects every enabled item", async () => {
    const app = await openList({ mode: "multiple" });

    await press(app, "ctrl+a");
    await app.waitUntil(() => lastState(app)?.selected.length === 6);
    expect(lastState(app)?.selected).toHaveLength(6);
  });

  test("disallowSelectAll stops Control+A", async () => {
    const app = await openList({ mode: "multiple", disallowSelectAll: true });

    await press(app, "ctrl+a");
    await app.wait(80);
    expect(lastState(app)?.selected).toEqual([]);
  });

  test("Shift+ArrowDown extends the selection from the anchor", async () => {
    const app = await openList({ behavior: "replace" });

    await press(app, "home");
    await waitFocused(app, "apple");

    await press(app, "shift+down");
    await waitFocused(app, "apricot");
    await app.waitUntil(() => lastState(app)?.selected.length === 2);
    expect(lastState(app)?.selected.sort()).toEqual(["apple", "apricot"]);
  });

  test("Escape clears the selection when empty selection is allowed", async () => {
    const app = await openList({ behavior: "replace", selected: "apple" });

    await press(app, "escape");
    await app.waitUntil(() => lastState(app)?.selected.length === 0);
    expect(lastState(app)?.selected).toEqual([]);
  });

  test("Escape keeps the selection when it is disallowed", async () => {
    const app = await openList({
      behavior: "replace",
      selected: "apple",
      disallowEmpty: true,
    });

    await press(app, "escape");
    await app.wait(80);
    expect(lastState(app)?.selected).toEqual(["apple"]);
  });
});

describe("autoFocus and the collection's own focus stop", () => {
  test("autoFocus first focuses the first item after render", async () => {
    const app = await openList({ autoFocus: "first", behavior: "toggle" });
    await waitFocused(app, "apple");
    expect(lastState(app)?.isFocused).toBe(true);
  });

  test("autoFocus last focuses the last item", async () => {
    const app = await openList({ autoFocus: "last", behavior: "toggle" });
    await waitFocused(app, "date");
  });

  test("autoFocus prefers an already selected key", async () => {
    const app = await openList({
      autoFocus: "first",
      selected: "cherry",
      behavior: "toggle",
    });
    await waitFocused(app, "cherry");
  });

  test("a boolean autoFocus focuses the collection, then arrows start at the first item", async () => {
    const app = await openList({ autoFocus: "container", behavior: "toggle" });

    await app.waitUntil(() => lastState(app)?.isFocused === true);
    expect(await focusedKey(app)).toBeNull();

    await press(app, "down");
    await waitFocused(app, "apple");
  });

  test("focusing the collection moves the focused key to its first item", async () => {
    const app = await openList({ behavior: "replace" });

    await app.press("id:focus-container");
    await waitFocused(app, "apple");
    await app.waitUntil(() => lastState(app)?.selected.length === 1);
    expect(lastState(app)?.selected).toEqual(["apple"]);
  });
});

describe("scrolling callback", () => {
  test("each focused key is handed to the component's scrollToItem", async () => {
    const app = await openList({ behavior: "toggle" });

    await press(app, "down");
    await waitFocused(app, "apple");
    await app.waitUntil(() => callsOf(app, "scroll").length > 0);

    const scrolled = callsOf(app, "scroll").map((call) => String(call[0]));
    expect(scrolled).toContain("apple");
  });
});
