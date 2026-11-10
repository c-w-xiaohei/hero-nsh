import type { Accessor } from "nsh";
import { computed, signal } from "nsh";

import { createKeymapScope } from "../../primitives";
import type { ToolbarAxisAlignment, ToolbarItem } from "./context";

export interface CreateToolbarStateOptions {
  /** The toolbar's axis; picks which arrow pair is bound. */
  orientation: Accessor<ToolbarAxisAlignment>;
}

export interface ToolbarState {
  /** Joins the registry; the returned function leaves it. */
  registerItem: (item: ToolbarItem) => () => void;
}

/**
 * The toolbar's focus registry and arrow-key scope (port sheet §2 and §5).
 *
 * React Aria's `useToolbar` (`@react-aria/toolbar` 3.53.1, restated in port
 * sheet §5) attaches a capture-phase `onKeyDown` to the toolbar element, reads
 * `document.activeElement`, and moves the focus with
 * `focusManager.focusNext` / `focusPrevious`: it handles only the axis the
 * toolbar runs along, never wraps at the ends, skips controls that cannot take
 * the focus, and ignores events from anything outside the toolbar.
 *
 * NSH has no key handler on a view and no way to enumerate a subtree, so both
 * halves change shape:
 *
 * - the subtree walk becomes a registry: every control hands in its `focused`,
 *   `focusable` and `focus`, in writing order (research 4.2);
 * - the capture handler becomes `createKeymapScope`, bound while one of those
 *   registered controls holds the focus, which is the same "the event landed
 *   inside the toolbar" test — a key pressed in a popover or in another
 *   component never reaches this scope.
 *
 * Kept in this component's directory, not in `src/primitives/`: a batch runs
 * in parallel worktrees and two units may not add the same shared file (common
 * rules, "New shared code inside a batch").
 */
export function createToolbarState(props: CreateToolbarStateOptions): ToolbarState {
  const items = signal<readonly ToolbarItem[]>([]);

  const registerItem = (item: ToolbarItem) => {
    items.set([...items(), item]);

    return () => {
      items.set(items().filter((current) => current !== item));
    };
  };

  const isFocusWithin = computed(() => items().some((item) => item.focused()));

  /**
   * Moves the focus by one focusable member, in registration (writing) order,
   * and does not wrap: `focusNext` / `focusPrevious` stop at the ends, so the
   * walk gives up rather than coming back around. A member that is disabled or
   * left out of the Tab order is passed over, as React Aria's focusable
   * enumeration does. When nothing is focused the walk does nothing: NSH's
   * press does not focus a view, so there is no anchor to move from (port
   * sheet §8).
   */
  const moveFocus = (delta: 1 | -1) => {
    const members = items();
    const current = members.findIndex((item) => item.focused());

    if (current < 0) {
      return;
    }

    for (let next = current + delta; next >= 0 && next < members.length; next += delta) {
      const target = members[next];

      if (!target.focusable()) {
        continue;
      }

      target.focus();
      return;
    }
  };

  // One scope per axis: `isActive` also carries the orientation, so changing it
  // unloads one pair and binds the other instead of keeping the first read.
  createKeymapScope({
    isActive: () => isFocusWithin() && props.orientation() === "horizontal",
    bindings: {
      left: () => moveFocus(-1),
      right: () => moveFocus(1),
    },
    options: { repeat: true },
  });

  createKeymapScope({
    isActive: () => isFocusWithin() && props.orientation() === "vertical",
    bindings: {
      up: () => moveFocus(-1),
      down: () => moveFocus(1),
    },
    options: { repeat: true },
  });

  return { registerItem };
}
