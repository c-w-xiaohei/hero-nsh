import type { Accessor, Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, signal, split, View } from "nsh";

import { createDisclosureState } from "../../primitives/create-disclosure-state";
import { DisclosureGroupContext } from "../disclosure-group/disclosure-context";
import {
  type DisclosureContextValue,
  DisclosureContext,
  type DisclosureState,
} from "./disclosure-context";
import { disclosureVariants } from "./disclosure.styles";
import { renderChildren } from "./render-children";

/**
 * What `Disclosure.Root`'s `className` and `style` functions receive. HeroUI's
 * `DisclosureRenderProps` carries plain values; per D17 they are accessors here,
 * so the tree the function returns follows the disclosure without being rebuilt.
 */
export interface DisclosureRenderProps {
  /** Whether the panel is expanded. */
  isExpanded: Accessor<boolean>;

  /** Whether the disclosure is disabled (itself or through its group). */
  isDisabled: Accessor<boolean>;

  /** Whether the keyboard focus is within the disclosure. */
  isFocusVisibleWithin: Accessor<boolean>;

  /** React Stately's `DisclosureState`, the render props' `state`. */
  state: DisclosureState;
}

/**
 * The props of `Disclosure.Root`: HeroUI 3.2.7's `DisclosureRootProps`, which is
 * React Aria Components' `Disclosure` plus the (empty) variant surface.
 *
 * `id` is the disclosure's **group key**, not a DOM id: upstream removes it
 * before rendering (`useRenderProps({ id: undefined })`), so it never reaches
 * the element here either. Identify the root in a test with `testID`.
 */
export interface DisclosureRootProps {
  /**
   * The disclosure's parts. A function is HeroUI's render prop and receives the
   * disclosure state (D17: accessors); bare strings become `Text` at each part's
   * placement.
   */
  children?: JSX.Element | ((values: DisclosureRenderProps) => JSX.Element);

  /** Appended after the base slot; later classes win. Function form gets the render props. */
  className?: string | ((values: DisclosureRenderProps) => string | undefined);

  /** Style of the root; function form gets the render props. */
  style?: StyleProp<ViewStyle> | ((values: DisclosureRenderProps) => StyleProp<ViewStyle>);

  /** The expanded state, controlled. Ignored inside a `DisclosureGroup`. */
  isExpanded?: boolean;

  /** The expanded state at mount, uncontrolled. @default false */
  defaultExpanded?: boolean;

  /** Called with the next expanded state after every toggle, inside a group too. */
  onExpandedChange?: (isExpanded: boolean) => void;

  /** Disables the trigger. Inside a group the group's flag also disables it. @default false */
  isDisabled?: boolean;

  /** The key this disclosure answers to inside a group; generated when omitted. */
  id?: string | number;

  /** An identifier for UI tests, on the root. */
  testID?: string;

  /** NSH's name for the id other elements refer to. Not fed by `id`, which is a group key. */
  nativeID?: string;

  /** A hint shown while the pointer rests on the root. */
  tooltip?: JSX.Element;

  /** The root was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** The root's view; a callback, because a ref store throws on the web target. */
  ref?: (node: ViewRef) => void;

  /** The accessible name of the root. */
  accessibilityLabel?: string;

  /** Hides the root and its subtree from assistive technologies. */
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

/** Module-level identity counter: unique keys, never reused after unmount (port sheet §2). */
let nextDisclosureId = 0;

/**
 * Disclosure.Root / DisclosureRoot: a `relative` div that owns the expanded
 * state and provides it to its five parts (port sheet §2, §3).
 *
 * The state is the repo's `createDisclosureState` (Kobalte's collapsible state,
 * already in `src/primitives`): controlled through `isExpanded`, uncontrolled
 * through `defaultExpanded`, and in a group through the group's key set, which
 * wins over `isExpanded` exactly as React Aria's `useDisclosure` resolves it.
 *
 * It does not set `disabled` on the root: upstream only disables the trigger
 * and leaves the panel's content alone (port sheet §3).
 */
export function DisclosureRoot(props: DisclosureRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "isExpanded",
    "defaultExpanded",
    "onExpandedChange",
    "isDisabled",
    "id",
    "testID",
    "nativeID",
    "tooltip",
    "onLayout",
    "ref",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "render",
    "slot",
  ] as const);

  // A Solid component body runs once, so the generated key is stable for the
  // instance's lifetime.
  const id = local.id ?? `disclosure-${nextDisclosureId++}`;

  // Read once, in the body: outside a group this is `undefined` and the
  // disclosure is standalone.
  const group = DisclosureGroupContext();

  // The group's set wins over the item's own `isExpanded` (React Aria:
  // `groupState ? groupState.expandedKeys.has(id) : props.isExpanded`).
  const groupExpanded = (): boolean | undefined =>
    group ? group.expandedKeys().has(id) : undefined;

  const disclosureState = createDisclosureState({
    open: () => groupExpanded() ?? local.isExpanded,
    defaultOpen: () => local.defaultExpanded,
    onOpenChange: (isExpanded) => {
      // React Aria routes every change request through the group first, then
      // reports to the item's own caller.
      group?.toggleKey(id);
      local.onExpandedChange?.(isExpanded);
    },
  });

  // `||`, as upstream: an item's own `false` does not re-enable it inside a
  // disabled group.
  const isDisabled = computed(
    () => local.isDisabled === true || group?.isDisabled() === true,
  );

  // `isFocusVisibleWithin`: a view has no focus-within event, so the parts that
  // can take focus register their own signal here (port sheet §2, §8).
  const focusVisibleRegistrations = signal<readonly (() => boolean)[]>([]);

  const registerFocusVisible = (focusVisible: () => boolean) => {
    focusVisibleRegistrations.update((current) => [...current, focusVisible]);

    return () => {
      focusVisibleRegistrations.update((current) =>
        current.filter((entry) => entry !== focusVisible),
      );
    };
  };

  const isFocusVisibleWithin = computed(() =>
    focusVisibleRegistrations().some((entry) => entry()),
  );

  const state: DisclosureState = {
    isExpanded: disclosureState.isOpen,
    setExpanded: disclosureState.setIsOpen,
    expand: disclosureState.open,
    collapse: disclosureState.close,
    toggle: disclosureState.toggle,
  };

  const contextValue: DisclosureContextValue = {
    isExpanded: disclosureState.isOpen,
    isDisabled,
    isFocusVisibleWithin,
    state,
    toggle: disclosureState.toggle,
    registerFocusVisible,
  };

  const renderProps: DisclosureRenderProps = {
    isExpanded: disclosureState.isOpen,
    isDisabled,
    isFocusVisibleWithin,
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
    [disclosureVariants().base(), resolvedClassName() ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // D17: a function that takes arguments is the HeroUI render prop; a
  // zero-argument function is an NSH reactive child. Both are read once, here
  // at the placement, inside the provider (research 4.1 / 4.6).
  const resolveChildren = (
    children: JSX.Element | ((values: DisclosureRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        (children as (values: DisclosureRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <DisclosureContext.Provider value={contextValue}>
      <View
        ref={(node) => local.ref?.(node)}
        testID={local.testID}
        nativeID={local.nativeID}
        tooltip={local.tooltip}
        accessibilityLabel={local.accessibilityLabel}
        accessibilityElementsHidden={local.accessibilityElementsHidden}
        class={classes()}
        style={resolvedStyle()}
        onLayout={local.onLayout}
      >
        {resolveChildren(local.children)}
      </View>
    </DisclosureContext.Provider>
  );
}
