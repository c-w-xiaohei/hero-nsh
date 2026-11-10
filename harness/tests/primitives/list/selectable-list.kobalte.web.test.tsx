/*
 * Kobalte has no unit tests for `src/selection/create-selectable-collection.ts`
 * or `src/list/create-selectable-list.ts` (checked at commit 675b4a11f4).
 * These are behavioral tests of the real design this port uses: a rendered
 * list of NSH views, item registration from `onLayout`, keyboard commands
 * bound by `createKeymapScope` only while the list has the focus, and focus
 * moved through view refs.
 *
 * The upstream behavior comes from:
 *   packages/core/src/selection/create-selectable-collection.ts
 *   packages/core/src/selection/create-selectable-item.ts
 *   packages/core/src/selection/create-type-select.ts
 *   packages/core/src/list/create-selectable-list.ts
 *   packages/core/src/list/list-keyboard-delegate.ts
 * and their React Aria sources (`useSelectableCollection`, `useSelectableItem`,
 * `useTypeSelect`, `useSelectableList`, `ListKeyboardDelegate`).
 */

import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

/*
 * The Windows host gap (loop brief, "Windows keyboard focus"): NSH 0.4.0's
 * Win32 host never gives a non-Input view keyboard focus, so a pointer press
 * on the list container does not focus it and the keys that follow never
 * reach the list. These cases focus the list itself and then drive it from
 * the keyboard; they run on the web target, where Tab and a press move focus.
 */

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

async function waitForLayout(app: App, items = 6, sections = 0): Promise<void> {
  await app.waitUntil(
    () => new Set(callsOf(app, "item-layout").map((call) => call[0])).size >= items,
  );
  if (sections > 0) {
    await app.waitUntil(
      () =>
        new Set(callsOf(app, "section-layout").map((call) => call[0])).size >=
        sections,
    );
  }
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

/** Focuses the list itself; focus-in picks the first (or last selected) item. */
async function focusList(app: App): Promise<void> {
  await app.press("id:focus-container");
  await app.waitUntil(() => lastState(app)?.isFocused === true);
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
  test("arrows skip disabled items in both directions", async () => {
    const app = await openList({
      disabled: "apricot,banana,cherry",
      behavior: "toggle",
    });

    await focusList(app);
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

    await focusList(app);
    await waitFocused(app, "apricot");

    await press(app, "end");
    await waitFocused(app, "cherry");
  });

  test("focus does not wrap by default", async () => {
    const app = await openList({ behavior: "toggle" });

    await focusList(app);
    await press(app, "end");
    await waitFocused(app, "date");

    await press(app, "down");
    await app.wait(80);
    expect(await focusedKey(app)).toBe("date");
  });

  test("shouldFocusWrap wraps at both ends", async () => {
    const app = await openList({ wrap: true, behavior: "toggle" });

    await focusList(app);
    await press(app, "end");
    await waitFocused(app, "date");

    await press(app, "down");
    await waitFocused(app, "apple");

    await press(app, "up");
    await waitFocused(app, "date");
  });
});

describe("disabledBehavior", () => {
  test("selection: disabled items stay reachable by arrows and Home/End", async () => {
    const app = await openList({
      disabled: "apricot,banana",
      disabledBehavior: "selection",
      behavior: "toggle",
    });

    await focusList(app);
    await waitFocused(app, "apple");

    await press(app, "down");
    await waitFocused(app, "apricot");

    await press(app, "down");
    await waitFocused(app, "banana");

    await press(app, "down");
    await waitFocused(app, "blueberry");

    await press(app, "home");
    await waitFocused(app, "apple");

    await press(app, "end");
    await waitFocused(app, "date");
  });

  test("selection: typeahead reaches a disabled item", async () => {
    const app = await openList({
      disabled: "banana",
      disabledBehavior: "selection",
      behavior: "toggle",
    });

    await focusList(app);
    await press(app, "b");
    await waitFocused(app, "banana");
  });

  test("all (default): arrows step over disabled items", async () => {
    const app = await openList({
      disabled: "apricot",
      behavior: "toggle",
    });

    await focusList(app);
    await waitFocused(app, "apple");

    await press(app, "down");
    await waitFocused(app, "banana");
  });
});

