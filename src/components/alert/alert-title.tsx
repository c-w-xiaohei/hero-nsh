import { computed, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./alert-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./alert-dom-props";
import { viewProps } from "./alert-dom-props";
import { titleText, titleTooltip } from "./alert-hint";
import { joinClassNames } from "./class-names";
import { AlertContext } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Alert Title
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Alert.Title`: HeroUI 3.2.7's `AlertTitleProps`, which is a
 * `p`'s intrinsic attributes plus `children` and `className`, expressed with
 * NSH's view host props.
 */
export interface AlertTitleProps
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

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the title's `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Alert.Title` / `AlertTitle`: the one-line heading, 14 / 24 / 500, in the
 * status' foreground color.
 *
 * Upstream renders a `<p>`; NSH has no paragraph element, so it is a `View`
 * whose text utilities the inner `Text` inherits (twref "Text styles
 * inherit"). The status color arrives through the `title` slot, which is why
 * the view itself carries the class rather than the `Text`.
 */
export function AlertTitle(props: AlertTitleProps): JSX.Element {
  // Read once, in the body: the root's slot table, when this title sits inside
  // an `Alert` (port sheet §2).
  const ctx = AlertContext();

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

  // The single read of `children`, shared by the placement below (research
  // 4.1 / 4.6); computed keeps a reactive child live.
  const children = computed(() => local.children);

  // R-009 and the status' title color, plus the caller's class.
  const classes = computed(() =>
    joinClassNames(ctx.slots?.().title(), local.className),
  );

  const title = computed(() => local.title);

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // A `<p>` is not a keyboard focus stop upstream.
      focusable={local.focusable ?? false}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden
      }
      accessibilityHint={local.accessibilityHint ?? titleText(title())}
      tooltip={local.tooltip ?? titleTooltip(title())}
      class={classes()}
      style={local.style}
    >
      {renderChildren(children())}
    </View>
  );
}
