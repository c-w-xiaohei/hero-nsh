import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split } from "nsh";
import { AccordionPanel as BaseAccordionPanel } from "nsh/base";

import { renderChildren } from "./children";
import { AccordionContext, AccordionItemContext } from "./accordion-context";
import type { AccordionItemRenderProps } from "./accordion-types";

/**
 * The props of `Accordion.Panel`: HeroUI 3.2.7's `AccordionPanelProps`, which
 * is React Aria Components' `DisclosurePanel`.
 *
 * The content stays mounted while closed (`hidden="until-found"` upstream),
 * which the base panel's `keepMounted` expresses (port sheet §1, §2).
 */
export interface AccordionPanelProps {
  /** The panel's content (usually an `Accordion.Body`). */
  children?: JSX.Element;

  /** Appended after the panel slot classes; function form gets the item accessors. */
  className?:
    | string
    | ((values: AccordionItemRenderProps) => string | undefined);

  /** Style of the panel; function form gets the item accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: AccordionItemRenderProps) => StyleProp<ViewStyle>);

  /** Accepted, no effect: the base panel is fixed to the `region` role (§8). */
  role?: "group" | "region";

  /** The panel's accessible name; wins over the Trigger's registered one. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** A desktop hover tooltip on the panel. */
  tooltip?: JSX.Element;

  /** The panel was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** NSH's accessible name, over `aria-label`. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect (D18). */
  [key: `aria-${string}`]: unknown;

  /** Accepted, no effect (D18). */
  [key: `data-${string}`]: unknown;

  /** The panel view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/**
 * Accordion.Panel / AccordionPanel: the collapsible content.
 *
 * It is built on nsh/base `AccordionPanel`: that component takes any children
 * (B1), paints only what the app's classes say (B2), reads its open state from
 * the item's value in the accordion (B4) and provides `reveal` (the native
 * springing height that replaces `height: var(--disclosure-panel-height)`) and
 * `keepMounted` (the content stays in the tree while closed). Its role is
 * fixed to `region` where HeroUI's RAC panel is a `group`; port sheet §8 has
 * that difference registered.
 */
export function AccordionPanel(props: AccordionPanelProps): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "role",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "testID",
    "tooltip",
    "onLayout",
    "accessibilityLabel",
    "render",
    "slot",
    "ref",
  ] as const);

  const accordion = AccordionContext();
  const item = AccordionItemContext();

  if (!accordion || !item) {
    return null;
  }

  const renderProps: AccordionItemRenderProps = {
    isExpanded: item.isExpanded,
    isFocusVisibleWithin: item.isFocusVisibleWithin,
    isDisabled: item.isDisabled,
    state: item.state,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // R-023 / R-029: the panel slot carries `opacity-0`; the open item adds
  // `opacity-100` through `classList`, so the 200ms opacity transition
  // (R-027) runs both ways.
  const classes = computed(() =>
    [accordion.slots().panel(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // The name: the Panel's own `aria-label`, then the Trigger's registered one,
  // otherwise the base panel names the region by its content (port sheet §8:
  // NSH has no `aria-labelledby`).
  const accessibilityLabel = () =>
    local["aria-label"] ?? local.accessibilityLabel ?? item.triggerLabel();

  return (
    <BaseAccordionPanel
      // R-024 / R-025 / R-026: the native reveal stands in for
      // `height: var(--disclosure-panel-height)`, `overflow: clip` and the
      // 200ms `ease-out-quad` height transition; the curve cannot be matched
      // (registered §8).
      reveal
      // The content stays in the tree while closed, as `hidden="until-found"`
      // keeps it upstream.
      keepMounted
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      tooltip={local.tooltip}
      accessibilityLabel={accessibilityLabel()}
      class={classes()}
      classList={{ "opacity-100": item.isExpanded() }}
      style={resolvedStyle()}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children as JSX.Element)}
    </BaseAccordionPanel>
  );
}
