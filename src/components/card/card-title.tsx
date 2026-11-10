import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./card-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./card-dom-props";
import { viewProps } from "./card-dom-props";
import { cardVariants } from "./card.styles";
import { CardContext } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Card Title
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Card.Title`: HeroUI 3.2.7's `CardTitleProps`, an `h3`'s
 * intrinsic attributes plus `children` and `className`, expressed with NSH's
 * view host props. The DOM-only members are accepted and have no effect (port
 * sheet §1, §8).
 */
export interface CardTitleProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The title text. A bare string or number becomes a `Text` at the placement. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The DOM `title` attribute upstream; maps to `tooltip` + `accessibilityHint`. */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the title from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /**
   * The heading level. Upstream the element is an `h3`; NSH has no heading
   * elements, so the level rides on `role="header"` and this number (default 3,
   * the level of upstream's default element).
   */
  accessibilityLevel?: number;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the title's `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Card.Title` / `CardTitle`: the card's heading, 14 / 24 / 500 in the
 * foreground color.
 *
 * R-015: upstream this is an `<h3>`; NSH has no heading element, so it is a
 * `View` with `role="header"` and `accessibilityLevel`, carrying the `title`
 * slot, with an inner `Text` that inherits the color, size, line height and
 * weight from the view (twref "Text styles inherit"). The caller's `className`
 * (`pe-8`, `z-10`, `text-xs` in the stories) lands on the `View`, so the
 * inherited text styles follow it.
 */
export function CardTitle(props: CardTitleProps): JSX.Element {
  // The root's variant, when this title sits inside a `Card` (port sheet §2).
  const ctx = CardContext();

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "focusable",
    "id",
    "nativeID",
    "title",
    "tooltip",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityElementsHidden",
    "accessibilityLevel",
    "aria-label",
    "aria-hidden",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  const classes = computed(() => {
    const variant = ctx.variant?.();

    // A part outside a Card has no slots upstream: only the caller's class.
    if (variant === undefined) {
      return local.className;
    }

    return cardVariants({ variant }).title({ className: local.className });
  });

  const tooltip = computed<JSX.Element>(() => {
    if (local.tooltip !== undefined) {
      return local.tooltip;
    }

    const text = local.title;

    return text === undefined || text.length === 0 ? undefined : <Text>{text}</Text>;
  });

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      role="header"
      accessibilityLevel={local.accessibilityLevel ?? 3}
      // A `<h3>` is not a keyboard focus stop upstream; the caller's own
      // `focusable` wins.
      focusable={local.focusable ?? false}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden
      }
      accessibilityHint={local.accessibilityHint ?? local.title}
      tooltip={tooltip()}
      class={classes()}
      style={local.style}
    >
      {renderChildren(local.children)}
    </View>
  );
}
