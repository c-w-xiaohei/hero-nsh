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
    const app = await openList({ autoFocus: "container" });
    await app.waitUntil(() => lastState(app)?.isFocused === true);
    expect(await focusedKey(app)).toBeNull();

    await press(app, "down");
    await waitFocused(app, "apple");
    expect(lastState(app)?.isFocused).toBe(true);
  });

  test("horizontal orientation maps Right/Left to next/previous", async () => {
    const app = await openList({
      orientation: "horizontal",
      behavior: "toggle",
      autoFocus: "container",
    });

    await app.waitUntil(() => lastState(app)?.isFocused === true);

    await press(app, "right");
    await waitFocused(app, "apple");

    await press(app, "right");
    await waitFocused(app, "apricot");

    await press(app, "left");
    await waitFocused(app, "apple");
  });
});

describe("disabledBehavior", () => {
  test("selection: a disabled item cannot be selected", async () => {
    const app = await openList({
      disabled: "apricot",
      disabledBehavior: "selection",
      behavior: "toggle",
    });

    await app.press("id:row-apricot");
    await waitFocused(app, "apricot");

    // Focus and action follow the press; the selection does not.
    expect(lastState(app)?.selected).toEqual([]);
    expect(lastState(app)?.isFocused).toBe(true);
  });
});

describe("page navigation across sections", () => {
  async function openSections(): Promise<App> {
    const app = await openScenario("primitives/selectable-sections", {
      platform: "web",
      clock: {},
    });
    await app.waitUntil(() => lastState(app) !== undefined);
    await waitForLayout(app, 6, 2);
    return app;
  }

  test("section origins compose, so a page crosses into the next section", async () => {
    const app = await openSections();

    // A1-A3 in section A, B1-B3 in section B; each row is 40pt, sections are
    // 120pt apart in a 160pt viewport. Without section offsets every section
    // restarts at y=0 and both page keys do nothing.
    await app.press("id:row-a3");
    await waitFocused(app, "a3");

    await app.keyboard.press("pagedown");
    await waitFocused(app, "b3");

    await app.press("id:row-b1");
    await waitFocused(app, "b1");

    await app.keyboard.press("pageup");
    await waitFocused(app, "a1");
  });
});

describe("typeahead", () => {
  test("repeating one letter cycles through first-letter matches", async () => {
    const app = await openList({ autoFocus: "container", behavior: "toggle" });
    await app.waitUntil(() => lastState(app)?.isFocused === true);

    await press(app, "a");
    await waitFocused(app, "apple");

    await press(app, "a");
    await waitFocused(app, "apricot");

    await press(app, "a");
    await waitFocused(app, "apple");
  });

  test("disallowTypeAhead leaves the focused key alone", async () => {
    const app = await openList({
      behavior: "toggle",
      disallowTypeAhead: true,
      autoFocus: "container",
    });
    await app.waitUntil(() => lastState(app)?.isFocused === true);

    await press(app, "d");
    await app.wait(80);
    expect(await focusedKey(app)).toBeNull();
  });
});

describe("selection on focus", () => {
  test("selectOnFocus=true selects even with toggle behavior", async () => {
    const app = await openList({
      behavior: "toggle",
      selectOnFocus: true,
      autoFocus: "container",
    });
    await app.waitUntil(() => lastState(app)?.isFocused === true);

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

  test("a press focuses the pressed item through the item's press-down handler", async () => {
    const app = await openList({ behavior: "toggle" });

    await app.press("id:row-cherry");
    await waitFocused(app, "cherry");
    expect(lastState(app)?.isFocused).toBe(true);
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
});

describe("scrolling callback", () => {
  test("a focused key is handed to the component's scrollToItem exactly once", async () => {
    const app = await openList({ behavior: "toggle", autoFocus: "container" });
    await app.waitUntil(() => lastState(app)?.isFocused === true);

    await press(app, "down");
    await waitFocused(app, "apple");
    await app.waitUntil(() => callsOf(app, "scroll").length > 0);

    const scrolled = callsOf(app, "scroll").map((call) => String(call[0]));
    expect(scrolled).toEqual(["apple"]);
  });
});
