import type { JSX } from "nsh";

import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import type { ModalState } from "./create-modal-state";
import { createModalState } from "./create-modal-state";
import type { ModalContextValue } from "./modal-context";
import { createModalContextValue, ModalContext } from "./modal-context";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Modal.Root` (= `Modal`): HeroUI 3.2.7's `ModalRootProps`,
 * which is `DialogTrigger`'s props plus the `state` bypass.
 *
 * `DialogTrigger` renders no element and no `ref`, so Root has no host view:
 * adding a wrapper would change the layout and the press chain.
 */
export interface ModalRootProps {
  /** The trigger and the `Modal.Backdrop`. Read once, inside the providers. */
  children: JSX.Element;

  /** The open state in controlled mode. */
  isOpen?: boolean;

  /** The initial open state in uncontrolled mode (default `false`). */
  defaultOpen?: boolean;

  /** Called whenever the open state changes: a trigger press, Escape, a press. */
  onOpenChange?: (isOpen: boolean) => void;

  /**
   * HeroUI's `UseOverlayStateReturn`: when it is present it owns the state and
   * the props above are ignored, as `useOverlayTriggerState` does. `isOpen` is
   * an accessor or a boolean (D17).
   */
  state?: ModalState;

  /** Accepted, no effect: Root has no host view to attach a ref to. */
  ref?: (node: unknown) => void;
}

/**
 * Modal.Root / ModalRoot: HeroUI's `DialogTrigger`. It creates the one open
 * state every part reads and provides both channels:
 *
 * - `OverlayTriggerContext`, so a bare `<Button>` written inside the root is
 *   its trigger (React Aria's PressResponder does the same upstream, and it is
 *   what every HeroUI fixture and story relies on), and so `Modal.Trigger` can
 *   register itself as the focus-return target;
 * - `ModalContext`, the slot table and the close channel the parts consume.
 *
 * `_common` exception: because it provides context, `props.children` is read
 * once, inside the providers, at the placement. A computed created in the body
 * would be evaluated outside them and the parts would lose the context.
 */
export function ModalRoot(props: ModalRootProps): JSX.Element {
  const state = createModalState({
    defaultOpen: () => props.defaultOpen,
    isOpen: () => props.isOpen,
    onOpenChange: props.onOpenChange,
    state: props.state,
  });

  const contextValue: ModalContextValue = createModalContextValue({
    isOpen: state.isOpen,
    setOpen: state.setIsOpen,
  });

  return (
    <OverlayTriggerContext.Provider value={state.context}>
      <ModalContext.Provider value={contextValue}>{props.children}</ModalContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
