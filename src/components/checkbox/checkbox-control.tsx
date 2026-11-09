import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import {
  FALLBACK_CHECKBOX_CONTEXT,
  CheckboxContext,
} from "./checkbox-context";
import { checkboxVariants } from "./checkbox.styles";
import { renderChildren } from "./render-children";

/**
 * The props of `Checkbox.Control`: HeroUI 3.2.7's `CheckboxControlProps`, a
 * `span` that draws the square. Its DOM-only members (`render`, intrinsic
 * attributes) are accepted through NSH's host props; `class` is not part of the
 * public surface, `className` is.
 */
export interface CheckboxControlProps
  extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Style of the square. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The square's view, as `ComponentPropsWithRef` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/**
 * Checkbox.Control / CheckboxControl: the 16pt square. Its colour, border,
 * shadow and fill come from the selection and the interaction signals the
 * Content part writes, and its focus ring from the keyboard modality. A
 * separate part, as upstream: the caller places it anywhere inside the
 * clickable face, and puts the Indicator inside it.
 *
 * Upstream draws the fill as `::before`; NSH has no pseudo-elements, so the
 * first child is a real `View` carrying the same classes (`R-021`), still below
 * the Indicator's `z-10` (`R-032`).
 */
export function CheckboxControl(props: CheckboxControlProps): JSX.Element {
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

  const ctx = CheckboxContext() ?? FALLBACK_CHECKBOX_CONTEXT;

  // `variant === "secondary"` (R-035 / R-038 / R-039 / R-040) is read from the
  // context, so an item without its own variant follows its group.
  const isSecondary = () => ctx.variant() === "secondary";

  // R-024 / R-036: the hover border. `.checkbox:hover &` and
  // `:has(content[data-hovered])` are one rule here; the root's hover covers
  // hovering the description or the error, the Content's hover covers the face
  // and is off while read-only. With the theme's 0px field border this paints
  // nothing at rest, exactly as upstream.
  const isHovered = () => ctx.rootHovered() || ctx.isHovered();

  // R-026 / R-027 / R-030 / R-031: one owner for the square's background.
  // Selected wins over the interactions, invalid wins over selected, and the
  // secondary variant's `bg-default` is the fallback of R-035 / R-038.
  const background = () => {
    if (ctx.isInvalid() && (ctx.isSelected() || ctx.isIndeterminate())) {
      return "bg-danger";
    }

    if (ctx.isIndeterminate()) {
      // R-028: indeterminate + pressed paints the hover accent.
      return ctx.isActive() ? "bg-accent-hover" : "bg-accent";
    }

    if (isSecondary()) {
      return "bg-default";
    }

    return "";
  };

  // R-026 / R-027 / R-030 / R-031: one owner for the text colour, which the
  // default check and line read through `currentColor` upstream.
  const text = () => {
    if (ctx.isInvalid() && (ctx.isSelected() || ctx.isIndeterminate())) {
      return "text-danger-foreground";
    }

    if (ctx.isSelected() || ctx.isIndeterminate()) {
      return "text-accent-foreground";
    }

    return "";
  };

  // R-024 / R-026 / R-030: one owner for the border colour. Selected wins over
  // hover (the stylesheet's selected block comes later with equal specificity).
  const border = () => {
    if (ctx.isSelected() || ctx.isIndeterminate()) {
      return "border-transparent";
    }

    if (isHovered()) {
      return "border-field-border-hover";
    }

    return "";
  };

  const appearance = computed(() =>
    [background(), text(), border(), isSecondary() ? "shadow-none" : ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // R-029: an invalid, unselected square shows the 1px danger outline; focused,
  // it adds the 2px danger ring (R-023's focus ring is the valid one).
  const isInvalidResting = () =>
    ctx.isInvalid() && !ctx.isSelected() && !ctx.isIndeterminate();

  const classes = computed(() =>
    [checkboxVariants({ variant: ctx.variant() }).control(), appearance(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const classList = () => ({
    // R-023: `.checkbox:focus-visible &` / `data-focus-visible` →
    // `status-focused` (`ring-2 ring-focus`, 2px offset, no outline).
    "ring-2 ring-focus ring-offset-[2px] ring-offset-background":
      ctx.isFocusVisible() && !isInvalidResting(),
    // R-029: `status-invalid-field`'s unfocused half, and its focused ring.
    "outline-1 outline-danger outline-solid": isInvalidResting(),
    "ring-2 ring-danger ring-offset-0": ctx.isFocusVisible() && isInvalidResting(),
  });

  // R-021: `::before` becomes the square's first child: `pointer-events-none
  // absolute inset-0 z-0 origin-center scale-70 rounded-md bg-accent opacity-0`.
  // R-022: its transitions collapse to `duration-200 ease-linear` (NSH has one
  // duration per element; §5).
  // R-026 / R-030 / R-039: selected scales it in, invalid paints it danger;
  // R-024's hover colour is one branch, so no class-order tie is left.
  const fillClasses = computed(() =>
    [
      "pointer-events-none absolute inset-0 z-0 origin-center scale-70 rounded-md bg-accent opacity-0 transition duration-200 ease-linear motion-reduce:transition-none",
      ctx.isInvalid() && ctx.isSelected()
        ? "bg-danger"
        : isHovered()
          ? "bg-accent-hover"
          : "",
      ctx.isSelected() ? "scale-100 opacity-100" : "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

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
      {/* R-021: the `::before` fill layer, before the caller's children. */}
      <View class={fillClasses()} />
      {renderChildren(local.children)}
    </View>
  );
}
