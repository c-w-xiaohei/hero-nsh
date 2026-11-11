import type { Accessor } from "nsh";
import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, effect, split, View } from "nsh";

import { createControllableSetSignal } from "../../primitives/create-controllable-signal";
import {
  type DisclosureGroupContextValue,
  type DisclosureGroupKey,
  DisclosureGroupContext,
  type DisclosureGroupState,
} from "./disclosure-context";
import { disclosureGroupVariants } from "./disclosure-group.styles";
import type { AriaProps, DataProps, GlobalDomEvents, GlobalDomProps } from "./dom-props";
import { viewProps } from "./dom-props";
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
export interface DisclosureGroupRootProps
  extends
    Omit<ViewProps, "children" | "class" | "style" | keyof GlobalDomEvents>,
    AriaProps,
    DataProps,
    GlobalDomProps,
    GlobalDomEvents {
  /**
   * The disclosures inside the group, or a function that receives the render
   * props and returns them (React Aria's `ChildrenOrFunction`). A zero-argument
   * function stays a reactive child and is resolved at the placement.
   */
  children?:
    | JSX.Element
    | ((values: DisclosureGroupRenderProps) => JSX.Element);

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
  const [local, rest] = split(props, [
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

  // React Stately normalizes the set: in single mode it never holds more than
  // one key, and the first key wins. Deriving it here (rather than only inside
  // `toggleKey`) closes the gap for `defaultExpandedKeys` / controlled
  // `expandedKeys` that arrive with two keys (upstream
  // `useDisclosureGroupState.ts:65-73`).
  const visibleExpandedKeys = computed(() => {
    const keys = expandedKeys();

    if (allowsMultipleExpanded() || keys.size <= 1) {
      return keys;
    }

    return new Set([keys.values().next().value as DisclosureGroupKey]);
  });

  // Upstream's normalization also reports the collapsed set to
  // `onExpandedChange`. The effect runs once per change of the raw set, so a
  // controlled parent that ignores the callback is not called in a loop.
  effect(() => {
    const keys = expandedKeys();

    if (!allowsMultipleExpanded() && keys.size > 1) {
      setExpandedKeys(new Set([keys.values().next().value as DisclosureGroupKey]));
    }
  });

  // React Stately's `toggleKey`. Single mode empties the set on a second press
  // of the same key, the opposite of Kobalte's non-collapsible accordion; the
  // HeroUI contract wins (port sheet §5, T-042).
  const toggleKey = (key: DisclosureGroupKey) => {
    const current = visibleExpandedKeys();

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
    expandedKeys: visibleExpandedKeys,
    setExpandedKeys: (keys) => setExpandedKeys(keys),
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

  // React Aria's `ChildrenOrFunction`: a function that declares a parameter is
  // the render-prop form and gets the render values; a zero-argument function
  // is a reactive child and keeps its existing pass-through (research 4.1).
  const resolveChildren = (children: DisclosureGroupRootProps["children"]) => {
    if (typeof children === "function") {
      const fn = children as (values?: DisclosureGroupRenderProps) => JSX.Element;

      return renderChildren(fn.length > 0 ? fn(renderProps) : fn());
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <DisclosureGroupContext.Provider value={contextValue}>
      <View
        {...viewProps(rest)}
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
