/*
 * Kobalte has no unit tests for `src/selection` (checked at commit
 * 675b4a11f4: packages/core/src/selection contains no `*.test.tsx`). These are
 * direct behavioral tests of the ported semantics, run on a real NSH engine
 * through the `primitives/selection` scenario. Each case builds
 * `createMultipleSelectionState` + `SelectionManager` over the same six-item
 * collection and reports the manager's public surface after an action.
 *
 * The upstream behavior comes from:
 *   packages/core/src/selection/selection-manager.ts
 *   packages/core/src/selection/create-multiple-selection-state.ts
 * and their React Stately sources (`SelectionManager`, `useMultipleSelectionState`).
 */

import { describe, expect, test } from "nsh/test";
import type { App } from "nsh/test";
import { callsOf } from "../../helpers/calls";
import { openScenario } from "../../helpers/open-scenario";

type SelectionResult = {
  selected: string[];
  focusedKey: string | null;
  isFocused: boolean;
  isEmpty: boolean;
  isSelectAll: boolean;
  firstSelected: string | null;
  lastSelected: string | null;
  changes: string[][];
  equals?: boolean;
};

type Params = Record<string, string | number | boolean>;

async function openSelection(params: Params = {}): Promise<App> {
  return openScenario("primitives/selection", { params });
}

async function act(app: App, action: string): Promise<SelectionResult> {
  const before = callsOf(app, "result").length;
  await app.press(`id:action-${action}`);
  await app.waitUntil(() => callsOf(app, "result").length > before);

  const calls = callsOf(app, "result");
  return calls[calls.length - 1][0] as SelectionResult;
}

function sorted(values: string[]): string[] {
  return [...values].sort();
}

