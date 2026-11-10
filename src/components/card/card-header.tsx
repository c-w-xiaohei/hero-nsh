import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./card-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./card-dom-props";
import { viewProps } from "./card-dom-props";
import { cardVariants } from "./card.styles";
import { CardContext } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Card Header
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Card.Header`: HeroUI 3.2.7's `CardHeaderProps`, a `div`'s
 * intrinsic attributes plus `children` and `className`, expressed with NSH's
 * view host props. The DOM-only members are accepted and have no effect (port
 * sheet §1, §8).
 */
export interface CardHeaderProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The header content. A bare string or number becomes a `Text` at the placement. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The DOM `title` attribute upstream; maps to `tooltip` + `accessibilityHint`. */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the header from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the header's `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Card.Header` / `CardHeader`: the column that stacks the title and the
 * description.
 *
 * R-014: upstream this is a `<div>`; here it is a `View` carrying the `header`
 * slot, and a bare string child is wrapped in a `Text` because a `View` draws
 * none (research 4.1, 4.6).
 */
export function CardHeader(props: CardHeaderProps): JSX.Element {
  // The root's variant, when this header sits inside a `Card` (port sheet §2).
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

    // Upstream a part outside a Card gets no slots, so `composeSlotClassName`
    // returns the caller's class alone — never the table's default variant.
    if (variant === undefined) {
      return local.className;
    }

    return cardVariants({ variant }).header({ className: local.className });
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
      // A `<div>` is not a keyboard focus stop upstream; the caller's own
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
