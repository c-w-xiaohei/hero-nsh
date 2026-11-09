import type { Accessor } from "nsh";
import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { createControllableSetSignal } from "../../primitives/create-controllable-signal";
import {
  type DisclosureGroupContextValue,
  type DisclosureGroupKey,
  DisclosureGroupContext,
  type DisclosureGroupState,
} from "./disclosure-context";
import { disclosureGroupVariants } from "./disclosure-group.styles";
import { renderChildren } from "./render-children";

/** What the group root's `className` and `style` functions receive (D17: accessors). */
export interface DisclosureGroupRenderProps {
  /** Whether every trigger inside the group is disabled. */
  isDisabled: Accessor<boolean>;

  /** React Stately's `DisclosureGroupState`, the render props' `state`. */
  state: DisclosureGroupState;
}

/**
 * The props of `DisclosureGroup.Root`: HeroUI 3.2.7's
 * `DisclosureGroupRootProps`, which is React Aria Components' `DisclosureGroup`
 * plus the (empty) variant surface.
 *
 * The DOM-only members upstream (`id` as a real DOM id, `aria-*`, `data-*`,
 * `slot`, `render`) are accepted so code written against HeroUI keeps
 * compiling; port sheet §1.2 and §8 say what each can and cannot do.
 */
export interface DisclosureGroupRootProps {
  /** The disclosures inside the group. */
  children?: JSX.Element;

  /** Appended after the base slot; later classes win. Function form gets the render props. */
  className?: string | ((values: DisclosureGroupRenderProps) => string | undefined);

  /** Style of the group root; function form gets the render props. */
  style?: StyleProp<ViewStyle> | ((values: DisclosureGroupRenderProps) => StyleProp<ViewStyle>);

  /** The expanded keys, controlled. `isExpanded` on an item is ignored inside a group. */
  expandedKeys?: Iterable<DisclosureGroupKey>;

  /** The expanded keys at mount, uncontrolled. */
  defaultExpandedKeys?: Iterable<DisclosureGroupKey>;

  /** Called with the next set whenever a disclosure in the group toggles. */
  onExpandedChange?: (keys: Set<DisclosureGroupKey>) => void;

  /** Whether several disclosures may be open at once. @default false */
  allowsMultipleExpanded?: boolean;

  /** Disables every trigger inside the group; it does not freeze the panels. @default false */
  isDisabled?: boolean;

  /** A DOM id upstream; maps to `nativeID` (the group's `id` is a real DOM id, unlike a disclosure's). */
  id?: string;
  nativeID?: string;

  /** An identifier for UI tests, on the group root. */
  testID?: string;

  /** A hint shown while the pointer rests on the group. */
  tooltip?: JSX.Element;

  /** The group root was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** The group root's view; a callback, because a ref store throws on the web target. */
  ref?: (node: ViewRef) => void;

  /** The accessible name of the group root. */
  accessibilityLabel?: string;

  /** Hides the group root and its subtree from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Every `aria-*` attribute, accepted for API parity. */
  [key: `aria-${string}`]: unknown;

  /** Every `data-*` attribute: NSH projects none of them (D18). */
  [key: `data-${string}`]: unknown;
}

/**
 * DisclosureGroup.Root / DisclosureGroupRoot: one `w-full` div that owns the
 * expanded-key set and provides it to the disclosures inside it (port sheet
 * §2, §3).
 *
 * It is built on the core `View`, not on nsh/base `Accordion`: that component
 * fixes its own Item / Header / Panel structure, roving focus and arrow-key
 * navigation, and keeps a collection of registered items. HeroUI's group is a
 * plain div whose only truth is `expandedKeys`, with no keyboard handling at
 * all (port sheet §3, criteria B1 / B3 / B4); matching it on top of Accordion
 * would mean adding behaviour upstream does not have.
 */
export function DisclosureGroupRoot(props: DisclosureGroupRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "expandedKeys",
    "defaultExpandedKeys",
    "onExpandedChange",
    "allowsMultipleExpanded",
    "isDisabled",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
    "ref",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "render",
    "slot",
  ] as const);

  // Port sheet §2: the group's one piece of state. `createControllableSetSignal`
  // keeps it uncontrolled until `expandedKeys` is given, and calls
  // `onExpandedChange` with the next set (insertion order preserved, as the
  // `Set` does).
  const [expandedKeys, setExpandedKeys] = createControllableSetSignal<DisclosureGroupKey>({
    value: () =>
      local.expandedKeys === undefined ? undefined : new Set(local.expandedKeys),
    defaultValue: () =>
      local.defaultExpandedKeys === undefined
        ? undefined
        : new Set(local.defaultExpandedKeys),
    onChange: (keys) => local.onExpandedChange?.(keys),
  });

  const allowsMultipleExpanded = computed(() => local.allowsMultipleExpanded ?? false);
  const isDisabled = computed(() => local.isDisabled === true);

  // React Stately's `toggleKey`. Single mode empties the set on a second press
  // of the same key, the opposite of Kobalte's non-collapsible accordion; the
  // HeroUI contract wins (port sheet §5, T-042).
  const toggleKey = (key: DisclosureGroupKey) => {
    const current = expandedKeys();

    if (allowsMultipleExpanded()) {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      setExpandedKeys(next);

      return;
    }

    setExpandedKeys(current.has(key) ? new Set() : new Set([key]));
  };

  const state: DisclosureGroupState = {
    expandedKeys,
    allowsMultipleExpanded,
    isDisabled,
    toggleKey,
  };

  const contextValue: DisclosureGroupContextValue = state;

  const renderProps: DisclosureGroupRenderProps = { isDisabled, state };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    [disclosureGroupVariants().base(), resolvedClassName() ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const resolveChildren = (children: JSX.Element) => renderChildren(children);

  return (
    <DisclosureGroupContext.Provider value={contextValue}>
      <View
        ref={(node) => local.ref?.(node)}
        testID={local.testID}
        nativeID={local.id ?? local.nativeID}
        tooltip={local.tooltip}
        accessibilityLabel={local.accessibilityLabel}
        accessibilityElementsHidden={local.accessibilityElementsHidden}
        class={classes()}
        style={resolvedStyle()}
        onLayout={local.onLayout}
      >
        {resolveChildren(local.children)}
      </View>
    </DisclosureGroupContext.Provider>
  );
}
