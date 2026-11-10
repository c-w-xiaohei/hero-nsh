import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./card-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./card-dom-props";
import { viewProps } from "./card-dom-props";
import { cardVariants } from "./card.styles";
import { CardContext } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Card Content
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Card.Content`: HeroUI 3.2.7's `CardContentProps`, a `div`'s
 * intrinsic attributes plus `children` and `className`, expressed with NSH's
 * view host props. The DOM-only members are accepted and have no effect (port
 * sheet §1, §8).
 */
export interface CardContentProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The content. A bare string or number becomes a `Text` at the placement. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The DOM `title` attribute upstream; maps to `tooltip` + `accessibilityHint`. */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the content from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the content's `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Card.Content` / `CardContent`: the growing column under the header, one
 * step tighter than the header's gap.
 *
 * R-017: upstream this is a `<div>`; here it is a `View` carrying the `content`
 * slot, with a bare string child wrapped in a `Text` (research 4.1, 4.6).
 */
export function CardContent(props: CardContentProps): JSX.Element {
  // The root's variant, when this content sits inside a `Card` (port sheet §2).
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

    // A part outside a Card has no slots upstream: only the caller's class.
    if (variant === undefined) {
      return local.className;
    }

    return cardVariants({ variant }).content({ className: local.className });
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
