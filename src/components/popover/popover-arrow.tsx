import type { Accessor, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, View } from "nsh";

import { renderChildren } from "./children";
import type { PopoverPositionContextValue } from "./popover-context";
import { PopoverPositionContext } from "./popover-context";
import type { PopoverPlacement } from "./popover-placement";

/** The live state HeroUI hands to `Arrow`'s `className` and `style` functions. */
export interface PopoverArrowRenderValues {
  placement: Accessor<PopoverPlacement>;
}

/**
 * The props of `Popover.Arrow`: React Aria's `OverlayArrow` props. `className`
 * and `style` may be functions of the render values; a custom child replaces
 * the default arch and takes over its own color (port sheet §4 R-011).
 */
export interface PopoverArrowProps {
  children?: JSX.Element;

  /** Appended after the arrow slot classes; later classes win. */
  className?: string | ((values: PopoverArrowRenderValues) => string);
  style?: StyleProp<ViewStyle> | ((values: PopoverArrowRenderValues) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;
  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

// The default arrow's cross-axis size: HeroUI's path is 12 wide, about 6 high.
const ARROW_HALF = 6;

/**
 * Popover.Arrow / PopoverArrow: HeroUI's `OverlayArrow`. The wrapper is the
 * positioned element (absolute, on the anchor's side, rotated by placement);
 * the default child is the 12×6 arch R-011 describes.
 */
export function PopoverArrow(props: PopoverArrowProps) {
  const position = PopoverPositionContext();
  const { anchorBounds, overlayBounds, side, placement } = position ?? DEFAULT_POSITION;

  const values: PopoverArrowRenderValues = { placement };

  const className = () => {
    const value = props.className;

    return (typeof value === "function" ? value(values) : value) ?? "";
  };

  const resolvedStyle = () => {
    const value = props.style;

    return typeof value === "function" ? value(values) : value;
  };

  // R-023: the arrow sits on the anchor's side and its cross-axis coordinate
  // is the anchor's centre in the content's coordinates, kept inside the
  // content's rounded box.
  const crossAxis = computed<number | undefined>(() => {
    const anchor = anchorBounds();
    const overlay = overlayBounds();

    if (!anchor || !overlay) {
      return undefined;
    }

    const horizontal = side() === "top" || side() === "bottom";

    const centre = horizontal
      ? anchor.origin.x + anchor.size.width / 2 - overlay.origin.x
      : anchor.origin.y + anchor.size.height / 2 - overlay.origin.y;

    const length = horizontal ? overlay.size.width : overlay.size.height;

    // `border-radius: min(32px, 24px)` is 24; the arch is 12 long, so its
    // centre may travel between 6 and length - 6.
    const min = Math.min(ARROW_HALF, length / 2);
    const max = Math.max(min, length - min);

    return Math.max(min, Math.min(centre, max)) - ARROW_HALF;
  });

  // R-011: the default arrow is a real view, a 12×6 half-ellipse arch in the
  // overlay colour; the HeroUI path cannot be reproduced with classes. It faces
  // down by default (`rounded-b-full`), which is the direction of HeroUI's
  // `M0 0C5.48483 8 6.5 8 12 0Z`.
  const defaultArrow = (
    <View
      class="h-1.5 w-3 rounded-b-full bg-overlay"
      testID={props.testID ? props.testID + "-default" : undefined}
    />
  );

  const arrow = props.children == null ? defaultArrow : renderChildren(props.children);

  const sidePosition = () => {
    switch (side()) {
      case "top":
        return { bottom: -ARROW_HALF };
      case "bottom":
        return { top: -ARROW_HALF };
      case "left":
        return { right: -ARROW_HALF };
      case "right":
        return { left: -ARROW_HALF };
    }
  };

  const crossPosition = () => {
    const value = crossAxis();

    if (value === undefined) {
      return {};
    }

    return side() === "top" || side() === "bottom" ? { left: value } : { top: value };
  };

  // R-012 / R-013 / R-014: the arch turns with the side it points at.
  const classList = computed(() => ({
    "rotate-180": side() === "bottom",
    "-rotate-90": side() === "left",
    "rotate-90": side() === "right",
  }));

  return (
    <View
      ref={props.ref}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      class={className()}
      classList={classList()}
      style={[{ position: "absolute" }, sidePosition(), crossPosition(), resolvedStyle()]}
    >
      {arrow}
    </View>
  );
}

/** Used when an Arrow is written outside a Content; it then sits at the centre. */
const DEFAULT_POSITION: PopoverPositionContextValue = {
  anchorBounds: () => undefined,
  overlayBounds: () => undefined,
  side: () => "bottom",
  placement: () => "bottom",
};
