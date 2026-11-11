import type { Accessor } from "nsh";
import { computed, context } from "nsh";

import type {
  SheetPlacement,
  SheetSlots,
  SheetSwipeDirection,
} from "./sheet.styles";
import { sheetVariants } from "./sheet.styles";

/**
 * What `Sheet.Root` hands every part: the open state, the four dimensions
 * HeroUI spreads over its `SheetContext` (`placement`, `isDetached`,
 * `isDismissable`, `snapPoints`, `isNested`), the resolved slot table and the
 * two channels only the root can own (the stack index and the animation-end
 * callback).
 *
 * Upstream also carries `isTriggerControlled`, the branch that lets
 * `Sheet.Trigger` own the state. NSH cannot inject a press handler into a
 * child element, so the root always owns the state (port sheet §5) and the
 * branch collapses.
 */
export interface SheetContextValue {
  /** The resolved `sheetVariants({placement})` for this subtree. */
  slots: Accessor<SheetSlots>;

  /** Which edge the sheet comes from (R-010 … R-018, R-025 … R-028). */
  placement: Accessor<SheetPlacement>;

  /** Floated away from the edge by 8 points on each side (R-016 … R-018, R-024). */
  isDetached: Accessor<boolean>;

  /** Whether a press outside or a swipe closes the sheet. @default true */
  isDismissable: Accessor<boolean>;

  /** Set by `Sheet.NestedRoot`; a nested sheet paints no backdrop of its own. */
  isNested: Accessor<boolean>;

  /**
   * The partial resting positions, with HeroUI's trailing full-height sentinel
   * already dropped (`normalizeSheetSnapPoints`).
   */
  snapPoints: Accessor<Array<number | string> | undefined>;

  /** The ceiling above it: 0 is the bottom-most open sheet, 1 the one over it. */
  stackIndex: Accessor<number>;

  /** The open state the Backdrop renders and every close channel writes. */
  isOpen: Accessor<boolean>;

  /** Sets it directly, as React Aria's overlay state does. */
  setIsOpen: (next: boolean | ((prev: boolean) => boolean)) => void;

  /** Opens it. */
  open: () => void;

  /** Closes it: a trigger press, Escape, the backdrop, `Sheet.Close`, … */
  close: () => void;

  /** Flips it. */
  toggle: () => void;

  /**
   * HeroUI's `onAnimationEnd`, driven here by the host dialog's open / close
   * callbacks (port sheet §2).
   */
  animationEnd: (open: boolean) => void;
}

/** What `createSheetContextValue` takes. */
export interface CreateSheetContextOptions {
  placement?: Accessor<SheetPlacement | undefined>;
  isDetached?: Accessor<boolean | undefined>;
  isDismissable?: Accessor<boolean | undefined>;
  isNested?: Accessor<boolean | undefined>;
  snapPoints?: Accessor<Array<number | string> | undefined>;
  stackIndex?: Accessor<number>;
  isOpen: Accessor<boolean>;
  setIsOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  animationEnd?: (open: boolean) => void;
}

/**
 * The context itself; `null` outside a `Sheet.Root`. `Sheet.NestedRoot` reads
 * it to prove it has a parent, as upstream's `useContext` does.
 */
export const SheetContext = context<SheetContextValue | null>(null);

/**
 * The direction a swipe dismisses in, handed down by `Sheet.Backdrop` from its
 * `swipeDirection` prop (React Aria's render prop upstream). The Handle reads
 * it to choose its axis (port sheet §2).
 */
export const SheetSwipeDirectionContext = context<SheetSwipeDirection | null>(null);

/** Builds the value once, in the Root; the parts only read it. */
export function createSheetContextValue(
  options: CreateSheetContextOptions,
): SheetContextValue {
  const placement = () => options.placement?.() ?? "bottom";
  const isDetached = () => options.isDetached?.() ?? false;
  const isDismissable = () => options.isDismissable?.() ?? true;
  const isNested = () => options.isNested?.() ?? false;
  const isOpen = options.isOpen;

  return {
    slots: computed(() => sheetVariants({ placement: placement() })),
    placement,
    isDetached,
    isDismissable,
    isNested,
    snapPoints: () => options.snapPoints?.(),
    stackIndex: () => options.stackIndex?.() ?? 0,
    isOpen,
    setIsOpen: (next) => options.setIsOpen(next),
    open: () => options.setIsOpen(true),
    close: () => options.setIsOpen(false),
    toggle: () => options.setIsOpen((prev) => !prev),
    animationEnd: (open) => options.animationEnd?.(open),
  };
}
