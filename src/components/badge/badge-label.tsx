import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./badge-children";
import { badgeVariants } from "./badge.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./badge-dom-props";
import { viewProps } from "./badge-dom-props";
import { joinClassNames } from "./class-names";
import { BadgeContext } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Badge Label
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Badge.Label`: HeroUI 3.2.7's `BadgeLabelProps`, which is
 * React's `<span>` attributes plus `children` and `className`.
 *
 * `render`, `aria-*` and `data-*` are accepted for API parity and have no
 * effect (port sheet §1, §8). A `Badge.Label` outside a `Badge` has no slot
 * class upstream either — only the caller's `className`.
 */
export interface BadgeLabelProps
  extends Omit<ViewProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The content; a bare string or number becomes a `Text`. */
  children?: JSX.Element;

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

  /** Hides the label from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the label `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

export function BadgeLabel(props: BadgeLabelProps): JSX.Element {
  const ctx = BadgeContext();

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

  // R-008 lives in `badge.styles.ts`; the slot class comes from the root's
  // table through context and is empty when the label stands alone.
  const classes = computed(() =>
    joinClassNames(ctx ? ctx.slots().label() : "", local.className),
  );

  // The single read of `props.children`, cached so a dynamic child such as
  // `<Badge.Label>{count()}</Badge.Label>` keeps updating (research 4.1 / 4.6).
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
      {/*
        A `View` carries the label's padding while its children draw: a bare
        string or number becomes a `Text`, an element (the caller's icon) passes
        through (port sheet §3).
      */}
      {renderChildren(children())}
    </View>
  );
}
