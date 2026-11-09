import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, signal, split, untracked, View } from "nsh";
import { AccordionItem as BaseAccordionItem } from "nsh/base";
import type { Accessor } from "nsh";

import { renderChildren } from "./children";
import { AccordionContext, AccordionItemContext, type AccordionItemContextValue } from "./accordion-context";
import { type AccordionKey, encodeAccordionKey } from "./accordion-key";
import type { AccordionItemRenderProps, ReactStatelyDisclosureState } from "./accordion-types";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Accordion.Item`: HeroUI 3.2.7's `AccordionItemProps`, which is
 * React Aria Components' `Disclosure` props.
 *
 * `isExpanded` / `defaultExpanded` are accepted and ignored inside a group, as
 * React Aria's `Disclosure` ignores them under a `DisclosureGroup`: the group's
 * set wins (port sheet §1). `id` is the item's key in that set; without it a
 * stable `accordion-item-<n>` is generated.
 */
export interface AccordionItemProps {
  /** The item's key in the root's `expandedKeys`; generated when absent. */
  id?: AccordionKey;

  /** Accepted, no effect inside a group: the group's set decides. */
  isExpanded?: boolean;

  /** Accepted, no effect inside a group: the group's set decides. */
  defaultExpanded?: boolean;

  /** Called after the group toggled this item, with the item's next state. */
  onExpandedChange?: (isExpanded: boolean) => void;

  /** Blocks this item's trigger, in addition to the group's `isDisabled`. */
  isDisabled?: boolean;

  /** The item's parts: Heading (with Trigger), Panel, and anything else. */
  children?: JSX.Element | ((values: AccordionItemRenderProps) => JSX.Element);

  /** Appended after the item slot classes; function form gets the item accessors. */
  className?: string | ((values: AccordionItemRenderProps) => string | undefined);

  /** Style of the item's view; function form gets the item accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: AccordionItemRenderProps) => StyleProp<ViewStyle>);

  /** A DOM id upstream; maps to `nativeID` (the key stays in `id`). */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** A desktop hover tooltip on the item. */
  tooltip?: JSX.Element;

  /** The item was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** NSH's accessible name for the item. */
  accessibilityLabel?: string;

  /** Hides the item from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted: NSH's accessible name through the DOM spelling. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: the Disclosure's own role is the base item's. */
  role?: string;

  /** Accepted, no effect: NSH has no DOM visibility attribute. */
  hidden?: boolean;

  /** Accepted, no effect: NSH has no inert subtree flag. */
  inert?: boolean;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect (D18). */
  [key: `data-${string}`]: unknown;

  /** The item view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/

/**
 * Accordion.Item / AccordionItem: one section. It registers its key with the
 * root (the port's stand-in for DOM position), provides the item context, and
 * draws the separator that `::after` drew upstream as a real child View.
 *
 * It is built on nsh/base `AccordionItem`: that component hosts any children
 * (B1), paints nothing itself (B2), takes its open state from the accordion's
 * controlled `value` (B4) and reports nothing of its own. Our Trigger is a
 * core `View`, so the base item's own disabled/expanded hand-off to a trigger
 * is unused; the state reaches the parts through this context instead
 * (port sheet §3).
 */
export function AccordionItem(props: AccordionItemProps): JSX.Element | null {
  const [local] = split(props, [
    "id",
    "isExpanded",
    "defaultExpanded",
    "onExpandedChange",
    "isDisabled",
    "children",
    "className",
    "style",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-labelledby",
    "role",
    "hidden",
    "inert",
    "render",
    "slot",
    "ref",
  ] as const);

  const accordion = AccordionContext();

  if (!accordion) {
    return null;
  }

  // `id` is an identity value: read once, on purpose (research 4.6).
  const itemKey: AccordionKey = local.id ?? accordion.createItemKey();

  // Research 4.2: parts register with the nearest owner when they are created
  // and unregister on unmount.
  accordion.registerItem(itemKey);
  cleanup(() => accordion.unregisterItem(itemKey));

  const isExpanded = computed(() => accordion.isExpanded(itemKey));
  const isDisabled = computed(
    () => accordion.isDisabled() || local.isDisabled === true,
  );
  const isFirst = computed(() => accordion.isFirstItem(itemKey));
  const isLast = computed(() => accordion.isLastItem(itemKey));
  const isSurface = computed(() => accordion.variant() === "surface");

  // The Trigger registers its own focus-visible accessor (port sheet §8: this
  // is the port's stand-in for `useFocusRing({ within: true })`).
  const triggerFocusVisible = signal<Accessor<boolean> | undefined>(undefined);

  const isFocusVisibleWithin = computed(() => triggerFocusVisible()?.() ?? false);

  // The Trigger's registered accessible name, which names the Panel.
  const triggerLabelSource = signal<Accessor<string | undefined> | undefined>(undefined);

  const triggerLabel = computed(() => triggerLabelSource()?.());

  const toggle = () => {
    const willExpand = !isExpanded();

    accordion.state.toggleKey(itemKey);
    local.onExpandedChange?.(willExpand);
  };

  const setExpanded = (value: boolean) => {
    if (value === isExpanded()) {
      return;
    }

    toggle();
  };

  const state: ReactStatelyDisclosureState = {
    isExpanded,
    setExpanded,
    toggle,
  };

  const renderProps: AccordionItemRenderProps = {
    isExpanded,
    isFocusVisibleWithin,
    isDisabled,
    state,
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
    [accordion.slots().item(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-011: `.accordion__item::after` (`content: ""`, `absolute start-0 bottom-0
  // h-px w-full rounded-xs bg-separator`) as a real child View: NSH has no
  // pseudo-elements, and drawing it as a child keeps it after the content in
  // paint order. `pointerEvents="none"` keeps it out of the pointer.
  // R-032: surface separators are `bg-surface-foreground/6`.
  // R-033: and inset (`start-[3%] w-[94%]`).
  const separatorClasses = computed(() =>
    isSurface()
      ? "pointer-events-none absolute start-[3%] bottom-0 h-px w-[94%] rounded-xs bg-surface-foreground/6"
      : "pointer-events-none absolute start-0 bottom-0 h-px w-full rounded-xs bg-separator",
  );

  const resolveChildren = () => {
    // The single read of `props.children`, at the placement inside the item's
    // own provider.
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() => (children as (values: AccordionItemRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  const itemContext: AccordionItemContextValue = {
    itemKey,
    isExpanded,
    isDisabled,
    isFirst,
    isLast,
    isFocusVisibleWithin,
    state,
    toggle,
    registerTriggerFocusVisible: (value) => triggerFocusVisible.set(value),
    registerTriggerLabel: (value) => triggerLabelSource.set(value),
    triggerLabel,
  };

  return (
    <AccordionItemContext.Provider value={itemContext}>
      <BaseAccordionItem
        value={encodeAccordionKey(itemKey)}
        disabled={isDisabled()}
        ref={(node) => local.ref?.(node)}
        testID={local.testID}
        tooltip={local.tooltip}
        class={classes()}
        style={resolvedStyle()}
        onLayout={local.onLayout}
      >
        {resolveChildren()}
        {/* R-012: `:last-child::after { content: none }` → hidden on the last
            registered item.
            R-013: `[data-hide-separator="true"]::after { display: none }` → the
            root's `hideSeparator` reaches the Item through context. */}
        <View
          class={separatorClasses()}
          classList={{ hidden: accordion.hideSeparator() || isLast() }}
        />
      </BaseAccordionItem>
    </AccordionItemContext.Provider>
  );
}
