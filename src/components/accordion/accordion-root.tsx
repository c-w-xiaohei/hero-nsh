import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, signal, split, untracked } from "nsh";
import { Accordion as BaseAccordion } from "nsh/base";

import { SurfaceContext, type SurfaceContextValue } from "../surface/surface-context";
import { renderChildren } from "./children";
import { AccordionContext, type AccordionContextValue, type AccordionSlots } from "./accordion-context";
import { type AccordionKey, encodeAccordionKey } from "./accordion-key";
import { accordionVariants } from "./accordion.styles";
import type { AccordionVariants } from "./accordion.styles";
import type { AccordionRenderProps } from "./accordion-types";
import { createAccordionGroupState } from "./create-accordion-group-state";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Accordion.Root`: HeroUI 3.2.7's `AccordionRootProps`, which is
 * React Aria Components' `DisclosureGroup` props plus `AccordionVariants` and
 * `hideSeparator`.
 *
 * The DOM-only members upstream (the global DOM attributes and events, `render`
 * and `slot`) are accepted so code written against HeroUI keeps compiling; the
 * port sheet §1 and §8 say what each can and cannot do. `ref` is a callback
 * because NSH forwards refs that way (`_common` §46).
 */
export interface AccordionRootProps {
  /**
   * The items, or a render prop called once with the group state (D17). A bare
   * string inside it becomes `Text` at the placement.
   */
  children?: JSX.Element | ((values: AccordionRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. */
  className?: string | ((values: AccordionRenderProps) => string | undefined);

  /** Style of the root; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: AccordionRenderProps) => StyleProp<ViewStyle>);

  /** `surface` paints the grouped card; `default` paints nothing. */
  variant?: AccordionVariants["variant"];

  /** Hides every item's separator. */
  hideSeparator?: boolean;

  /** Several items stay open at once (React Stately's `allowsMultipleExpanded`). */
  allowsMultipleExpanded?: boolean;

  /** Blocks every item's trigger. */
  isDisabled?: boolean;

  /** The open keys, controlled. */
  expandedKeys?: Iterable<AccordionKey>;

  /** The open keys before the user interacts, uncontrolled (empty by default). */
  defaultExpandedKeys?: Iterable<AccordionKey>;

  /** Called with a fresh `Set` whenever the user changes the open keys. */
  onExpandedChange?: (keys: Set<AccordionKey>) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** A desktop hover tooltip on the root. */
  tooltip?: JSX.Element;

  /** The root was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** NSH's accessible name for the group. */
  accessibilityLabel?: string;

  /** Hides the group from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted: NSH's accessible name through the DOM spelling. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: the base accordion reports its own group role. */
  role?: string;

  /** Accepted, no effect: NSH derives direction from the platform / root. */
  dir?: "ltr" | "rtl";

  /** Accepted, no effect: NSH has no document language attribute. */
  lang?: string;

  /** Accepted, no effect: NSH has no DOM visibility attribute. */
  hidden?: boolean;

  /** Accepted, no effect: NSH has no inert subtree flag. */
  inert?: boolean;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM click event. */
  onClick?: unknown;

  /** Accepted, no effect: a view reports presses, not pointer events. */
  onPointerDown?: unknown;
  onPointerUp?: unknown;
  onPointerMove?: unknown;

  /** Accepted, no effect: NSH has no wheel event. */
  onWheel?: unknown;

  /** Accepted, no effect (D18: no data attributes). */
  [key: `data-${string}`]: unknown;

  /** The root view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * Accordion.Root / AccordionRoot: the group that owns the expanded set and
 * provides it, with the variant table, to every part.
 *
 * It is built on nsh/base `Accordion`: that component takes any children (B1),
 * has no look of its own (B2), reports no state of its own and reads a fully
 * controlled `value` (B4), so the root supplies the encoded set and never uses
 * its `onChange` (port sheet §3). The `surface` variant also provides HeroUI's
 * `SurfaceContext = { variant: "default" }`, and otherwise passes the ambient
 * Surface context through unchanged, so an Accordion inside a Surface keeps the
 * colours the Surface gave its descendants.
 */
export function AccordionRoot(props: AccordionRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "variant",
    "hideSeparator",
    "allowsMultipleExpanded",
    "isDisabled",
    "expandedKeys",
    "defaultExpandedKeys",
    "onExpandedChange",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-labelledby",
    "role",
    "dir",
    "lang",
    "hidden",
    "inert",
    "render",
    "slot",
    "onClick",
    "onPointerDown",
    "onPointerUp",
    "onPointerMove",
    "onWheel",
    "ref",
  ] as const);

  const variant = computed(() => local.variant ?? "default");
  const hideSeparator = computed(() => local.hideSeparator ?? false);
  const isDisabled = computed(() => local.isDisabled ?? false);

  const group = createAccordionGroupState({
    expandedKeys: () => local.expandedKeys,
    defaultExpandedKeys: () => local.defaultExpandedKeys,
    allowsMultipleExpanded: () => local.allowsMultipleExpanded,
    onExpandedChange: (keys) => local.onExpandedChange?.(keys),
  });

  // The variant table is derived, so a `variant` that changes at runtime
  // re-renders every slot (research 4.1: the body runs once).
  const slots = computed<AccordionSlots>(() => accordionVariants({ variant: variant() }));

  // The base accordion's `value`: encoded keys, one per rendered open item
  // (port sheet §2). It never calls back into us; the Trigger drives the state.
  const baseValue = computed(() =>
    [...group.expandedKeys()].map((key) => encodeAccordionKey(key)),
  );

  /* -------------------------------------------------------------------------------------------
   * Item registry: the port's stand-in for `:first-child` / `:last-child`
   * (research 4.2). Registration order is creation order, i.e. the order the
   * items were written; a reordered dynamic list is registered in §8.
   * ----------------------------------------------------------------------------------------- */
  const itemKeys = signal<readonly AccordionKey[]>([]);

  const registerItem = (key: AccordionKey) => {
    itemKeys.update((current) => (current.includes(key) ? current : [...current, key]));
  };

  const unregisterItem = (key: AccordionKey) => {
    itemKeys.update((current) => current.filter((entry) => entry !== key));
  };

  const isFirstItem = (key: AccordionKey) => itemKeys()[0] === key;

  const isLastItem = (key: AccordionKey) => {
    const current = itemKeys();

    return current.length > 0 && current[current.length - 1] === key;
  };

  let itemCount = 0;

  const createItemKey = (): AccordionKey => {
    itemCount += 1;

    return `accordion-item-${itemCount}`;
  };

  /* -------------------------------------------------------------------------------------------
   * Surface provider value: surface overrides the ambient one; otherwise the
   * ambient value (possibly `{}`) passes through, exactly as if this provider
   * were absent.
   * ----------------------------------------------------------------------------------------- */
  const ambientSurface = SurfaceContext();

  const surfaceValue: SurfaceContextValue = {
    variant: () => (variant() === "surface" ? "default" : ambientSurface.variant?.()),
  };

  /* -------------------------------------------------------------------------------------------
   * Classes and the render prop
   * ----------------------------------------------------------------------------------------- */
  const renderProps: AccordionRenderProps = {
    isDisabled,
    state: group,
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
    [slots().base(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolveChildren = () => {
    // The single read of `props.children`, inside the providers (the `_common`
    // §41 exception: a provider must read it at the placement).
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() => (children as (values: AccordionRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  const contextValue: AccordionContextValue = {
    slots,
    variant,
    hideSeparator,
    isDisabled,
    state: group,
    isExpanded: (key) => group.isExpanded(key),
    registerItem,
    unregisterItem,
    createItemKey,
    isFirstItem,
    isLastItem,
  };

  return (
    <AccordionContext.Provider value={contextValue}>
      <SurfaceContext.Provider value={surfaceValue}>
        <BaseAccordion
          ref={(node) => local.ref?.(node)}
          testID={local.testID}
          tooltip={local.tooltip}
          value={baseValue()}
          multiple={group.allowsMultipleExpanded()}
          disabled={isDisabled()}
          class={classes()}
          style={resolvedStyle()}
          onLayout={local.onLayout}
        >
          {resolveChildren()}
        </BaseAccordion>
      </SurfaceContext.Provider>
    </AccordionContext.Provider>
  );
}
