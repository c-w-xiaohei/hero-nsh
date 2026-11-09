import type { JSX, StyleProp, TextStyle, ViewRef } from "nsh";
import { Text } from "nsh";

import { PopoverContext, PopoverHeadingContext } from "./popover-context";
import { popoverVariants } from "./popover.styles";

/**
 * The props of `Popover.Heading`: React Aria's `Heading`, an `h{level}` with
 * `HTMLAttributes`. `level` becomes NSH's `accessibilityLevel` with
 * `role="header"`; `render` is accepted and does nothing.
 */
export interface PopoverHeadingProps {
  children?: JSX.Element;

  /** Appended after the heading slot classes; later classes win. */
  className?: string;
  style?: StyleProp<TextStyle>;

  /**
   * HeroUI's `level`; React Aria defaults to 3, except inside a Dialog, which
   * supplies 2 for its `title` slot (`react-aria-components/src/Dialog.tsx`).
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;

  /** The heading `Text`; a ref reaches it. */
  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;
  /** Accepted, no effect: HeroUI writes `slot="title"` internally; not exposed. */
  slot?: string;

  accessibilityLabel?: string;
}

/**
 * Popover.Heading / PopoverHeading: HeroUI's `HeadingPrimitive`, a `Text` with
 * the header role at the given level. The level is `props.level`, else the one
 * the surrounding Dialog supplies (2), else React Aria's fallback (3).
 */
export function PopoverHeading(props: PopoverHeadingProps) {
  const popover = PopoverContext();
  const dialogLevel = PopoverHeadingContext();
  const slots = popover?.slots ?? popoverVariants();

  const classes = () =>
    [slots.heading(), props.className ?? ""].filter((part) => part !== "").join(" ");

  return (
    <Text
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      role="header"
      accessibilityLevel={props.level ?? dialogLevel ?? 3}
      accessibilityLabel={props.accessibilityLabel}
      class={classes()}
      style={props.style}
    >
      {props.children}
    </Text>
  );
}
