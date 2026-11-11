/*
 * Toast's two contexts, both internal (upstream's `ToastContext` is internal
 * too: `toast.tsx:68`, not exported from `src/index.ts`).
 *
 * Upstream has one context, created by the region with `createContext({})`,
 * carrying the slot table and the region's stack geometry; the single toast and
 * every leaf part read it. NSH has no descendant CSS (`:has()`, `> :not(...)`,
 * `[data-exiting] …`), so the state those selectors expressed has to be handed
 * down as accessors. That is the second context, created per toast by
 * `ToastRoot`:
 *
 * - `ToastContext` (region): slot table, placement, gap, scale factor, the
 *   snapshot of the queue, measured heights, expansion, and the region's
 *   actions (close, height registration, focus handoff).
 * - `ToastItemContext` (one toast): the entry, its stacking index and state
 *   flags, whether its content is hidden (collapsed non-front), whether an
 *   indicator registered itself, and the text registration the root needs for
 *   its accessible name.
 *
 * Every member is optional, and each default is the same empty object upstream
 * uses, so a part rendered outside a toast keeps working with only the caller's
 * `className` (port sheet §1).
 */

import { context } from "nsh";
import type { Accessor, ViewRef } from "nsh";

import type { toastVariants } from "./toast.styles";
import type { ToastEntry, ToastVariant } from "./toast-queue";

/** HeroUI's `placement` dimension values. */
export type ToastPlacement =
  | "bottom"
  | "bottom start"
  | "bottom end"
  | "top"
  | "top start"
  | "top end";

/** One resolved `tv()` table; the region creates it and every part reads its own slot. */
export type ToastSlots = ReturnType<typeof toastVariants>;

/** What the region tells the toasts and the leaf parts. */
export interface ToastContextValue {
  /** The region instance's resolved variant table. */
  slots?: Accessor<ToastSlots>;

  /** Where the stack sits; a toast may override it per instance. */
  placement?: Accessor<ToastPlacement>;

  /** Distance between two toasts, in points. */
  gap?: Accessor<number>;

  /** How much each toast behind the front one scales down. */
  scaleFactor?: Accessor<number>;

  /** Forced or interaction-driven expansion of the stack. */
  isExpanded?: Accessor<boolean>;

  /** The visual cap; older toasts stay mounted and hidden. */
  maxVisibleToasts?: Accessor<number>;

  /** The queue's snapshot, newest first. */
  visibleToasts?: Accessor<readonly ToastEntry[]>;

  /** Keys playing their exit transition. */
  exitingKeys?: Accessor<ReadonlySet<string>>;

  /** Measured heights by key; the frontmost one is the collapsed stack's height. */
  heightsByKey?: Accessor<Record<string, number>>;

  /** The key holding the keyboard focus, reported by each toast root. */
  focusedKey?: Accessor<string | null>;

  /** Reports a toast's measured height to the region. */
  registerHeight?: (key: string, height: number) => void;

  /** Drops a toast's height when it unmounts. */
  removeHeight?: (key: string) => void;

  /** Dismisses a toast; the entry stays mounted for its exit transition. */
  close?: (key: string) => void;

  /** Registers a toast root's ref getter for the focus handoff; returns the unregister. */
  registerFocusable?: (key: string, node: () => ViewRef | undefined) => () => void;

  /** Reports the toast that took (or lost) the keyboard focus. */
  setFocusedKey?: (key: string | null) => void;

  /** Hands the focus to the nearest remaining toast, newer first, else older. */
  moveFocusFrom?: (key: string) => void;

  /** Pointer entered a toast or the region; cancels a pending collapse. */
  pointerEnter?: () => void;

  /** Pointer left; the collapse is deferred one frame so a sibling can cancel it. */
  pointerLeave?: () => void;
}

/** What one toast tells its parts. */
export interface ToastItemContextValue {
  /** This toast's entry. */
  toast?: Accessor<ToastEntry>;

  /** The variant in force: the toast's own prop, else the entry's content, else `default`. */
  variant?: Accessor<ToastVariant>;

  /** Where this toast sits in the layout (exiting siblings excluded). */
  index?: Accessor<number>;

  /** The first visible toast. */
  isFrontmost?: Accessor<boolean>;

  /** The stack is expanded around this toast. */
  isExpanded?: Accessor<boolean>;

  /** Beyond `maxVisibleToasts`, so visually removed but still mounted. */
  isHidden?: Accessor<boolean>;

  /** Playing its exit transition. */
  isExiting?: Accessor<boolean>;

  /** Collapsed non-front: the content, indicator and action fade out (R-025). */
  contentHidden?: Accessor<boolean>;

  /** An indicator registered itself, so the grid keeps its first track (R-049). */
  hasIndicator?: Accessor<boolean>;

  /** `Toast.Indicator` registers itself on mount; the returned function unregisters. */
  registerIndicator?: () => () => void;

  /**
   * `Toast.Title` / `Toast.Description` register their text so the root's
   * accessible name is `"Title, Description"` (port sheet §2, §5). The
   * accessor is read by the root's label; a part may only register once.
   */
  registerText?: (slot: "title" | "description", text: Accessor<string>) => () => void;

  /** Dismisses this toast (the close button's default action). */
  close?: () => void;
}

export const ToastContext = context<ToastContextValue>({});

export const ToastItemContext = context<ToastItemContextValue>({});

/**
 * Whether one toast's controls (its close and action buttons) are Tab stops.
 *
 * HeroUI takes a toast out of the tab order unless it is the frontmost one:
 * `toast.tsx:240` writes `tabIndex = -1` on every other root, `:250-258` drops
 * an exiting toast's controls and makes a hidden toast `inert`, which takes the
 * whole subtree with it. NSH's web host walks the view tree in paint order,
 * where a lower `zIndex` row comes first, so a reachable close button on a
 * toast behind the front one takes the Tab that belongs to the frontmost root
 * (T-020 … T-022). Its controls therefore leave the tab order too; a keyboard
 * user reaches the frontmost toast and then its controls, which is the order
 * HeroUI's `tabIndex` gives in a browser.
 */
export function isToastControlReachable(item: ToastItemContextValue): boolean {
  return (
    item.isFrontmost?.() === true &&
    item.isHidden?.() !== true &&
    item.isExiting?.() !== true
  );
}
