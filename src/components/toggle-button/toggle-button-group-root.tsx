import type {
  AccessibilityState,
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, signal, View } from "nsh";
import type { Accessor } from "nsh";

import {
  createKeymapScope,
  createListState,
  type SelectionValue,
} from "../../primitives";
import { FieldsetContext } from "../fieldset/context";
import { renderChildren } from "./children";
import { type AriaProps, type DataProps, type GlobalDomProps } from "./dom-props";
import {
  ToggleButtonGroupContext,
  type ToggleButtonGroupContextValue,
  type ToggleButtonGroupItem,
  type ToggleButtonGroupSelectionMode,
} from "./toggle-button-group-context";
import {
  createToggleButtonGroupState,
  type ToggleButtonGroupState,
} from "./toggle-button-group-state";
import {
  toggleButtonGroupVariants,
  type ToggleButtonGroupOrientation,
} from "./toggle-button-group.styles";
import type { ToggleButtonSize } from "./toggle-button.styles";

/** The live state HeroUI hands to a group's `className` and `style`. */
export interface ToggleButtonGroupRenderProps {
  orientation: Accessor<ToggleButtonGroupOrientation>;
  isDisabled: Accessor<boolean>;
  /**
   * The group's `ToggleGroupState`
   * (react-spectrum@740c6c5 packages/react-aria-components/src/ToggleButtonGroup.tsx:46),
   * with its values as getters (D17). React Stately's shape, not the internal
   * list state: `selectedKeys`, `isSelected`, `setSelected`, `toggleKey`,
   * `selectionMode`, `disallowEmptySelection`, `isDisabled`.
   */
  state: ToggleButtonGroupState;
}

