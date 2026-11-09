import type {
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, effect, reduceMotion, signal, View } from "nsh";
import type { Accessor } from "nsh";

import {
  createInteractionModality,
  createSelectableItem,
  createToggleState,
  isKeyboardPress,
  type ToggleState,
} from "../../primitives";
import { renderChildren } from "./children";
import { type AriaProps, type DataProps, type GlobalDomProps } from "./dom-props";
import { toggleButtonGroupItemClasses } from "./toggle-button-group-classes";
import { ToggleButtonGroupContext } from "./toggle-button-group-context";
import {
  toggleButtonVariants,
  type ToggleButtonSize,
  type ToggleButtonVariant,
  type ToggleButtonVariants,
} from "./toggle-button.styles";

/* ------------------------------------------------------------------------------------------------
 * Render props
 * ---------------------------------------------------------------------------------------------- */

/** The live state HeroUI hands to render-prop children, `className` and `style`. */
export interface ToggleButtonRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isSelected: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  /** The toggle state (this port's `createToggleState` shape, D17). */
  state: ToggleState;
}

/* ------------------------------------------------------------------------------------------------
 * ToggleButton Root
 * ---------------------------------------------------------------------------------------------- */

export interface ToggleButtonRootProps
  extends ToggleButtonVariants,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** An element, or a render prop called once with the toggle state (D17). */
  children?: JSX.Element | ((values: ToggleButtonRenderProps) => JSX.Element);

  /** Appended after the variant and in-group classes; later classes win. */
  className?: string | ((values: ToggleButtonRenderProps) => string);

  /** Style of the button; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: ToggleButtonRenderProps) => StyleProp<ViewStyle>);

  /** The selected state, controlled. */
  isSelected?: boolean;

  /** The initial selected state, uncontrolled. */
  defaultSelected?: boolean;

  /** Called with the next selected state; only outside a group item. */
  onChange?: (isSelected: boolean) => void;

  /** Blocks presses, hover and keyboard activation; dims the button. */
  isDisabled?: boolean;

  /**
   * In a group, the key in `selectedKeys`; alone, the view's `nativeID`.
   * An identity: it is read once.
   */
  id?: string | number;

  /** Focuses the button after it mounts. */
  autoFocus?: boolean;

  /** Leaves the button out of the Tab order. NSH has no `tabIndex`, so this
   * also makes the view unfocusable, and a group's arrows cannot reach it. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: NSH pointer presses never focus a view. */
  preventFocusOnPress?: boolean;

  /** Accepted, no effect: same reason as `preventFocusOnPress`. */
  allowFocusOnInteraction?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;
  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;
  /** Reads as `isDisabled` when `true`. */
  "aria-disabled"?: boolean;
  /** Maps to `accessibilityState.expanded`, as Button does. */
  "aria-expanded"?: boolean;
  /** Maps to `accessibilityState.current`; `true` reads as ARIA's `aria-current`. */
  "aria-current"?: boolean | "page" | "step" | "location" | "date" | "time";

  /** NSH host props, accepted beside the ARIA aliases above. */
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;
  ref?: (node: ViewRef) => void;

  /* HeroUI's React Aria event surface. */
  onPress?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressUp?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  /** NSH's host event; fired beside `onPressStart` when the press begins. */
  onPressDown?: (e: PressEvent) => void;
  onLongPress?: (e: PressEvent) => void;
  onLongPressStart?: (e: PressEvent) => void;
  /** Accepted, no effect: NSH has no event when a long press ends. */
  onLongPressEnd?: (e: PressEvent) => void;
  onHoverStart?: (e: NshMouseEvent) => void;
  onHoverEnd?: (e: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;
  /** NSH host events, chained beside the internal hover tracking. */
  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onFocusChange?: (isFocused: boolean) => void;
}

/**
 * ToggleButton.Root / ToggleButtonRoot: the whole ToggleButton. Built on the
 * core `View`, not on nsh/base `Toggle`, whose controlled-only `pressed` and
 * fixed role cannot express HeroUI's selection state, render props, event
 * surface or the group's radio semantics (port sheet §3.1, criterion B3).
 */
