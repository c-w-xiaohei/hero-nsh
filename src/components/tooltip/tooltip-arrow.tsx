import type { Accessor, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, View } from "nsh";

import { renderChildren } from "./children";
import type { TooltipPositionContextValue } from "./tooltip-context";
import { TooltipPositionContext } from "./tooltip-context";
import type { TooltipSide } from "./tooltip-placement";

/** The live state HeroUI hands to `Arrow`'s `className` and `style` functions. */
export interface TooltipArrowRenderValues {
  /**
   * React Aria's `OverlayArrowRenderProps.placement`, `PlacementAxis | null`:
   * `null` until the content is positioned or when the arrow stands outside a
   * Content (`react-aria-components/src/OverlayArrow.tsx`).
   */
  placement: Accessor<TooltipSide | null>;
}

/**
 * The props of `Tooltip.Arrow`: React Aria's `OverlayArrow` props. `className`
 * and `style` may be functions of the render values; a custom child replaces
 * the default arch and takes over its own colour (port sheet §4 R-012).
 */
export interface TooltipArrowProps {
  children?: JSX.Element;

  /** Appended after the arrow slot classes; later classes win. */
  className?: string | ((values: TooltipArrowRenderValues) => string);
  style?: StyleProp<ViewStyle> | ((values: TooltipArrowRenderValues) => StyleProp<ViewStyle>);

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
// The tip's `radius-xl` (12px) is what limits the arch's travel, so half of it
// is 6 too (port sheet §5.6; Popover's 24 does not carry over).
const ARROW_HALF = 6;

/**
 * Tooltip.Arrow / TooltipArrow: HeroUI's `OverlayArrow`. The wrapper is the
 * positioned element (absolute, on the anchor's side, rotated by placement);
 * the default child is the arch R-012 describes.
 */
export function TooltipArrow(props: TooltipArrowProps) {
  const position = TooltipPositionContext();
  const { anchorBounds, overlayBounds, side, placement } = position ?? DEFAULT_POSITION;

  const values: TooltipArrowRenderValues = { placement };

  const className = () => {
    const value = props.className;

    return (typeof value === "function" ? value(values) : value) ?? "";
  };

  const resolvedStyle = () => {
    const value = props.style;

    return (typeof value === "function" ? value(values) : value);
  };

  // R-020: React Aria's `OverlayArrow` inline placement. The cross-axis
  // coordinate is the anchor's centre in the tip's coordinates, kept inside the
  // corner radius; `-translate-x-1/2` / `-translate-y-1/2` (in `classList`
  // below) then centres the arch on it, as `OverlayArrow` does.
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

    // Port sheet §5.6: the centre may travel between 6 and length − 6, the
    // radius keeping the arch's ends inside the rounded corner.
    const min = Math.min(ARROW_HALF, length / 2);
    const max = Math.max(min, length - min);

    return Math.max(min, Math.min(centre, max));
  });

  // R-012: HeroUI's SVG path `M0 0C5.48483 8 6.5 8 12 0Z` cannot be reproduced
  // with classes, so the default arrow is a real view: a 12×6 half-ellipse arch
  // in the overlay colour, its border the same `border-border/40` stroke.
  const defaultArrow = (
    <View
      class="h-1.5 w-3 rounded-b-full border border-border/40 bg-overlay"
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

  // R-013 / R-014 / R-015: the arch turns with the side it points at. R-020's
  // `translate(-50%)` centres it on the computed coordinate; it runs in the
  // wrapper's own axes, so it stays right when the rotation applies.
  const classList = computed(() => ({
    "-translate-x-1/2": side() === "top" || side() === "bottom",
    "-translate-y-1/2": side() === "left" || side() === "right",
    "rotate-180": side() === "bottom",
    "-rotate-90": side() === "left",
    "rotate-90": side() === "right",
  }));

  return (
    <View
      ref={(node) => props.ref?.(node)}
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

/** Used when an Arrow is written outside a Content; it then sits at the centre
 * with no measured placement, as a standalone `OverlayArrow` does. */
const DEFAULT_POSITION: TooltipPositionContextValue = {
  anchorBounds: () => undefined,
  overlayBounds: () => undefined,
  side: () => "top",
  placement: () => null,
};
