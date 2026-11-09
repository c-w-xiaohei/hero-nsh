import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { split, View } from "nsh";

import { disclosureVariants } from "./disclosure.styles";
import { renderChildren } from "./render-children";

/**
 * The props of `Disclosure.Heading`: React Aria's `Heading` with
 * `HTMLAttributes`. HeroUI renders `h{level}`; NSH has no `h1`–`h6`, so the
 * heading is a `View` with `role="header"` and `accessibilityLevel` (port sheet
 * §1.1, §3).
 */
export interface DisclosureHeadingProps {
  /** The heading's content: usually the trigger, as upstream. */
  children?: JSX.Element;

  /** Appended after the heading slot; later classes win. */
  className?: string;

  /** Style of the heading. */
  style?: StyleProp<ViewStyle>;

  /** The heading level, React Aria's `level`. @default 3 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The heading's view; a callback, because a ref store throws on the web target. */
  ref?: (node: ViewRef) => void;

  /** The accessible name of the heading. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Every `aria-*` attribute, accepted for API parity. */
  [key: `aria-${string}`]: unknown;

  /** Every `data-*` attribute: NSH projects none of them (D18). */
  [key: `data-${string}`]: unknown;
}

/**
 * Disclosure.Heading / DisclosureHeading: the heading that wraps the trigger.
 * Upstream it is an `h{level}`; here it is `role="header"` plus the level, the
 * only heading channel NSH has.
 */
export function DisclosureHeading(props: DisclosureHeadingProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "level",
    "id",
    "nativeID",
    "testID",
    "ref",
    "accessibilityLabel",
    "render",
    "slot",
  ] as const);

  const slots = disclosureVariants();

  const classes = () =>
    [slots.heading(), local.className ?? ""].filter((part) => part.length > 0).join(" ");

  return (
    <View
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      role="header"
      accessibilityLevel={local.level ?? 3}
      accessibilityLabel={local.accessibilityLabel}
      class={classes()}
      style={local.style}
    >
      {renderChildren(local.children)}
    </View>
  );
}
