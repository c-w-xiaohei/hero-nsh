import type { Accessor } from "nsh";

/**
 * The `state` member of HeroUI's `ModalRenderProps` (React Aria's overlay
 * state), accessor-ised per D17.
 */
export interface AlertDialogRenderState {
  isOpen: Accessor<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * What `AlertDialog.Backdrop` and `AlertDialog.Container` hand a function
 * child, in the order HeroUI does (port sheet §1). NSH's entering / exiting
 * phases are approximations: entering is the presence's first frame, exiting
 * has no host phase and stays `false` (port sheet §8).
 */
export interface AlertDialogRenderValues {
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
  state: AlertDialogRenderState;
}
