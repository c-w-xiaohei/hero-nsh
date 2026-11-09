import type { JSX, StyleProp, TextStyle } from "nsh";
import { Text } from "nsh";

import type { PopoverContextValue } from "./popover-context";
import { PopoverContext } from "./popover-context";
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

  /** HeroUI's `level` (default 3) → `accessibilityLevel`. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;

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
 * the header role at the given level.
 */
export function PopoverHeading(props: PopoverHeadingProps) {
  const popover = PopoverContext();
  const slots = popover?.slots ?? popoverVariants();

  const classes = () =>
    [slots.heading(), props.className ?? ""].filter((part) => part !== "").join(" ");

  return (
    <Text
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      role="header"
      accessibilityLevel={props.level ?? 3}
      accessibilityLabel={props.accessibilityLabel}
      class={classes()}
      style={props.style}
    >
      {props.children}
    </Text>
  );
}
