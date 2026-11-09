/*
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/main/packages/%40react-stately/selection/src/SelectionManager.ts
 *
 * Adapted to NSH: the collection is an accessor here, so the section passes the
 * root's one, while the selection state is its own. React Aria creates this
 * manager only when a collection section declares a `selectionMode`
 * (`react-aria-components/src/Menu.tsx:478-481`), and forwards focus to the
 * parent manager so the menu keeps a single focused key.
 */

import type { Accessor } from "nsh";

import type { Collection, CollectionNode } from "../../primitives";
import {
  type MultipleSelectionState,
  SelectionManager,
} from "../../primitives";

/**
 * A section-level selection manager (RAC's `GroupSelectionManager`): selection
 * reads and writes the section's own state, while every focus method resolves
 * to the menu's manager. That keeps `focusedKey` unique for the whole menu and
 * lets the root's keyboard navigation and screen-reader focus follow the same
 * key the entries report.
 */
export class GroupSelectionManager extends SelectionManager {
  private parentManager: SelectionManager;

  constructor(
    parentManager: SelectionManager,
    collection: Accessor<Collection<CollectionNode>>,
    state: MultipleSelectionState,
  ) {
    super(collection, state);
    this.parentManager = parentManager;
  }

  isFocused() {
    return this.parentManager.isFocused();
  }

  focusedKey() {
    return this.parentManager.focusedKey();
  }

  setFocused(isFocused: boolean) {
    this.parentManager.setFocused(isFocused);
  }

  setFocusedKey(key?: string) {
    this.parentManager.setFocusedKey(key);
  }
}
