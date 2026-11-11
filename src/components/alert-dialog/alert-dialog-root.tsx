import type { JSX } from "nsh";

import { createOverlayTrigger, OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import type { AlertDialogContextValue } from "./alert-dialog-context";
import { AlertDialogContext, createAlertDialogContextValue } from "./alert-dialog-context";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `AlertDialog.Root` (= `AlertDialog`): HeroUI 3.2.7's
 * `AlertDialogRootProps`, which is React Aria's `DialogTrigger` props.
 *
 * `DialogTrigger` renders no element and no `ref`, so Root has no host view:
 * adding a wrapper would change the layout and the press chain. The `ref` is
 * therefore accepted and has no effect (port sheet §1, §8).
 */
export interface AlertDialogRootProps {
  /** The trigger and the `AlertDialog.Backdrop`. Read once, inside the providers. */
  children: JSX.Element;

  /** The open state in controlled mode. */
  isOpen?: boolean;

  /** The initial open state in uncontrolled mode (default `false`). */
  defaultOpen?: boolean;

  /** Called whenever the open state changes: a trigger press or a close. */
  onOpenChange?: (isOpen: boolean) => void;

  /** Accepted, no effect: Root has no host view to attach a ref to. */
  ref?: (node: unknown) => void;
}

/**
 * AlertDialog.Root / AlertDialogRoot: HeroUI's `DialogTrigger`. It creates the
 * one open state every part reads and provides both channels:
 *
 * - `OverlayTriggerContext`, so a bare `<Button>` written inside the root is
 *   its trigger (React Aria's PressResponder does the same upstream), and so
 *   `AlertDialog.Trigger` can register itself as the focus-return target;
 * - `AlertDialogContext`, the slot table and the close channel the parts
 *   consume.
 *
 * `_common` exception: because it provides context, `props.children` is read
 * once, inside the providers, at the placement. A computed created in the body
 * would be evaluated outside them and the parts would lose the context.
 */
export function AlertDialogRoot(props: AlertDialogRootProps): JSX.Element {
  // HeroUI's `DialogTrigger` is React Aria's `useOverlayTriggerState`: the
  // same open state, trigger registry and focus return the rest of the overlay
  // family uses (research 4.4). `createOverlayTrigger` is that composition.
  const state = createOverlayTrigger({
    defaultOpen: () => props.defaultOpen,
    isOpen: () => props.isOpen,
    onOpenChange: props.onOpenChange,
  });

  const contextValue: AlertDialogContextValue = createAlertDialogContextValue({
    isOpen: state.isOpen,
    setOpen: state.setIsOpen,
  });

  return (
    <OverlayTriggerContext.Provider value={state.context}>
      <AlertDialogContext.Provider value={contextValue}>{props.children}</AlertDialogContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
