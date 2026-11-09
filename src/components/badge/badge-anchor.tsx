import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./badge-children";
import { badgeVariants } from "./badge.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./badge-dom-props";
import { viewProps } from "./badge-dom-props";
import { joinClassNames } from "./class-names";

/* -------------------------------------------------------------------------------------------------
 * Badge Anchor
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Badge.Anchor`: HeroUI 3.2.7's `BadgeAnchorProps`, which is
 * React's `<span>` attributes plus `children` and `className`.
 *
 * The anchor does not read `BadgeContext` upstream (`cx("badge-anchor",
 * className)`), so it does not here either. Its one job is to be the
 * positioning context for the absolutely placed badge, which is why it is the
 * only part whose `children` is required: without content it would have no box.
 */
export interface BadgeAnchorProps
  extends Omit<ViewProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The anchor's content: the target (an avatar, a surface) and the badge. */
  children: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /**
   * Upstream this is the DOM `title` attribute of `<span>`: the browser's
   * native hover tooltip. NSH has no `title`, so it feeds `tooltip` and
   * `accessibilityHint`.
   */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the anchor from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the anchor `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

export function BadgeAnchor(props: BadgeAnchorProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "focusable",
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

  // R-009 lives in `badge.styles.ts`. The anchor has no variant dimensions
  // upstream, so its slot is the same class string for every instance.
  const classes = computed(() =>
    joinClassNames(badgeVariants().anchor(), local.className),
  );

  // The single read of `props.children`, cached so a dynamic child keeps
  // updating; bare strings and numbers become `Text` inside the `View`.
  const children = computed(() => local.children);

  // `<span title>` shows the browser's native hint; NSH draws it with `tooltip`
  // and describes it with `accessibilityHint` (port sheet §8).
  const titleText = computed(() => {
    const text = local.title;

    return text !== undefined && text.length > 0 ? text : undefined;
  });
  const titleTooltip = computed(() => {
    const text = titleText();

    return text === undefined ? undefined : <Text>{text}</Text>;
  });

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      focusable={local.focusable ?? false}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={local["aria-hidden"] ?? local.accessibilityElementsHidden}
      accessibilityHint={local.accessibilityHint ?? titleText()}
      tooltip={local.tooltip ?? titleTooltip()}
      class={classes()}
      style={local.style}
    >
      {renderChildren(children())}
    </View>
  );
}
