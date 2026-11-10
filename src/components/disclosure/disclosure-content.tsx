import type { Accessor, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { DisclosureContext, FALLBACK_DISCLOSURE_CONTEXT } from "./disclosure-context";
import { disclosureVariants } from "./disclosure.styles";
import { renderChildren } from "./render-children";

/**
 * What `Disclosure.Content`'s `className` and `style` functions receive:
 * HeroUI's `DisclosureRenderProps` narrowed to the one value the panel can see
 * (port sheet §1.1).
 */
export interface DisclosureContentRenderProps {
  /** Whether the keyboard focus is within the disclosure. */
  isFocusVisibleWithin: Accessor<boolean>;
}

/**
 * The props of `Disclosure.Content`: React Aria's `DisclosurePanel`, a `div`
 * with `role="group"` (or `region`) that the disclosure expands and collapses.
 */
export interface DisclosureContentProps {
  /** The panel's content: usually a `Disclosure.Body`. Bare strings become `Text`. */
  children?: JSX.Element;

  /** Appended after the content slot; later classes win. Function form gets the render props. */
  className?:
    | string
    | ((values: DisclosureContentRenderProps) => string | undefined);

  /** Style of the panel; function form gets the render props. */
  style?: StyleProp<ViewStyle> | ((values: DisclosureContentRenderProps) => StyleProp<ViewStyle>);

  /** The panel's role. @default "group" */
  role?: "group" | "region";

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** A hint shown while the pointer rests on the panel. */
  tooltip?: JSX.Element;

  /** The panel's view; a callback, because a ref store throws on the web target. */
  ref?: (node: ViewRef) => void;

  /** The accessible name upstream; maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** The accessible name through NSH's own prop; `aria-label` wins. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Every other `aria-*` attribute, accepted for API parity. */
  [key: `aria-${string}`]: unknown;

  /** Every `data-*` attribute: NSH projects none of them (D18). */
  [key: `data-${string}`]: unknown;
}

/**
 * Disclosure.Content / DisclosureContent: the panel (port sheet §3, §5).
 *
 * It is **always mounted**, as upstream: HeroUI's own regression case finds the
 * body text after collapsing and asserts it is not visible, so the collapsed
 * state must be `height: 0` + `overflow: clip` + `opacity: 0`, never an unmount.
 *
 * The height transition is the one visible difference (R-014, §8): NSH cannot
 * transition layout properties, so the height switches instantly while the
 * 200ms `ease-out` opacity transition stays (R-015).
 */
export function DisclosureContent(props: DisclosureContentProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "role",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "ref",
    "aria-label",
    "aria-labelledby",
    "accessibilityLabel",
    "render",
  ] as const);

  const ctx = DisclosureContext() ?? FALLBACK_DISCLOSURE_CONTEXT;
  const slots = disclosureVariants();

  const isExpanded = ctx.isExpanded;

  const renderProps: DisclosureContentRenderProps = {
    isFocusVisibleWithin: ctx.isFocusVisibleWithin,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    [slots.content(), resolvedClassName() ?? ""].filter((part) => part.length > 0).join(" "),
  );

  const resolveChildren = (children: JSX.Element) => renderChildren(children);

  return (
    <View
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      role={local.role ?? "group"}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      class={classes()}
      // R-011 / R-012 / R-017: one owner for both the opacity and the height of
      // the collapsed panel. Upstream writes `opacity: 0` and
      // `height: var(--disclosure-panel-height)` and flips them through
      // `[data-expanded="true"]`; NSH has no `data-*` projection, so the state
      // goes straight into the class list, and the measured height is not
      // needed because the height is not animated (R-014).
      classList={{ "h-0 opacity-0": !isExpanded() }}
      style={resolvedStyle()}
    >
      {resolveChildren(local.children)}
    </View>
  );
}
