import type { Accessor } from "nsh";

import type { ListState } from "../../primitives";
import type { ToggleButtonGroupSelectionMode } from "./toggle-button-group-context";

/** A group key as HeroUI's `selectedKeys` accepts it: a string or a number. */
export type ToggleButtonGroupKey = string | number;

/**
 * React Stately's `ToggleGroupState`
 * (react-spectrum@740c6c5 packages/react-stately/src/toggle/useToggleGroupState.ts:41-58),
 * the value HeroUI's group render props carry and its members read
 * (`packages/react-aria-components/src/ToggleButton.tsx:84-88`). The plain
 * fields are getters here (D17), so a tree that reads one where it binds
 * follows the selection. Upstream's `Key` is `string | number` and every key is
 * `String()`ed into this port's collection.
 */
export interface ToggleButtonGroupState {
  /** Whether one or several buttons can be selected. */
  readonly selectionMode: ToggleButtonGroupSelectionMode;

  /** Whether the whole group is disabled. */
  readonly isDisabled: boolean;

  /** Whether the selection may become empty. */
  readonly disallowEmptySelection: boolean;

  /** The keys of the selected buttons. */
  readonly selectedKeys: Set<string>;

  /** Whether the given key is selected. */
  isSelected(key: ToggleButtonGroupKey): boolean;

  /** Sets whether the given key is selected; a value it already has is ignored. */
  setSelected(key: ToggleButtonGroupKey, isSelected: boolean): void;

  /** Replaces the whole selection with `keys`. */
  setSelectedKeys(keys: Iterable<ToggleButtonGroupKey>): void;

  /** Flips the selected state of the given key. */
  toggleKey(key: ToggleButtonGroupKey): void;
}

/** What `createToggleButtonGroupState` reads the group's live values from. */
export interface ToggleButtonGroupStateOptions {
  /** The group's `createListState`: the collection plus its selection manager. */
  listState: ListState;
  selectionMode: Accessor<ToggleButtonGroupSelectionMode>;
  isDisabled: Accessor<boolean>;
  disallowEmptySelection: Accessor<boolean>;
}

/**
 * Builds the group state over the list state's selection manager. Every write
 * goes through `SelectionManager.toggleSelection` / `setSelectedKeys`, which
 * honour `selectionMode`, `disallowEmptySelection` and which keys can be
 * selected (react-spectrum@740c6c5
 * packages/react-stately/src/toggle/useToggleGroupState.ts:79-107 against
 * packages/@react-stately/selection/src/SelectionManager.ts).
 *
 * `setSelected` mirrors upstream's `if (isSelected !== selectedKeys.has(key))
 * this.toggleKey(key)`, so a write that repeats the current value is dropped.
 */
export function createToggleButtonGroupState(
  options: ToggleButtonGroupStateOptions,
): ToggleButtonGroupState {
  const manager = () => options.listState.selectionManager();

  return {
    get selectionMode() {
      return options.selectionMode();
    },
    get isDisabled() {
      return options.isDisabled();
    },
    get disallowEmptySelection() {
      return options.disallowEmptySelection();
    },
    get selectedKeys() {
      return manager().selectedKeys();
    },
    isSelected: (key) => manager().isSelected(String(key)),
    setSelected: (key, isSelected) => {
      const selection = manager();
      const normalized = String(key);

      if (selection.isSelected(normalized) !== isSelected) {
        selection.toggleSelection(normalized);
      }
    },
    setSelectedKeys: (keys) => {
      manager().setSelectedKeys(new Set([...keys].map((key) => String(key))));
    },
    toggleKey: (key) => manager().toggleSelection(String(key)),
  };
}
