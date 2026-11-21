import { context, createAnimatedValue } from "nsh";
import type { Accessor } from "nsh";

import type { PressFeedback } from "../../primitives/pressable";

/**
 * The read half of the `createPressFeedback` seam one `ListGroup.Item` runs,
 * seen from inside the row — the same channel view `PressableFeedbackContext`
 * hands its parts and `ControlFieldContext.feedback` hands the field's parts.
 * The press driver functions are left out: the item's `View` owns the
 * writers, consumers only read.
 *
 * `nsh/test` can reach neither a view's `hitSlop` prop nor an
 * `AnimatedValue`-bound style, so these channels are the seam's only
 * observable surface (sheet §5, M-012/M-013/M-017).
 */
export interface ListGroupItemContextValue
  extends Omit<PressFeedback, "pressDown" | "pressUp" | "layout"> {
  /** The seam's effective gate (`input()==="touch"` and not `isDisabled`). */
  enabled: Accessor<boolean>;
}

/** What a part sees outside a `ListGroup.Item`: the seam fully at rest. */
const RESTING_ITEM: ListGroupItemContextValue = {
  isPressed: () => false,
  pressed: createAnimatedValue(0),
  scale: createAnimatedValue(1),
  highlightOpacity: createAnimatedValue(0),
  hitSlop: () => undefined,
  pressOrigin: () => null,
  bounds: () => ({ width: 0, height: 0 }),
  enabled: () => false,
};

export const ListGroupItemContext =
  context<ListGroupItemContextValue>(RESTING_ITEM);
