import { computed, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./alert-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./alert-dom-props";
import { viewProps } from "./alert-dom-props";
import { titleText, titleTooltip } from "./alert-hint";
import { joinClassNames } from "./class-names";
import { AlertContext, type AlertStatus } from "./context";
import { DangerIcon, InfoIcon, SuccessIcon, WarningIcon } from "../icons";
import type { ThemeColorToken } from "../../theme";

/* -------------------------------------------------------------------------------------------------
 * Default icon
 * -----------------------------------------------------------------------------------------------*/

/**
 * The paint of each status' default icon.
 *
 * Upstream the `svg` path is filled with `currentColor`, so the ancestor's
 * `text-*-soft-foreground` class colors it. A Canvas does not inherit a text
 * color, so the same status that writes the class in `alert.styles.ts` must
 * name the token here; the two lists are one mapping and have to stay in step
 * (port sheet §5). `default` and `accent` share the info glyph, as upstream.
 */
const DEFAULT_ICON_COLOR: Record<AlertStatus, ThemeColorToken> = {
  default: "foreground",
  accent: "accent-soft-foreground",
  success: "success-soft-foreground",
  warning: "warning-soft-foreground",
  danger: "danger-soft-foreground",
};

/**
 * Upstream's `getDefaultIcon()`: the glyph a status shows when the Indicator
 * gets no children. It is a plain function, called at the placement, so the
 * status accessor is read in the tracked children expression.
 *
 * R-008 note: the icons' own `h-4 w-4` is upstream's `size-4`, and their
 * `box-content` has nothing to change because they carry no padding or border.
 */
function defaultIcon(status: AlertStatus): JSX.Element {
  const color = DEFAULT_ICON_COLOR[status];

  switch (status) {
    case "success":
      return <SuccessIcon color={color} />;
    case "warning":
      return <WarningIcon color={color} />;
    case "danger":
      return <DangerIcon color={color} />;
    default:
      // `default` and `accent` both show the information disc upstream.
      return <InfoIcon color={color} />;
  }
}

/* -------------------------------------------------------------------------------------------------
 * Alert Indicator
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Alert.Indicator`: HeroUI 3.2.7's `AlertIndicatorProps`, which is
 * a `div`'s intrinsic attributes plus `children` and `className`, expressed
 * with NSH's view host props.
 */
export interface AlertIndicatorProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The custom indicator. `null` / `undefined` show the status' default icon;
   * `false`, `""` and any other value render as they are, which is upstream's
   * `children ?? getDefaultIcon()` and not `children || …`.
   */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The DOM `title` attribute upstream; maps to `tooltip` + `accessibilityHint`. */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the indicator from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the indicator's `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Alert.Indicator` / `AlertIndicator`: the leading icon slot. Inside an
 * `Alert` it takes the root's `indicator` slot class and, when it has no
 * children of its own, draws the icon and paint that the status names; on its
 * own it has no slot classes, as upstream's `slots?.indicator`.
 */
export function AlertIndicator(props: AlertIndicatorProps): JSX.Element {
  // Read once, in the body: the root's slot table and status, when this
  // indicator sits inside an `Alert` (port sheet §2).
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
  // 4.1 / 4.6). It stays a computed so a reactive child keeps updating.
  const children = computed(() => local.children);

  // Outside an `Alert` the status is `undefined`, which behaves as `default`,
  // as upstream's switch falls through to the information disc.
  const status = computed<AlertStatus>(() => ctx.status?.() ?? "default");

  // R-007, plus the status' indicator color from the shared table.
  const classes = computed(() =>
    joinClassNames(ctx.slots?.().indicator(), local.className),
  );

  const title = computed(() => local.title);

  // Upstream is `children ?? getDefaultIcon()`: only `null` and `undefined`
  // fall back. Writing `renderChildren(children()) ?? defaultIcon()` would be
  // wrong, because `renderChildren(false)` is `null` and a conditional icon
  // that is currently off would wrongly show the default one.
  const content = computed(() => {
    const node = children();

    return node == null ? defaultIcon(status()) : renderChildren(node);
  });

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
      {content()}
    </View>
  );
}
