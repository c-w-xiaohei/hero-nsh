import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./children";
import { AccordionContext } from "./accordion-context";

/**
 * The props of `Accordion.Body`: HeroUI 3.2.7's `AccordionBodyProps`, a DOM
 * render prop for a `div` plus `children` and a string `className`.
 *
 * As upstream, the outer view takes everything except `className`, which lands
 * on the inner padded view (port sheet §1).
 */
export interface AccordionBodyProps {
  /** The text content. */
  children?: JSX.Element;

  /** Appended after the inner slot classes (`px-4 pt-0 pb-4 text-muted`). */
  className?: string;

  /** Style of the outer view. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID` on the outer view. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests on the outer view. */
  testID?: string;

  /** A desktop hover tooltip on the outer view; a bare string becomes its text. */
  tooltip?: JSX.Element;

  /** The outer view was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect (D18). */
  [key: `data-${string}`]: unknown;

  /** The outer view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/**
 * Accordion.Body / AccordionBody: the padded content area. Two views, as
 * upstream: the outer carries `text-sm` and every prop but `className`, the
 * inner carries the padding and the muted colour plus the caller's class
 * (R-003, R-004).
 */
export function AccordionBody(props: AccordionBodyProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
    "render",
    "slot",
    "ref",
  ] as const);

  const accordion = AccordionContext();

  const bodyClass = computed(() => accordion?.slots().body() ?? "");

  // R-004: `.accordion__body-inner` plus the caller's class, in that order.
  const innerClass = computed(() =>
    [accordion?.slots().bodyInner() ?? "", local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <View
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={renderChildren(local.tooltip)}
      class={bodyClass()}
      style={local.style}
      onLayout={local.onLayout}
    >
      <View class={innerClass()}>{renderChildren(local.children as JSX.Element)}</View>
    </View>
  );
}
