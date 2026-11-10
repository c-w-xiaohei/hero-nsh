import { computed, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./alert-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./alert-dom-props";
import { viewProps } from "./alert-dom-props";
import { titleText, titleTooltip } from "./alert-hint";
import { joinClassNames } from "./class-names";
import { AlertContext } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Alert Content
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Alert.Content`: HeroUI 3.2.7's `AlertContentProps`, which is a
 * `div`'s intrinsic attributes plus `children` and `className`, expressed with
 * NSH's view host props.
 */
export interface AlertContentProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The content: a title, a description, actions, or any mix. */
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
 * `Alert.Content` / `AlertContent`: the column that grows beside the
 * indicator and holds the title, description and any actions.
 */
export function AlertContent(props: AlertContentProps): JSX.Element {
  // Read once, in the body: the root's slot table, when this content sits
  // inside an `Alert` (port sheet §2).
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

  // R-006, plus the caller's class.
  const classes = computed(() =>
    joinClassNames(ctx.slots?.().content(), local.className),
  );

  const title = computed(() => local.title);

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // A `<div>` is not a keyboard focus stop upstream.
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
