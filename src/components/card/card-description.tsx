import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./card-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./card-dom-props";
import { viewProps } from "./card-dom-props";
import { cardVariants } from "./card.styles";
import { CardContext } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Card Description
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Card.Description`: HeroUI 3.2.7's `CardDescriptionProps`, a
 * `p`'s intrinsic attributes plus `children` and `className`, expressed with
 * NSH's view host props. The DOM-only members are accepted and have no effect
 * (port sheet §1, §8).
 */
export interface CardDescriptionProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The description text. A bare string or number becomes a `Text` at the placement. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The DOM `title` attribute upstream; maps to `tooltip` + `accessibilityHint`. */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the description from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the description's `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Card.Description` / `CardDescription`: the secondary line under the title,
 * 14 / 20 in the muted color.
 *
 * R-016: upstream this is a `<p>`; NSH has no paragraph element, so it is a
 * `View` carrying the `description` slot, with a `Text` for a bare string child
 * (research 4.1, 4.6). The column layout of the card supplies the block
 * behaviour the `<p>` had.
 */
export function CardDescription(props: CardDescriptionProps): JSX.Element {
  // The root's variant, when this description sits inside a `Card` (port
  // sheet §2).
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

    return cardVariants({ variant }).description({ className: local.className });
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
      // A `<p>` is not a keyboard focus stop upstream; the caller's own
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
