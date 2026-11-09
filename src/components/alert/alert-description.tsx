import { computed, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./alert-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./alert-dom-props";
import { viewProps } from "./alert-dom-props";
import { titleText, titleTooltip } from "./alert-hint";
import { joinClassNames } from "./class-names";
import { AlertContext } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Alert Description
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Alert.Description`: HeroUI 3.2.7's `AlertDescriptionProps`,
 * which is a `span`'s intrinsic attributes plus `children` and `className`,
 * expressed with NSH's view host props.
 */
export interface AlertDescriptionProps
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
 * `Alert.Description` / `AlertDescription`: the muted supporting line, 14 / 20.
 *
 * It deliberately ignores `status`: upstream's ten modifier rules only touch
 * the indicator and the title, so the description stays `text-muted` in every
 * status (R-010).
 */
export function AlertDescription(props: AlertDescriptionProps): JSX.Element {
  // Read once, in the body: the root's slot table, when this description sits
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

  // R-010, plus the caller's class.
  const classes = computed(() =>
    joinClassNames(ctx.slots?.().description(), local.className),
  );

  const title = computed(() => local.title);

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // A `<span>` is not a keyboard focus stop upstream.
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