export interface ToggleButtonGroupRootProps
  extends AriaProps,
    DataProps,
    GlobalDomProps {
  /** The buttons (and separators), or a render prop called once (D17). */
  children?: JSX.Element | ((values: ToggleButtonGroupRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. */
  className?: string | ((values: ToggleButtonGroupRenderProps) => string);

  /** Style of the group; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ToggleButtonGroupRenderProps) => StyleProp<ViewStyle>);

  /** `"single"` (default) makes a radiogroup of radios; `"multiple"` a toolbar. */
  selectionMode?: ToggleButtonGroupSelectionMode;

  /** The selected keys in controlled mode. */
  selectedKeys?: Iterable<string | number>;

  /** The initial selected keys in uncontrolled mode. */
  defaultSelectedKeys?: Iterable<string | number>;

  /** Called whenever the selection changes; the keys are strings here. */
  onSelectionChange?: (keys: Set<string>) => void;

  /** In single mode a selected button stays selected; in multiple the last one. */
  disallowEmptySelection?: boolean;

  /** Disables every member with an `id`; a member can not turn itself back on. */
  isDisabled?: boolean;

  /** Reads as `isDisabled` when `true`. */
  "aria-disabled"?: boolean;

  /** The axis the arrow keys move along. */
  orientation?: ToggleButtonGroupOrientation;

  /** Gives every member the group's width. */
  fullWidth?: boolean;

  /** Separates the members by `gap-1` and hides the separators. */
  isDetached?: boolean;

  /** Propagated to every member that does not set its own size. */
  size?: ToggleButtonSize;

  /** Upstream a DOM id; here the view's `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;
  ref?: (node: ViewRef) => void;

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;
  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** NSH host props, accepted beside the ARIA aliases above. */
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /**
   * Accepted, no effect: NSH cannot replace a host element. HeroUI also uses
   * its own renderer to drop `aria-orientation` on a nested toolbar; NSH has
   * neither a DOM nor a nested-toolbar detection (port sheet §8).
   */
  render?: unknown;
}

/** `"all"` never reaches the public callback here, but the primitive allows it. */
function normalizeSelection(
  value: Iterable<string | number> | undefined,
): SelectionValue | undefined {
  if (value == null) {
    return undefined;
  }

  const keys = new Set<string>();

  for (const key of value) {
    keys.add(String(key));
  }

  return keys;
}

/**
 * ToggleButtonGroup.Root / ToggleButtonGroupRoot: the flex row or column that
 * owns the group selection and provides it to every member. Built on the core
 * `View`, not on nsh/base `ToggleGroup`, whose toolbar-only role, roving Tab
 * stop and app-owned values cannot express HeroUI's radiogroup mode or its
 * `selectedKeys` contract (port sheet §3.2, criterion B3).
 */
export function ToggleButtonGroupRoot(props: ToggleButtonGroupRootProps) {
  const orientation = computed<ToggleButtonGroupOrientation>(
    () => props.orientation ?? "horizontal",
  );
  const fullWidth = computed(() => props.fullWidth ?? false);
  const isDetached = computed(() => props.isDetached ?? false);
  const selectionMode = (): ToggleButtonGroupSelectionMode =>
    props.selectionMode ?? "single";

  // `undefined` when the prop is absent; a member treats it as `false` while
  // still being able to tell the group was never disabled. Fieldset sheet §5.2:
  // a disabled `Fieldset` disables the whole group and wins over its own props.
  const fieldset = FieldsetContext();
  const groupIsDisabled = () =>
    fieldset?.isDisabled() === true
      ? true
      : (props.isDisabled ?? (props["aria-disabled"] === true ? true : undefined));

  // R-027 … R-030, R-046, R-048, R-028, R-029, R-044, R-045.
  const slots = computed(() =>
    toggleButtonGroupVariants({
      fullWidth: fullWidth(),
      isDetached: isDetached(),
      orientation: orientation(),
    }),
  );

  // Research 4.2: members register themselves; the registry feeds both the
  // selection collection and the arrow-key order.
  const items = signal<readonly ToggleButtonGroupItem[]>([]);

  const registerItem = (item: ToggleButtonGroupItem) => {
    items.set([...items(), item]);

    return () => {
      items.set(items().filter((current) => current !== item));
    };
  };

  // Only members with a selection key belong to the collection; a member
  // without an `id` toggles on its own and never enters `selectedKeys`.
  const dataSource = computed(() =>
    items()
      .filter((item) => item.selectionKey !== undefined)
      .map((item) => ({
        key: String(item.selectionKey),
        textValue: String(item.selectionKey),
        disabled: item.disabled(),
      })),
  );

  const listState = createListState({
    dataSource,
    getKey: () => "key",
    getTextValue: () => "textValue",
    getDisabled: () => "disabled",
    selectionMode,
    // A plain selection press toggles in multiple mode; single mode replaces.
    selectionBehavior: () => "toggle",
    selectedKeys: computed(() => normalizeSelection(props.selectedKeys)),
    defaultSelectedKeys: computed(() => normalizeSelection(props.defaultSelectedKeys)),
    onSelectionChange: (keys) => {
      // The public contract is `Set<string>`; the sentinel is not a HeroUI
      // group value and cannot occur with this state.
      if (keys !== "all") {
        props.onSelectionChange?.(keys);
      }
    },
    disallowEmptySelection: () => props.disallowEmptySelection ?? false,
  });

  const isFocusWithin = computed(() => items().some((item) => item.focused()));

  /**
   * Moves the keyboard focus by one focusable member. RAC's `useToolbar` uses
   * `focusManager.focusNext` / `focusPrevious`, which do not wrap, and it does
   * not bind Home / End; this matches both. Moving writes the focused key of a
   * collection member and calls its view's `focus()`, pressing nothing.
   *
   * NSH has no `tabIndex`, so `excludeFromTabOrder` makes a view unfocusable
   * rather than RAC's `tabIndex: -1`, and `focus()` on it is a no-op that would
   * end the walk. Such a member is skipped: the arrows cannot reach it at all.
   */
  const moveFocus = (delta: 1 | -1) => {
    const members = items();
    const current = members.findIndex((item) => item.focused());

    if (current < 0) {
      return;
    }

    for (let next = current + delta; next >= 0 && next < members.length; next += delta) {
      const target = members[next];

      if (target.disabled() || !target.focusable()) {
        continue;
      }

      if (target.selectionKey !== undefined) {
        listState.selectionManager().setFocusedKey(target.selectionKey);
      }

      target.focus();
      return;
    }
  };

  // Collection keys must never use `when: "always"`; the scope binds them
  // while a member has the keyboard focus and unbinds on blur or unmount.
  // Orientation picks the axis, and each gets its own scope so a changed
  // `orientation` rebinds instead of keeping the first object read at mount.
  createKeymapScope({
    isActive: () => isFocusWithin() && orientation() === "horizontal",
    bindings: {
      left: () => moveFocus(-1),
      right: () => moveFocus(1),
    },
    options: { repeat: true },
  });

  createKeymapScope({
    isActive: () => isFocusWithin() && orientation() === "vertical",
    bindings: {
      up: () => moveFocus(-1),
      down: () => moveFocus(1),
    },
    options: { repeat: true },
  });

  const renderProps: ToggleButtonGroupRenderProps = {
    orientation,
    isDisabled: () => groupIsDisabled() === true,
    state: createToggleButtonGroupState({
      listState,
      selectionMode,
      isDisabled: () => groupIsDisabled() === true,
      disallowEmptySelection: () => props.disallowEmptySelection ?? false,
    }),
  };

  const contextValue: ToggleButtonGroupContextValue = {
    slots,
    orientation,
    size: () => props.size,
    isDisabled: groupIsDisabled,
    isDetached,
    fullWidth,
    selectionMode,
    state: listState,
    registerItem,
  };

  const resolvedClassName = () => {
    const value = props.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    [slots().base(), resolvedClassName() ?? ""]
      .filter((part) => part !== "")
      .join(" "),
  );

  const resolvedStyle = () => {
    const value = props.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const role = () => (selectionMode() === "single" ? "radiogroup" : "toolbar");

  // Read `props.children` once, inside the provider and at the placement
  // (the exception in the common rules). The function form is called in that
  // same read, so the members it returns are created inside the provider and
  // still see the group context.
  const renderGroupChildren = (
    content: JSX.Element | ((values: ToggleButtonGroupRenderProps) => JSX.Element),
  ) => {
    if (typeof content === "function" && content.length >= 1) {
      return renderChildren(
        (content as (values: ToggleButtonGroupRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(content as JSX.Element);
  };

  return (
    <ToggleButtonGroupContext.Provider value={contextValue}>
      <View
        ref={(node) => props.ref?.(node)}
        testID={props.testID}
        nativeID={props.id ?? props.nativeID}
        tooltip={props.tooltip}
        role={role()}
        accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
        // The group does not write `accessibilityState.disabled`: NSH would
        // propagate it to every descendant, including a member without an
        // `id` that keeps working as a standalone toggle (port sheet §5).
        accessibilityState={props.accessibilityState}
        accessibilityElementsHidden={
          props["aria-hidden"] ?? props.accessibilityElementsHidden
        }
        class={classes()}
        style={resolvedStyle()}
        onLayout={props.onLayout}
      >
        {renderGroupChildren(props.children)}
      </View>
    </ToggleButtonGroupContext.Provider>
  );
}