export function ToggleButtonRoot(props: ToggleButtonRootProps) {
  const group = ToggleButtonGroupContext();

  // `id` is an identity, so it is read once. In a group it is the selection
  // key; without a group it is the view's DOM id upstream.
  const id = props.id;
  const groupKey = group != null && id != null ? String(id) : undefined;
  const isGroupItem = groupKey !== undefined;

  const ownIsDisabled = () =>
    props.isDisabled ?? (props["aria-disabled"] === true ? true : undefined);

  // RAC's useToggleButtonGroupItem reads `disabled || group.isDisabled`; the
  // child cannot turn a disabled group back on. A member without an `id`
  // works as a standalone toggle and ignores the group's disabled state.
  const isDisabled = computed(() => {
    if (isGroupItem && group) {
      return ownIsDisabled() === true || group.isDisabled() === true;
    }

    return ownIsDisabled() === true;
  });

  const size = computed<ToggleButtonSize>(() => props.size ?? group?.size() ?? "md");
  const variant = computed<ToggleButtonVariant>(() => props.variant ?? "default");
  const isIconOnly = () => props.isIconOnly === true;

  // --- Interaction state ------------------------------------------------------
  const isHovered = signal(false);
  const isPressed = signal(false);
  const isFocused = signal(false);
  const modality = createInteractionModality();

  // R-008: NSH's `focus:` equals `focus-visible:`, so the ring only shows when
  // the focus arrived from the keyboard.
  const isFocusVisible = computed(() => isFocused() && modality.isKeyboard());

  // --- Selection state --------------------------------------------------------
  // The standalone state, from the shared primitive. In a group the member's
  // selection is the group's; `createToggleState` stays unused there.
  const toggleState = createToggleState({
    isSelected: () => props.isSelected,
    defaultIsSelected: () => props.defaultSelected,
    isDisabled: () => isDisabled(),
    onSelectedChange: (value) => props.onChange?.(value),
  });

  // React Aria toggles a group member on the release, inside `onPress`:
  // `useToggleButton` chains `state.toggle` into `onPress`, so the member's key
  // is the only thing that changes and the press modifiers are ignored
  // (react-spectrum@740c6c5 packages/react-aria/src/button/useToggleButton.ts:136-142,
  // .../useToggleButtonGroup.ts:121-130,
  // .../packages/react-stately/src/toggle/useToggleGroupState.ts:79-89). The
  // selectable item below only tracks the focused key and the selected state;
  // its own selection half would honor Shift as a range extend, which a toggle
  // group never does, so it is not wired (`shouldSelectOnPressUp` also keeps
  // `onPressDown` from selecting).
  const selectableItem =
    isGroupItem && group
      ? createSelectableItem({
          selectionManager: group.state.selectionManager,
          key: () => groupKey,
          disabled: () => isDisabled(),
          shouldSelectOnPressUp: () => true,
        })
      : undefined;

  const isSelected = computed(() =>
    selectableItem ? selectableItem.isSelected() : toggleState.isSelected(),
  );

  /** Sets the group's selection to `value` through the selection manager. */
  const setGroupSelected = (value: boolean) => {
    if (!group || groupKey === undefined) {
      return;
    }

    const manager = group.state.selectionManager();

    if (manager.isSelected(groupKey) === value) {
      return;
    }

    // `toggleSelection` replaces in single mode and adds / removes in
    // multiple mode, and honours `disallowEmptySelection` itself.
    manager.toggleSelection(groupKey);
  };

  const state: ToggleState = {
    isSelected,
    setIsSelected: (value) => {
      if (isGroupItem) {
        setGroupSelected(value);
        return;
      }

      toggleState.setIsSelected(value);
    },
    toggle: () => {
      if (isGroupItem) {
        if (isDisabled()) {
          return;
        }

        setGroupSelected(!isSelected());
        return;
      }

      toggleState.toggle();
    },
  };

  const renderProps: ToggleButtonRenderProps = {
    isHovered,
    isPressed,
    isFocused,
    isSelected,
    isFocusVisible,
    isDisabled,
    state,
  };

  // --- Registry (research 4.2) ------------------------------------------------
  let node: ViewRef | undefined;

  const focusSelf = () => {
    node?.focus();
  };

  if (group) {
    // Every member joins the group's registry: RAC's toolbar arrows move
    // through members without an `id` too, while only `id` members take part
    // in the group selection.
    cleanup(
      group.registerItem({
        selectionKey: groupKey,
        disabled: isDisabled,
        // The same expression the view gets: NSH's only focusability knob.
        focusable: () => props.excludeFromTabOrder !== true && !isBlocked(),
        focused: isFocused,
        focus: focusSelf,
      }),
    );
  }

  // --- Classes ----------------------------------------------------------------
  const resolvedClassName = () => {
    const value = props.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // R-031 … R-038, R-040, R-047. Written after the variant classes so they win
  // where they overlap, and before the caller's `className`.
  const groupClasses = computed(() =>
    group
      ? toggleButtonGroupItemClasses(
          group.orientation(),
          group.isDetached(),
          group.fullWidth(),
        )
      : "",
  );

  const classes = computed(() =>
    [
      toggleButtonVariants({
        isIconOnly: isIconOnly(),
        size: size(),
        variant: variant(),
      }),
      groupClasses(),
      resolvedClassName() ?? "",
    ]
      .filter((part) => part !== "")
      .join(" "),
  );

  const resolvedStyle = () => {
    const value = props.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // R-003: the CSS transition names three properties with two durations and
  // curves. NSH takes one property list, one duration and one curve, so the
  // list is the inline `transitionProperty` (its only owner) and duration /
  // curve come from the class string. A reduce-motion setting turns it off.
  const transitionProperty = () =>
    reduceMotion() ? "none" : "transform, background-color, box-shadow";

  // --- Press, hover and focus -------------------------------------------------
  const isBlocked = () => isDisabled();

  // V4: Return and Space activation report `pagePosition { 0, 0 }`, a real
  // pointer press reports where it happened. Never infer the modality from
  // hover: a hovered button activated by Enter is still a keyboard interaction.
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }
  };

  const handlePressDown = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    notePress(event);
    // RAC moves the toolbar to the pressed button. An NSH press does not focus
    // a view, so the selectable item records the focused key here instead.
    selectableItem?.onPressDown(event);
    isPressed.set(true);
    props.onPressStart?.(event);
    props.onPressDown?.(event);
    props.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    if (isPressed()) {
      isPressed.set(false);
      props.onPressChange?.(false);
    }

    if (isBlocked()) {
      return;
    }

    // The selection waits for `onPress` (React Aria's `chain(state.toggle,
    // props.onPress)`), so the press-up sees the selection the press started
    // with. The selectable item's press-up selection half stays unwired.
    props.onPressUp?.(event);
    props.onPressEnd?.(event);
  };

  const handlePress = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    notePress(event);

    // RAC's `chain(state.toggle, props.onPress)` compares against nothing and
    // asks for no modifiers: a Shift, Ctrl or Alt click toggles this one key in
    // a multiple group, it never extends a range. `state.toggle` goes through
    // the group's `SelectionManager.toggleSelection`, which honours
    // `selectionMode` and `disallowEmptySelection` on its own.
    if (isGroupItem) {
      state.toggle();
    } else {
      toggleState.toggle();
    }

    props.onPress?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    props.onLongPressStart?.(event);
    props.onLongPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    props.onMouseEnter?.(event);

    // RAC's useHover reports no hover while disabled.
    if (isBlocked() || isHovered()) {
      return;
    }

    isHovered.set(true);
    props.onHoverStart?.(event);
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    props.onMouseLeave?.(event);

    if (!isHovered()) {
      return;
    }

    isHovered.set(false);
    props.onHoverEnd?.(event);
    props.onHoverChange?.(false);
  };

  const handleFocus = () => {
    isFocused.set(true);
    // V4: a view is focused by Tab on macOS and the web; a pointer press does
    // not focus it.
    modality.onFocus();
    selectableItem?.onFocus();
    props.onFocus?.();
    props.onFocusChange?.(true);
  };

  const handleBlur = () => {
    isFocused.set(false);
    selectableItem?.onBlur();
    props.onBlur?.();
    props.onFocusChange?.(false);
  };

  const handleRef = (next: ViewRef) => {
    node = next;
    props.ref?.(next);
  };

  effect(() => {
    if (props.autoFocus) {
      node?.focus();
    }
  });

  // --- Accessibility ----------------------------------------------------------
  // Single-selection group members are radios (`checked`); every other mode is
  // a toggle button (`pressed`). An explicit `accessibilityState` value wins,
  // as the port sheet says.
  const accessibilityState = computed<AccessibilityState>(() => {
    const own = props.accessibilityState ?? {};
    const selected = isSelected();
    const resolved: AccessibilityState = {
      ...own,
      disabled: isBlocked() || own.disabled === true,
      // React Aria keeps `aria-expanded` / `aria-current` on the button's own
      // props (react-spectrum@740c6c5 packages/react-aria/src/button/useButton.ts:42-66);
      // NSH carries both in `accessibilityState`, so they are merged here.
      expanded: props["aria-expanded"] ?? own.expanded,
      current: props["aria-current"] ?? own.current,
    };

    if (isGroupItem && group && group.selectionMode() === "single") {
      resolved.checked = own.checked ?? selected;
    } else {
      resolved.pressed = own.pressed ?? selected;
    }

    return resolved;
  });

  const role = () =>
    isGroupItem && group && group.selectionMode() === "single" ? "radio" : "button";

  // A group member's `id` is its selection key, not a DOM id; standalone it
  // maps to `nativeID`.
  const nativeID = () =>
    props.nativeID ?? (!isGroupItem && id != null ? String(id) : undefined);

  // Read `props.children` once, right where the children go (research 4.1).
  const renderContent = (
    content: JSX.Element | ((values: ToggleButtonRenderProps) => JSX.Element),
  ) => {
    // D17: a function that takes arguments is the HeroUI render prop; a
    // zero-argument function is an NSH reactive child.
    if (typeof content === "function" && content.length >= 1) {
      return renderChildren(
        (content as (values: ToggleButtonRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(content as JSX.Element);
  };

  return (
    <View
      ref={handleRef}
      testID={props.testID}
      nativeID={nativeID()}
      tooltip={props.tooltip}
      role={role()}
      disabled={isBlocked()}
      focusable={props.excludeFromTabOrder === true || isBlocked() ? false : undefined}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={accessibilityState()}
      accessibilityElementsHidden={props["aria-hidden"] ?? props.accessibilityElementsHidden}
      class={classes()}
      // R-008 focus ring; R-039 an inset ring inside a group.
      classList={{
        "ring-2 ring-focus outline-none": isFocusVisible(),
        "ring-offset-2 ring-offset-background": isFocusVisible() && !group,
        "ring-inset ring-offset-0": isFocusVisible() && group != null,
      }}
      style={[{ transitionProperty: transitionProperty() }, resolvedStyle()]}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={props.onLayout}
    >
      {renderContent(props.children)}
    </View>
  );
}
