/*
 * Portions of this file are based on code from Kobalte.
 * MIT Licensed, Copyright (c) 2022 Kobalte.
 *
 * Credits to the Kobalte team:
 * https://github.com/kobaltedev/kobalte/blob/675b4a11f4/packages/core/src/select/select-base.tsx
 *
 * Portions of this file are based on code from react-spectrum.
 * Apache License Version 2.0, Copyright 2020 Adobe.
 *
 * Credits to the React Spectrum team:
 * https://github.com/adobe/react-spectrum/blob/bfce84fee12a027d9cbc38b43e1747e3e4b4b169/packages/%40react-stately/select/src/useSelectState.ts
 *
 * Redesigned for NSH and without a DOM: Kobalte's `open` focuses a listbox
 * element it holds a ref to and reads the collection it built from an options
 * array; here the list registers itself (its `ListState` and two focus
 * callbacks), and the open state belongs to the owner's overlay trigger. What
 * survives is the algorithm: the open/close/toggle triad with a focus strategy,
 * the starting focused key (the selected option, else the first or last one),
 * and the close that releases the focused key so a hidden list holds no ring.
 */

import { type Accessor, cleanup, effect, signal } from "nsh";

import type { Collection, CollectionNode } from "../collection";
import type { FocusStrategy, MultipleSelectionManager } from "../selection";
import type { ListOwnerListControls } from "../list/list-owner";
import type { ListState } from "../list/create-list-state";

export interface CreateSelectStateProps {
  /** The field's open state, from its overlay trigger. */
  isOpen: Accessor<boolean>;

  /** Sets it (the disclosure's own setter, so controlled mode is honoured). */
  setIsOpen: (next: boolean | ((prev: boolean) => boolean)) => void;

  /** The list's collection, when it has registered itself. */
  collection: Accessor<Collection<CollectionNode> | undefined>;

  /** The list's selection manager, when it has registered itself. */
  selectionManager: Accessor<MultipleSelectionManager | undefined>;
}

export interface CreateSelectStateResult {
  /** The open state (the same accessor the props carry). */
  isOpen: Accessor<boolean>;

  /** The strategy the next focus placement uses. */
  focusStrategy: Accessor<FocusStrategy | undefined>;

  /** The registered list, or `undefined` before the first open. */
  list: Accessor<ListState | undefined>;

  /** The list's focus callbacks, or `undefined` before the first open. */
  controls: Accessor<ListOwnerListControls | undefined>;

  /** Called by the list: reports its state and focus callbacks. */
  registerList: (
    state: ListState,
    controls: ListOwnerListControls,
  ) => () => void;

  /**
   * Opens the field and places the focus. `"first"` / `"last"` choose the
   * starting option when nothing is selected; `true` (a pointer press, Enter or
   * Space) keeps the selected option only.
   */
  open: (strategy?: FocusStrategy | boolean) => void;

  /** Closes the field and releases the list's focus state. */
  close: () => void;

  /** Opens when closed, closes when open, with the same strategy rules. */
  toggle: (strategy?: FocusStrategy | boolean) => void;
}

/**
 * The select state shared by Select, ComboBox and Autocomplete (port sheet §5).
 * It owns no DOM and no element: the list reports two callbacks, and the
 * collection and selection manager it reports are what the strategy reads.
 */
export function createSelectState(
  props: CreateSelectStateProps,
): CreateSelectStateResult {
  const list = signal<ListState | undefined>(undefined);
  const controls = signal<ListOwnerListControls | undefined>(undefined);
  const focusStrategy = signal<FocusStrategy | undefined>(undefined);

  const registerList = (
    state: ListState,
    listControls: ListOwnerListControls,
  ) => {
    list.set(state);
    controls.set(listControls);

    return () => {
      if (list() === state) {
        list.set(undefined);
      }

      if (controls() === listControls) {
        controls.set(undefined);
      }
    };
  };

  /**
   * Kobalte's `open`: the selected option first (in collection order), then
   * the strategy's end. It marks the list focused and sets the key; the view
   * focus itself moves in the effect below, once the list is on screen (a
   * hidden list cannot take it). Doing the key here, before the state update,
   * puts the highlight in the same commit that shows the list — the first
   * frame a test can see already has it (T-069's marker was one commit late
   * under load).
   */
  const markFocus = (): boolean => {
    const manager = props.selectionManager();
    const collection = props.collection();

    if (!manager) {
      return false;
    }

    let key = manager.firstSelectedKey();
    const strategy = focusStrategy();

    if (key == null) {
      if (strategy === "first") {
        key = collection?.getFirstKey();
      } else if (strategy === "last") {
        key = collection?.getLastKey();
      }
    }

    manager.setFocused(true);
    manager.setFocusedKey(key);

    return true;
  };

  // The list can register after the first open (a field that starts closed
  // mounts its list in the same commit, so this is the `defaultOpen` path and
  // the guard for a list built later). The key is placed once per open and the
  // view focus once per open, after the commit that makes the list visible.
  let placed = false;
  let marked = false;

  effect(() => {
    const open = props.isOpen();

    if (!open) {
      placed = false;
      marked = false;
      // The list stays mounted while the field closes (port sheet §5, third
      // change), so its typeahead prefix would survive the close; upstream the
      // popover unmounts and the buffer goes with it (Kobalte's list is only
      // rendered while open). A prefix typed before the close must not extend
      // the first search after it.
      controls()?.resetTypeAhead?.();

      return;
    }

    const listControls = controls();

    if (!listControls || props.selectionManager() == null) {
      return;
    }

    // A `defaultOpen` / controlled open never went through `open()`.
    if (!marked) {
      marked = markFocus();
    }

    if (placed) {
      return;
    }

    placed = true;
    listControls.focusList();
  });

  /**
   * A close requested for the open state: React Aria reports it once per
   * request, even in controlled mode where the state stays open. Two channels
   * can ask at the same keystroke (Escape reaches both the list's key scope and
   * the overlay's `onCancel`), so the flag suppresses the rest of this turn's
   * asks and clears on the next tick, when a later Escape reports again.
   */
  let closeRequested = false;
  let closeReset: number | undefined;

  cleanup(() => {
    if (closeReset !== undefined) {
      clearTimeout(closeReset);
    }
  });

  const open = (strategy: FocusStrategy | boolean = true) => {
    if (props.isOpen()) {
      return;
    }

    closeRequested = false;
    focusStrategy.set(
      strategy === "first" || strategy === "last" ? strategy : undefined,
    );

    // The highlight lands in the commit that opens the list; the effect below
    // moves the focus to the list view once it is visible.
    marked = markFocus();

    props.setIsOpen(true);
  };

  const close = () => {
    if (closeRequested) {
      return;
    }

    closeRequested = true;

    const manager = props.selectionManager();

    // Kobalte releases both on close: a hidden list holds no focused option,
    // so reopening never shows a stale highlight.
    manager?.setFocused(false);
    manager?.setFocusedKey(undefined);

    props.setIsOpen(false);

    closeReset = setTimeout(() => {
      closeRequested = false;
      closeReset = undefined;
    }, 0);
  };

  const toggle = (strategy: FocusStrategy | boolean = true) => {
    if (props.isOpen()) {
      close();
    } else {
      open(strategy);
    }
  };

  return {
    isOpen: props.isOpen,
    focusStrategy,
    list,
    controls,
    registerList,
    open,
    close,
    toggle,
  };
}
