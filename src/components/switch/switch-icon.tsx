import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { split, View } from "nsh";

import { FALLBACK_SWITCH_CONTEXT, SwitchContext } from "./switch-context";
import { switchVariants } from "./switch.styles";

/**
 * The props of `Switch.Icon`: HeroUI 3.2.7's `SwitchIconProps`, a `span` that
 * slots content into the thumb.
 */
export interface SwitchIconProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Style of the slot. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The slot's view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;
}

/**
 * Switch.Icon / SwitchIcon: the content slot inside the thumb. Its base class
 * is the same string as the thumb's content wrapper, mirroring
 * `.switch__thumb > *` (R-046); it stays a real part so callers can place it
 * wherever HeroUI allows.
 */
export function SwitchIcon(props: SwitchIconProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
  ] as const);

  const ctx = SwitchContext() ?? FALLBACK_SWITCH_CONTEXT;

  const classes = () =>
    [switchVariants({ size: ctx.size() }).icon(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" ");

  return (
    <View
      {...rest}
      ref={local.ref}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {local.children}
    </View>
  );
}
