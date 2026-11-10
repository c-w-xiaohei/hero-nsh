import type { Accessor } from "nsh";

import type { CreateOverlayTriggerResult } from "../../primitives/create-overlay-trigger";
import { createOverlayTrigger } from "../../primitives/create-overlay-trigger";

/**
 * HeroUI's `UseOverlayStateReturn` (`hooks/use-overlay-state.ts`), the object
 * `Modal.Root` accepts through its `state` prop. D17 makes `isOpen` an
 * accessor or a plain boolean, so a store can pass either.
 */
export interface ModalState {
  isOpen: Accessor<boolean> | boolean;
  setOpen: (next: boolean) => void;
}

/** What `createModalState` takes: the open channels of Root or Backdrop. */
export interface CreateModalStateProps {
  /** The open state in controlled mode. */
  isOpen?: Accessor<boolean | undefined>;

  /** The initial open state in uncontrolled mode (default `false`). */
  defaultOpen?: Accessor<boolean | undefined>;

  /** Called whenever the state changes, with the payload HeroUI uses. */
  onOpenChange?: (isOpen: boolean) => void;

  /** Root's `state` bypass; it wins over `isOpen` / `defaultOpen`. */
  state?: ModalState;

  /** Whether closing returns focus to the registered trigger (default `true`). */
  returnFocus?: Accessor<boolean | undefined>;
}

/**
 * Modal's open state and trigger registry, as the Root and a standalone
 * Backdrop both need them. Kobalte has the same two pieces apart
 * (`createDisclosureState` and, in `dialog-root.tsx`, the trigger ref);
 * `createOverlayTrigger` is the library's existing composition of them, so
 * this adds only the `state` bypass and the HeroUI payload.
 */
export type CreateModalStateResult = CreateOverlayTriggerResult;

export function createModalState(props: CreateModalStateProps): CreateModalStateResult {
  // A plain boolean is a controlled value too (D17 lets a store hand over a
  // `signal()` read, but HeroUI code may still pass one).
  const stateOpen = (): boolean | undefined => {
    const state = props.state;

    if (!state) {
      return undefined;
    }

    return typeof state.isOpen === "boolean" ? state.isOpen : state.isOpen();
  };

  return createOverlayTrigger({
    isOpen: () => stateOpen() ?? props.isOpen?.(),
    defaultOpen: () => props.defaultOpen?.(),
    // The `state` bypass and the prop hear the same change, as React Aria's
    // `useOverlayTriggerState` calls its `onOpenChange` after the store's.
    onOpenChange: (isOpen) => {
      props.state?.setOpen(isOpen);
      props.onOpenChange?.(isOpen);
    },
    returnFocus: props.returnFocus,
  });
}