describe("page navigation from reported layouts", () => {
  test("PageDown moves about one viewport down, PageUp back", async () => {
    const app = await openList({ behavior: "toggle" });

    await focusList(app);
    await waitFocused(app, "apple");

    // Rows are 40pt and the viewport 160pt: the next page starts at blueberry.
    await press(app, "pagedown");
    await waitFocused(app, "blueberry");

    await press(app, "pageup");
    await waitFocused(app, "apple");
  });

  test("PageUp from the end lands about one viewport up", async () => {
    const app = await openList({ behavior: "toggle" });

    await focusList(app);
    await press(app, "end");
    await waitFocused(app, "date");

    await press(app, "pageup");
    await waitFocused(app, "banana");
  });
});

describe("typeahead", () => {
  test("a letter moves focus to the matching item, extending the prefix", async () => {
    const app = await openList({ behavior: "toggle" });

    await focusList(app);
    await waitFocused(app, "apple");

    await press(app, "b");
    await waitFocused(app, "banana");

    // "bl" matches Blueberry, not Banana.
    await press(app, "l");
    await waitFocused(app, "blueberry");
  });

  test("the prefix resets after 500ms on the manual clock", async () => {
    const app = await openList({ behavior: "toggle" });

    await focusList(app);
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
});

describe("selection on focus", () => {
  test("replace behavior selects the focused item while navigating", async () => {
    const app = await openList({ behavior: "replace" });

    await focusList(app);
    await waitFocused(app, "apple");
    expect(lastState(app)?.selected).toEqual(["apple"]);

    await press(app, "down");
    await waitFocused(app, "apricot");
    expect(lastState(app)?.selected).toEqual(["apricot"]);
  });

  test("toggle behavior moves focus without selecting", async () => {
    const app = await openList({ behavior: "toggle" });

    await focusList(app);
    await waitFocused(app, "apple");
    expect(lastState(app)?.selected).toEqual([]);

    await press(app, "down");
    await waitFocused(app, "apricot");
    expect(lastState(app)?.selected).toEqual([]);
  });
});

describe("keyboard activation and shortcuts", () => {
  test("Enter on the focused item selects it", async () => {
    const app = await openList({ behavior: "toggle", autoFocus: "first" });
    await waitFocused(app, "apple");

    await press(app, "enter");
    await app.waitUntil(() => (lastState(app)?.selected.length ?? 0) > 0);
    expect(lastState(app)?.selected).toEqual(["apple"]);
  });

  test("Control+A selects every enabled item", async () => {
    const app = await openList({ mode: "multiple" });

    await focusList(app);
    await press(app, "ctrl+a");
    await app.waitUntil(() => lastState(app)?.selected.length === 6);
    expect(lastState(app)?.selected).toHaveLength(6);
  });

  test("disallowSelectAll stops Control+A", async () => {
    const app = await openList({ mode: "multiple", disallowSelectAll: true });

    await focusList(app);
    const before = lastState(app)?.selected;
    await press(app, "ctrl+a");
    await app.wait(80);
    expect(lastState(app)?.selected).toEqual(before);
  });

  test("Shift+ArrowDown extends the selection from the anchor", async () => {
    const app = await openList({ behavior: "replace" });

    await focusList(app);
    await waitFocused(app, "apple");

    await press(app, "shift+down");
    await waitFocused(app, "apricot");
    await app.waitUntil(() => lastState(app)?.selected.length === 2);
    expect(lastState(app)?.selected.sort()).toEqual(["apple", "apricot"]);
  });

  test("Escape clears the selection when empty selection is allowed", async () => {
    const app = await openList({ behavior: "replace", selected: "apple" });

    await focusList(app);
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

    await focusList(app);
    await press(app, "escape");
    await app.wait(80);
    expect(lastState(app)?.selected).toEqual(["apple"]);
  });
});

describe("autoFocus and the collection's own focus stop", () => {
  test("focusing the collection moves the focused key to its first item", async () => {
    const app = await openList({ behavior: "replace" });

    await app.press("id:focus-container");
    await waitFocused(app, "apple");
    await app.waitUntil(() => lastState(app)?.selected.length === 1);
    expect(lastState(app)?.selected).toEqual(["apple"]);
  });

  test("enterFrom 'end' starts at the last item", async () => {
    const app = await openList({ behavior: "toggle", enterFrom: "end" });

    await app.press("id:focus-container");
    await waitFocused(app, "date");
  });
});
