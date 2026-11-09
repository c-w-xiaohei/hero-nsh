/*
 * Kobalte has no unit tests for `src/list` (checked at commit 675b4a11f4:
 * packages/core/src/list contains no `*.test.tsx`). These are direct
 * behavioral tests of `createListState` and `createSingleSelectListState`,
 * run through the `primitives/list` scenario on a real NSH engine.
 *
 * The upstream behavior comes from:
 *   packages/core/src/list/create-list-state.ts
 *   packages/core/src/list/create-single-select-list-state.ts
 *   packages/core/src/list/list-collection.ts
 * and their React Stately sources (`useListState`, `useSingleSelectListState`).
 */

import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type ListResult = {
  keys: string[];
  size: number;
  at1: string | null;
  first: string | null;
  last: string | null;
  itemCount: number;
  selected: string[];
  focusedKey: string | null;
  // single-select case
  selectedKey?: string | null;
  selectedItem?: string | null;
  selectedText?: string | null;
  managerSelected?: string[];
  changes?: string[];
};

type Params = Record<string, string | number | boolean>;

async function openList(params: Params = {}): Promise<App> {
  return openScenario("primitives/list", { params });
}

async function act(app: App, action: string): Promise<ListResult> {
  const before = callsOf(app, "result").length;
  await app.press(`id:action-${action}`);
  await app.waitUntil(() => callsOf(app, "result").length > before);

  const calls = callsOf(app, "result");
  return calls[calls.length - 1][0] as ListResult;
}

describe("createListState", () => {
  test("builds the collection from the data source", async () => {
    const app = await openList();
    const result = await act(app, "snapshot");

    expect(result.keys).toEqual([
      "apple",
      "apricot",
      "banana",
      "blueberry",
      "cherry",
      "date",
    ]);
    expect(result.size).toBe(6);
    expect(result.itemCount).toBe(6);
    expect(result.at1).toBe("apricot");
    expect(result.first).toBe("apple");
    expect(result.last).toBe("date");
    expect(result.selected).toEqual([]);
  });

  test("selection goes through the list's selection manager", async () => {
    const app = await openList({ mode: "multiple" });

    let result = await act(app, "toggle");
    expect(result.selected).toEqual(["banana"]);

    result = await act(app, "toggle");
    expect(result.selected).toEqual([]);
  });

  test("single mode replaces the selection through the manager", async () => {
    const app = await openList({ mode: "single", target: "cherry" });

    const result = await act(app, "toggle");
    expect(result.selected).toEqual(["cherry"]);
  });

  test("exposes the collection's focus state", async () => {
    const app = await openList();

    const result = await act(app, "focus-date");
    expect(result.focusedKey).toBe("date");
  });
});

describe("createListState with a filter", () => {
  test("rebuilds the collection when the filter changes", async () => {
    const app = await openList({ case: "filter" });

    let result = await act(app, "snapshot");
    expect(result.keys).toHaveLength(6);

    result = await act(app, "filter-on");
    expect(result.keys).toEqual(["banana", "blueberry"]);
    expect(result.size).toBe(2);

    result = await act(app, "filter-off");
    expect(result.keys).toHaveLength(6);
  });
});

describe("createListState with a changing data source", () => {
  test("resets the focused key when its item is deleted", async () => {
    const app = await openList({ case: "dynamic" });

    let result = await act(app, "focus-banana");
    expect(result.focusedKey).toBe("banana");

    result = await act(app, "remove-banana");
    expect(result.keys).not.toContain("banana");
    expect(result.focusedKey).toBeNull();

    // Restoring the item does not restore the focus: only a present key
    // resets it, as in Kobalte.
    result = await act(app, "add-banana");
    expect(result.keys).toContain("banana");
    expect(result.focusedKey).toBeNull();
  });
});

describe("createSingleSelectListState", () => {
  test("keeps one selected key and reports the selected item", async () => {
    const app = await openList({ case: "single" });

    let result = await act(app, "select-banana");
    expect(result.selectedKey).toBe("banana");
    expect(result.selectedItem).toBe("banana");
    expect(result.selectedText).toBe("Banana");
    expect(result.managerSelected).toEqual(["banana"]);
    expect(result.changes).toEqual(["banana"]);
  });

  test("reports the change again when the same key is selected", async () => {
    const app = await openList({ case: "single" });

    await act(app, "select-banana");
    const result = await act(app, "select-banana-again");

    expect(result.selectedKey).toBe("banana");
    // createSingleSelectListState deliberately allows the duplicate event.
    expect(result.changes).toEqual(["banana", "banana"]);
  });

  test("does not clear: single select list state disallows empty selection", async () => {
    const app = await openList({ case: "single" });

    await act(app, "select-banana");
    const result = await act(app, "clear");

    expect(result.selectedKey).toBe("banana");
    expect(result.managerSelected).toEqual(["banana"]);
  });

  test("setSelectedKey updates the controlled value", async () => {
    const app = await openList({ case: "single" });

    const result = await act(app, "set-cherry");
    expect(result.selectedKey).toBe("cherry");
    expect(result.selectedText).toBe("Cherry");
    expect(result.changes).toEqual(["cherry"]);
  });

  test("a disabled item cannot take over the selection", async () => {
    const app = await openList({
      case: "single",
      selected: "apple",
      target: "banana",
      disabled: "banana",
    });

    const result = await act(app, "select-disabled");
    expect(result.selectedKey).toBe("apple");
  });
});