describe("SelectionManager", () => {
  test("toggles a key in multiple mode and reports each change", async () => {
    const app = await openSelection({ mode: "multiple", behavior: "toggle" });

    let result = await act(app, "toggle");
    expect(result.selected).toEqual(["banana"]);
    expect(result.changes).toEqual([["banana"]]);

    result = await act(app, "toggle");
    expect(result.selected).toEqual([]);
    expect(result.changes).toEqual([["banana"], []]);
    expect(result.isEmpty).toBe(true);
  });

  test("replaceSelection keeps only the given key", async () => {
    const app = await openSelection({
      mode: "multiple",
      selected: "apple,apricot",
      target: "banana",
    });

    const result = await act(app, "replace");
    expect(result.selected).toEqual(["banana"]);
    expect(result.changes).toEqual([["banana"]]);
  });

  test("extendSelection selects the range from the anchor", async () => {
    // A selection from `defaultSelectedKeys` has no anchor yet (React Stately
    // behaves the same), so the anchor is made by selecting a key first.
    const app = await openSelection({
      mode: "multiple",
      anchor: "apple",
      target: "cherry",
    });

    await act(app, "replace-anchor");
    const result = await act(app, "extend");
    expect(sorted(result.selected)).toEqual([
      "apple",
      "apricot",
      "banana",
      "blueberry",
      "cherry",
    ]);
    expect(result.firstSelected).toBe("apple");
    expect(result.lastSelected).toBe("cherry");
  });

  test("extendSelection never selects a disabled key", async () => {
    const app = await openSelection({
      mode: "multiple",
      anchor: "apple",
      target: "cherry",
      disabled: "banana",
    });

    await act(app, "replace-anchor");
    const result = await act(app, "extend");
    expect(sorted(result.selected)).toEqual([
      "apple",
      "apricot",
      "blueberry",
      "cherry",
    ]);
  });

  test("single mode replaces the selection", async () => {
    const app = await openSelection({
      mode: "single",
      selected: "apple",
      target: "banana",
    });

    const result = await act(app, "toggle");
    expect(result.selected).toEqual(["banana"]);
  });

  test("single mode toggles the selected key off when empty selection is allowed", async () => {
    const app = await openSelection({
      mode: "single",
      selected: "apple",
      target: "apple",
    });

    const result = await act(app, "toggle");
    expect(result.selected).toEqual([]);
  });

  test("disallowEmptySelection keeps the last key in single mode", async () => {
    const app = await openSelection({
      mode: "single",
      selected: "apple",
      target: "apple",
      disallowEmpty: true,
    });

    const result = await act(app, "toggle");
    expect(result.selected).toEqual(["apple"]);
    expect(result.changes).toEqual([]);
  });

  test("selectionBehavior replace makes select replace instead of toggle", async () => {
    const app = await openSelection({
      behavior: "replace",
      selected: "apple",
      target: "banana",
    });

    let result = await act(app, "select-toggle");
    expect(result.selected).toEqual(["banana"]);

    // A second press on the same key replaces with it again: it cannot toggle
    // it off, unlike the toggle behavior.
    result = await act(app, "select-toggle");
    expect(result.selected).toEqual(["banana"]);
    // The selection set is unchanged, so the duplicate event is suppressed.
    expect(result.changes).toEqual([["banana"]]);
  });

  test("selectionBehavior toggle makes select toggle", async () => {
    const app = await openSelection({ behavior: "toggle", target: "banana" });

    let result = await act(app, "select-toggle");
    expect(result.selected).toEqual(["banana"]);

    result = await act(app, "select-toggle");
    expect(result.selected).toEqual([]);
  });

  test("a touch press toggles even when the behavior is replace", async () => {
    const app = await openSelection({
      behavior: "replace",
      target: "banana",
    });

    let result = await act(app, "select-touch");
    expect(result.selected).toEqual(["banana"]);

    result = await act(app, "select-touch");
    expect(result.selected).toEqual([]);
  });

  test("selectAll selects every enabled key and skips disabled ones", async () => {
    const app = await openSelection({
      mode: "multiple",
      disabled: "banana",
    });

    const result = await act(app, "select-all");
    expect(result.selected).toEqual([
      "apple",
      "apricot",
      "blueberry",
      "cherry",
      "date",
    ]);
    expect(result.isSelectAll).toBe(true);
    expect(result.firstSelected).toBe("apple");
    expect(result.lastSelected).toBe("date");
  });

  test("clearSelection respects disallowEmptySelection", async () => {
    const blocked = await openSelection({
      selected: "apple",
      disallowEmpty: true,
    });

    let result = await act(blocked, "clear");
    expect(result.selected).toEqual(["apple"]);

    const allowed = await openSelection({ selected: "apple" });
    result = await act(allowed, "clear");
    expect(result.selected).toEqual([]);
  });

  test("toggleSelectAll selects all, then clears", async () => {
    const app = await openSelection({ mode: "multiple" });

    let result = await act(app, "toggle-select-all");
    expect(result.selected).toHaveLength(6);

    result = await act(app, "toggle-select-all");
    expect(result.selected).toEqual([]);
  });

  test("setSelectedKeys keeps every real item, disabled included", async () => {
    // Kobalte's manager accepts the keys it is given (unlike the keyboard
    // path, which goes through canSelectItem): a controlled selection may
    // contain a key whose item is currently disabled.
    const app = await openSelection({
      mode: "multiple",
      disabled: "banana",
      keys: "apple,banana,cherry",
    });

    const result = await act(app, "set-keys");
    expect(result.selected).toEqual(["apple", "banana", "cherry"]);
  });

  test("allowDuplicateSelectionEvents reports an unchanged selection again", async () => {
    const duplicate = await openSelection({
      mode: "multiple",
      allowDuplicate: true,
    });

    await act(duplicate, "select-all");
    const duplicateResult = await act(duplicate, "select-all");
    expect(duplicateResult.changes).toHaveLength(2);

    const quiet = await openSelection({ mode: "multiple" });
    await act(quiet, "select-all");
    const quietResult = await act(quiet, "select-all");
    expect(quietResult.changes).toHaveLength(1);
  });

  test("controlled mode reports the next keys without changing the selected set", async () => {
    const app = await openSelection({
      mode: "multiple",
      selected: "apple",
      target: "banana",
      controlled: true,
    });

    let result = await act(app, "toggle");
    expect(result.selected).toEqual(["apple"]);
    expect(result.changes).toEqual([["apple", "banana"]]);

    result = await act(app, "apply");
    expect(result.selected).toEqual(["apple", "banana"]);
  });

  test("focus state and focused key", async () => {
    const app = await openSelection({ target: "banana" });

    let result = await act(app, "focus-key");
    expect(result.focusedKey).toBe("banana");
    expect(result.isFocused).toBe(false);

    result = await act(app, "focus");
    expect(result.isFocused).toBe(true);

    result = await act(app, "blur");
    expect(result.isFocused).toBe(false);

    // A key the collection does not contain is ignored by setFocusedKey.
    result = await act(app, "focus-missing");
    expect(result.focusedKey).toBe("banana");
  });

  test("isSelectionEqual compares the whole set", async () => {
    const app = await openSelection({
      selected: "apple,banana",
      keys: "apple,banana",
    });

    let result = await act(app, "equal");
    expect(result.equals).toBe(true);

    const other = await openSelection({
      selected: "apple,banana",
      keys: "apple,date",
    });

    result = await act(other, "equal");
    expect(result.equals).toBe(false);
  });

  test("selectionMode none ignores every write", async () => {
    const app = await openSelection({ mode: "none", target: "banana" });

    await act(app, "toggle");
    await act(app, "replace");
    await act(app, "select-all");
    const result = await act(app, "toggle-select-all");

    expect(result.selected).toEqual([]);
    expect(result.changes).toEqual([]);
  });
});
