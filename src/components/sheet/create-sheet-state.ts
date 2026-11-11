import type { Accessor } from "nsh";
import { effect, signal } from "nsh";

import type { CreateOverlayTriggerResult } from "../../primitives/create-overlay-trigger";
import { createOverlayTrigger } from "../../primitives/create-overlay-trigger";
import type { SheetContextValue } from "./sheet-context";
import { createSheetContextValue } from "./sheet-context";
import type { SheetPlacement } from "./sheet.styles";
import { normalizeSheetSnapPoints } from "./sheet.utils";

/**
 * The open sheets, in the order they opened, so a sheet knows whether it is the
 * bottom-most one and therefore paints the backdrop (R-005 / R-006).
 *
 * React Aria keeps a stack of its own; NSH's Dialog has no stack handle, so the
 * registry is a module-level signal: a Root appends its id while it is open and
 * removes it on close or unmount. It is an approximation of `stackIndex`, which
 * port sheet §8 registers as a difference.
 */
const openSheets = signal<readonly number[]>([]);

let nextSheetId = 0;

function registerOpenSheet(id: number) {
  openSheets.update((previous) => (previous.includes(id) ? previous : [...previous, id]));
}

function unregisterOpenSheet(id: number) {
  openSheets.update((previous) => previous.filter((entry) => entry !== id));
}

/** What `createSheetState` takes: the Root's props, all as accessors. */
export interface CreateSheetStateProps {
  /** The open state in controlled mode. */
  isOpen?: Accessor<boolean | undefined>;

  /** The initial open state in uncontrolled mode (default `false`). */
  defaultOpen?: Accessor<boolean | undefined>;

  /** Called whenever the open state changes. */
  onOpenChange?: (open: boolean) => void;

  /** Called after `onOpenChange(false)`, once per close request. */
  onClose?: () => void;

  /** Called when the layer finishes appearing or disappearing. */
  onAnimationEnd?: (open: boolean) => void;

  /** @default true */
  isDismissable?: Accessor<boolean | undefined>;

  /** @default "bottom" */
  placement?: Accessor<SheetPlacement | undefined>;

  /** @default false */
  isDetached?: Accessor<boolean | undefined>;

  /** The partial resting positions, before the sentinel is dropped. */
  snapPoints?: Accessor<Array<number | string> | undefined>;

  /** Set by `Sheet.NestedRoot`. @default false */
  isNested?: Accessor<boolean | undefined>;
}

/** Everything the Root builds: the overlay trigger, the context and the state. */
export interface CreateSheetStateResult extends CreateOverlayTriggerResult {
  /** The value `SheetContext.Provider` gets. */
  sheetContext: SheetContextValue;

  /** The normalized snap points every part below reads. */
  snapPoints: Accessor<Array<number | string> | undefined>;

  /** The position in the open-sheet stack: 0 is bottom-most. */
  stackIndex: Accessor<number>;
}

/**
 * Sheet's open state. Kobalte has the two halves apart —
 * `createDisclosureState` for the boolean and, in `dialog-root.tsx`, the
 * trigger and focus return; `createOverlayTrigger` is the library's existing
 * composition of them, so this adds the three things Sheet needs on top: the
 * `onClose` call HeroUI makes in the same setter, the snap-point
 * normalization, and the stack index the backdrop paint reads.
 *
 * The close path is single: every part closes through `setIsOpen(false)` (port
 * sheet §1.1), so `onOpenChange(false)` and `onClose()` always travel together
 * as upstream's `setIsOpen` does.
 */
export function createSheetState(props: CreateSheetStateProps): CreateSheetStateResult {
  // Focus return: React Aria's focus scope restores focus to the trigger when
  // the overlay closes. A *nested* sheet skips it: its trigger lives inside the
  // parent sheet's panel, and on the web target focusing that view makes the
  // host stop delivering presses and keys altogether (measured on T-023: after
  // the nested CloseTrigger closed it, neither "Nested" nor Escape reached the
  // app until the focus call was gone). The top-level return is unchanged.
  const trigger = createOverlayTrigger({
    returnFocus: () => props.isNested?.() !== true,
    isOpen: props.isOpen,
    defaultOpen: props.defaultOpen,
    onOpenChange: (open) => {
      props.onOpenChange?.(open);

      if (!open) {
        props.onClose?.();
      }
    },
  });

  const snapPoints = () => normalizeSheetSnapPoints(props.snapPoints?.());

  const id = nextSheetId++;

  // The registry is written through the updater form, which reads nothing
  // tracked, so this effect depends on `isOpen` alone. The cleanup removes the
  // entry on close, on a rerun and on unmount.
  effect(() => {
    const open = trigger.isOpen();

    if (!open) {
      return () => unregisterOpenSheet(id);
    }

    registerOpenSheet(id);

    return () => unregisterOpenSheet(id);
  });

  const stackIndex = (): number => {
    const index = openSheets().indexOf(id);

    return index < 0 ? 0 : index;
  };

  /**
   * React Aria's `hasDescendants` is `sheetStack.slice(index + 1).length > 0`,
   * i.e. any sheet that opened after this one — not only one nested inside it.
   * The open-sheet stack above already carries exactly that order, so the
   * check is the registry itself; `Sheet.NestedRoot` opening through its own
   * `createSheetState` is what appends the entry, which is why the part needs
   * no announcement of its own (port sheet §2).
   */
  const hasDescendants = (): boolean => {
    const index = openSheets().indexOf(id);

    return index >= 0 && index < openSheets().length - 1;
  };

  const sheetContext = createSheetContextValue({
    isOpen: trigger.isOpen,
    setIsOpen: trigger.setIsOpen,
    placement: props.placement,
    isDetached: props.isDetached,
    isDismissable: props.isDismissable,
    isNested: props.isNested,
    snapPoints,
    stackIndex,
    hasDescendants,
    animationEnd: (open) => props.onAnimationEnd?.(open),
  });

  return {
    ...trigger,
    sheetContext,
    snapPoints,
    stackIndex,
  };
}
