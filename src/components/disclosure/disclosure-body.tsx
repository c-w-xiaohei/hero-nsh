import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { split, View } from "nsh";

import { disclosureVariants } from "./disclosure.styles";
import { renderChildren } from "./render-children";

/**
 * The props of `Disclosure.Body`: HeroUI 3.2.7's `DisclosureBodyContentProps`,
 * a two-layer wrapper — the outer `div` carries `p-2` and everything the caller
 * passes except `className`, which lands on the inner `div` (port sheet §1.1).
 */
export interface DisclosureBodyProps {
  /** The body's content. Bare strings become `Text`, since NSH's View draws none. */
  children?: JSX.Element;

  /** Appended to the **inner** div, as upstream. */
  className?: string;

  /** Style of the outer div, as upstream's spread. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID` on the outer div. */
  id?: string;
  nativeID?: string;

  /** An identifier for UI tests, on the outer div. */
  testID?: string;

  /** A hint shown while the pointer rests on the body. */
  tooltip?: JSX.Element;

  /** The body was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** The outer div's view; a callback, because a ref store throws on the web target. */
  ref?: (node: ViewRef) => void;

  /** The accessible name of the body. */
  accessibilityLabel?: string;

  /** Hides the body from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: the element generic `E` is fixed to the NSH `View`. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Every `aria-*` attribute, accepted for API parity. */
  [key: `aria-${string}`]: unknown;

  /** Every `data-*` attribute: NSH projects none of them (D18). */
  [key: `data-${string}`]: unknown;
}

/**
 * Disclosure.Body / DisclosureBody: the padded body inside the panel, with the
 * same two layers as HeroUI — the outer one owns `p-2`, the caller's
 * `className` reaches the inner one (port sheet §3).
 */
export function DisclosureBody(props: DisclosureBodyProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
    "ref",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "render",
    "slot",
  ] as const);

  const slots = disclosureVariants();

  return (
    <View
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      accessibilityLabel={local.accessibilityLabel}
      accessibilityElementsHidden={local.accessibilityElementsHidden}
      class={slots.body()}
      style={local.style}
      onLayout={local.onLayout}
    >
      <View class={[slots.bodyInner(), local.className ?? ""].filter((part) => part.length > 0).join(" ")}>
        {renderChildren(local.children)}
      </View>
    </View>
  );
}
