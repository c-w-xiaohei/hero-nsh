import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { IconChevronDown } from "../icons";
import { renderChildren } from "./children";
import { AccordionContext, AccordionItemContext } from "./accordion-context";

/**
 * The props of `Accordion.Indicator`: HeroUI 3.2.7's `AccordionIndicatorProps`,
 * which is a DOM render prop for an `svg` plus `children` and a string
 * `className`.
 */
export interface AccordionIndicatorProps {
  /** A custom icon; without one the built-in chevron is drawn. */
  children?: JSX.Element;

  /** Appended after the indicator slot classes. */
  className?: string;

  /** Style of the indicator's box. */
  style?: StyleProp<ViewStyle>;

  /** The indicator view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The indicator was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** Accepted, no effect: D18 has no attributes to project. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: D18 has no attributes to project. */
  [key: `aria-${string}`]: unknown;

  /** Accepted, no effect (D18). */
  [key: `data-${string}`]: unknown;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * Accordion.Indicator / AccordionIndicator: the chevron at the trigger's inline
 * end, turned while the item is open.
 *
 * HeroUI renders an SVG and clones a custom child to inject the slot classes;
 * NSH has no SVG and cannot rewrite the caller's element, so a custom child
 * sits inside a box carrying the slot classes and the rotation (the same
 * treatment as Select.Indicator; port sheet §8).
 */
export function AccordionIndicator(props: AccordionIndicatorProps): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "onLayout",
    "aria-hidden",
    "render",
    "slot",
  ] as const);

  const accordion = AccordionContext();
  const item = AccordionItemContext();

  if (!accordion || !item) {
    return null;
  }

  // R-006 / R-007: the slot's size, colour and transform transition.
  const classes = computed(() =>
    [accordion.slots().indicator(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // The single read of `props.children`, at the placement.
  const content = () => {
    const children = local.children;

    if (children === undefined || children === null || children === false) {
      // The built-in chevron follows the slot's `text-muted`; the icon paints
      // through a token, so the token is named here (port sheet §8: a caller's
      // `text-*` class does not recolour the default icon, while it does reach
      // custom children).
      return <IconChevronDown color="muted" />;
    }

    return renderChildren(children);
  };

  return (
    <View
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      // R-008: `[data-expanded="true"] { rotate: -180deg }`; the attribute has
      // no channel, the rotation is the visible effect.
      classList={{ "-rotate-180": item.isExpanded() }}
      style={local.style}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
