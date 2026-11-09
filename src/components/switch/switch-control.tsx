import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { FALLBACK_SWITCH_CONTEXT, SwitchContext } from "./switch-context";
import { switchVariants } from "./switch.styles";

/**
 * The props of `Switch.Control`: HeroUI 3.2.7's `SwitchControlProps`, a `span`
 * that draws the track. Its DOM-only members (`render`, intrinsic attributes)
 * are accepted through NSH's host props; `class` is not part of the public
 * surface, `className` is.
 */
export interface SwitchControlProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Style of the track. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The track's view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;
}

/**
 * Switch.Control / SwitchControl: the track. Its size comes from the `size`
 * variant, its colour from the selection and the interaction signals the
 * Content part writes, and its focus ring from the keyboard modality. A
 * separate part, as upstream: the caller places it anywhere inside the
 * clickable face.
 */
export function SwitchControl(props: SwitchControlProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "onLayout",
  ] as const);

  const ctx = SwitchContext() ?? FALLBACK_SWITCH_CONTEXT;

  // R-027 … R-031: one owner for the track's background. HeroUI writes it with
  // five descendant selectors (`:hover`, `:active`, `[aria-checked]`, and the
  // two checked combinations); NSH has none, so the precedence is an explicit
  // branch: checked wins over hover, and either interaction on a checked track
  // uses the checked-hover colour.
  const background = () => {
    const active = !ctx.isDisabled() && (ctx.isHovered() || ctx.isPressed());

    if (ctx.isSelected()) {
      return active ? "bg-accent-hover" : "bg-accent";
    }

    return active ? "bg-default/80" : "bg-default";
  };

  const classes = computed(() =>
    [switchVariants({ size: ctx.size() }).control(), background(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // R-037: the thumb needs the track's width to place itself. The measurement
  // is taken on every layout change, including the harness fixture's, so a
  // resized track moves the thumb.
  const handleLayout = (event: { bounds: Bounds }) => {
    ctx.setTrackWidth(event.bounds.size.width);
    local.onLayout?.(event);
  };

  return (
    <View
      {...rest}
      ref={local.ref}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      // R-026: `.switch:focus-visible &` / the content's `data-focus-visible`
      // → `status-focused` (`ring-2 ring-focus`, 2px offset, no outline). It
      // shows only for the keyboard modality, which the Content part tracks.
      classList={{
        "ring-2 ring-focus ring-offset-[2px] ring-offset-background outline-none":
          ctx.isFocusVisible(),
      }}
      style={local.style}
      onLayout={handleLayout}
    >
      {local.children}
    </View>
  );
}
