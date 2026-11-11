import type { JSX } from "nsh";

import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { createSheetState } from "./create-sheet-state";
import { SheetContext } from "./sheet-context";
import type { SheetPlacement } from "./sheet.styles";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Sheet.Root` (= `Sheet`): HeroUI 3.2.7's `SheetRootProps`.
 *
 * Root renders no element and no ref: upstream it is React Aria's
 * `SheetTrigger` plus two providers, so adding a wrapper view would change the
 * layout and the press chain.
 */
export interface SheetRootProps {
  /** The trigger, the backdrop and the panel. Read once, inside the providers. */
  children?: JSX.Element;

  /** The open state in controlled mode. */
  isOpen?: boolean;

  /** The initial open state in uncontrolled mode. @default false */
  defaultOpen?: boolean;

  /** Called whenever the open state changes. */
  onOpenChange?: (open: boolean) => void;

  /** Called when closing is requested, right after `onOpenChange(false)`. */
  onClose?: () => void;

  /** Called when the overlay finishes an enter or exit animation. */
  onAnimationEnd?: (open: boolean) => void;

  /** Whether clicking outside or swiping can close the sheet. @default true */
  isDismissable?: boolean;

  /** Which edge the sheet slides from. @default "bottom" */
  placement?: SheetPlacement;

  /**
   * Partial resting positions. Numbers are points. Strings are CSS lengths;
   * `"40%"` is a share of the sheet. The sheet opens at the first value. Full
   * height is implicit, so a trailing `1` is ignored. @default undefined
   */
  snapPoints?: Array<number | string>;

  /** Float the sheet away from the viewport edge. @default false */
  isDetached?: boolean;

  /** @internal Set by `Sheet.NestedRoot`. */
  isNested?: boolean;
}

/**
 * Sheet.Root / SheetRoot: the root HeroUI renders as `SheetTrigger` plus
 * `SheetContext`. It creates the one open state every part reads and provides
 * both channels:
 *
 * - `OverlayTriggerContext`, so a bare `<Button>` written inside the root is its
 *   trigger. Upstream reaches the same contract through React Aria's
 *   PressResponder; NSH cannot inject a press handler into a child element, so
 *   the Button reads the context itself (port sheet §5, the Modal ruling), and
 *   `Sheet.Trigger` is a real part that only groups its child.
 * - `SheetContext`, the dimensions, the slot table, the close channel, the
 *   stack index and `onAnimationEnd`.
 *
 * `_common` exception: because it provides context, `props.children` is read
 * once, inside the providers, at the placement. A computed created in the body
 * would be evaluated outside them and the parts would lose the context.
 */
export function SheetRoot(props: SheetRootProps): JSX.Element {
  const state = createSheetState({
    defaultOpen: () => props.defaultOpen,
    isDetached: () => props.isDetached,
    isDismissable: () => props.isDismissable,
    isNested: () => props.isNested,
    isOpen: () => props.isOpen,
    onAnimationEnd: props.onAnimationEnd,
    onClose: props.onClose,
    onOpenChange: props.onOpenChange,
    placement: () => props.placement,
    snapPoints: () => props.snapPoints,
  });

  return (
    <OverlayTriggerContext.Provider value={state.context}>
      <SheetContext.Provider value={state.sheetContext}>{props.children}</SheetContext.Provider>
    </OverlayTriggerContext.Provider>
  );
}
