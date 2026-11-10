import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { FALLBACK_RADIO_ITEM_CONTEXT, RadioItemContext } from "./radio-context";
import { radioVariants } from "./radio.styles";
import { renderChildren } from "./render-children";

/**
 * The props of `Radio.Control`: HeroUI 3.2.7's `RadioControlProps`, a `span`
 * that draws the 16pt circle. Its DOM-only members (`render`, intrinsic
 * attributes) are accepted through NSH's host props; `class` is not part of the
 * public surface, `className` is.
 */
export interface RadioControlProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Style of the circle. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The circle's view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/**
 * `Radio.Control` / `RadioControl`: the 16pt circle. Its colour, border, shadow,
 * scale and focus ring come from the selection and the interaction signals the
 * Content writes; the group's `variant` reaches it through the item context, so
 * a `secondary` group restyles every item's circle without the group's own
 * appearance changing (R-029—R-032).
 *
 * A separate part, as upstream: the caller places it anywhere inside the
 * clickable face and puts the Indicator inside it.
 */
export function RadioControl(props: RadioControlProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "render",
    "onLayout",
  ] as const);

  const ctx = RadioItemContext() ?? FALLBACK_RADIO_ITEM_CONTEXT;

  const isSecondary = () => ctx.variant() === "secondary";

  // R-017 / R-018 / R-029: one owner for the circle's background. Selected wins
  // over the secondary variant's `bg-default`; a selected + pressed circle
  // paints the hover accent (R-018), so no two background classes are ever
  // written at once.
  const background = () => {
    if (ctx.isSelected()) {
      return ctx.isPressed() ? "bg-accent-hover" : "bg-accent";
    }

    if (isSecondary()) {
      return "bg-default";
    }

    return "";
  };

  // R-014 / R-017 / R-030: one owner for the border colour. Selected wins over
  // hover, as the stylesheet's later, equally specific selected block does.
  const border = () => {
    if (ctx.isSelected()) {
      return "border-transparent";
    }

    if (ctx.isHovered()) {
      return "border-field-border-hover";
    }

    return "";
  };

  // R-016: `@apply scale-95` while held. `isPressed` already excludes a
  // disabled radio; a read-only one still paints the press, as upstream does.
  const transform = () => (ctx.isPressed() ? "scale-95" : "");

  // R-029: `.radio-group--secondary .radio__control { @apply shadow-none }`.
  const shadow = () => (isSecondary() ? "shadow-none" : "");

  const appearance = computed(() =>
    [background(), border(), transform(), shadow()]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const classes = computed(() =>
    [radioVariants().control(), appearance(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const classList = () => ({
    // R-013: `status-focused` → `ring-2 ring-focus` with the theme's 2px
    // offset, no outline.
    "ring-2 ring-focus ring-offset-[2px] ring-offset-background":
      ctx.isFocusVisible() && !ctx.isInvalid(),
    // R-019 / R-020: `status-invalid-field`'s unfocused half (a selected item
    // takes the same declaration, so one branch covers both) and its focused
    // ring.
    "outline outline-1 outline-solid outline-danger": ctx.isInvalid(),
    "ring-2 ring-danger ring-offset-0": ctx.isFocusVisible() && ctx.isInvalid(),
  });

  const handleLayout = (event: { bounds: Bounds }) => {
    local.onLayout?.(event);
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      classList={classList()}
      style={local.style}
      onLayout={handleLayout}
    >
      {renderChildren(local.children)}
    </View>
  );
}
