import type {
  AccessibilityState,
  Bounds,
  ContextMenuEvent,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, effect, reduceMotion, signal, View } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { renderChildren } from "./children";
import { DropdownContext } from "./dropdown-context";
import { dropdownVariants } from "./dropdown.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The live state HeroUI hands to the trigger's `children`, `className` and
 * `style` functions: React Aria's `ButtonRenderProps` with accessors (D17).
 */
export interface DropdownTriggerRenderProps {
  isHovered: () => boolean;
  isPressed: () => boolean;
  isFocused: () => boolean;
  isFocusVisible: () => boolean;
  isDisabled: () => boolean;
  isPending: () => boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Dropdown.Trigger` / `DropdownTrigger`: React Aria Components'
 * `Button`, which HeroUI uses as the default trigger (not HeroUI's own Button).
 * NSH has one pressable host view, so the DOM surface is accepted for parity
 * and the press / hover / focus events are the live part (port sheet §1.2).
 */
export interface DropdownTriggerProps {
  /** Nodes, or a render function called once with accessor values. */
  children?: JSX.Element | ((values: DropdownTriggerRenderProps) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string | ((values: DropdownTriggerRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: DropdownTriggerRenderProps) => StyleProp<ViewStyle>);

  /** The anchor and focus-return target. */
  ref?: (node: ViewRef) => void;

  /** Disables the trigger; `Dropdown.Root`'s `isDisabled` is OR-ed in. */
  isDisabled?: boolean;

  /** Blocks presses and paints as pending (`pointer-events: none`). */
  isPending?: boolean;

  /** Focuses the trigger once after it mounts. */
  autoFocus?: boolean;

  /** Leaves the trigger out of the Tab order. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: NSH has no native form submission. */
  type?: "button" | "submit" | "reset";
  form?: string;
  value?: string;
  name?: string;

  onPress?: (event: PressEvent) => void;
  onPressStart?: (event: PressEvent) => void;
  onPressDown?: (event: PressEvent) => void;
  onPressUp?: (event: PressEvent) => void;
  onPressEnd?: (event: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  onLongPress?: (event: PressEvent) => void;

  /** Accepted, no effect: a press is the click here, there is no second channel. */
  onClick?: unknown;

  onHoverStart?: (event: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;
  onHoverEnd?: (event: NshMouseEvent) => void;
  onMouseEnter?: (event: NshMouseEvent) => void;
  onMouseLeave?: (event: NshMouseEvent) => void;

  onFocus?: () => void;
  onBlur?: () => void;
  onFocusChange?: (isFocused: boolean) => void;

  onContextMenu?: (event: ContextMenuEvent) => void;

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Accepted, no effect: NSH resolves no descriptions from ids. */
  "aria-describedby"?: string;
  "aria-details"?: string;

  /** Overrides the reported expanded state (default: the shared open state). */
  "aria-expanded"?: boolean;
  /** Accepted, no effect: `AccessibilityState` has no `haspopup`. */
  "aria-haspopup"?: boolean | "menu" | "listbox" | "tree" | "grid" | "dialog";
  /** Accepted, no effect: NSH has no cross-element id references. */
  "aria-controls"?: string;
  "aria-pressed"?: boolean | "mixed";

  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;

  /** The role to expose; `button` unless the caller overrides it. */
  role?: "button" | "link" | "menuitem" | "none";

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  /** The element's global attributes: accepted, no effect. */
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;

  onLayout?: (event: { bounds: Bounds }) => void;
}

/**
 * Dropdown.Trigger / DropdownTrigger: React Aria's `Button` with
 * `.dropdown__trigger`. It consumes `OverlayTriggerContext` for the open state
 * and the anchor, and `DropdownContext` for the trigger mode, so a press, a
 * long press or a right click is routed the way upstream's `PressResponder`
 * routes it.
 */
export function DropdownTrigger(props: DropdownTriggerProps) {
  const dropdown = DropdownContext();
  const overlay = OverlayTriggerContext();

  const slots = dropdown?.slots ?? dropdownVariants();

  const modality = createInteractionModality();
  const focused = signal(false);
  const hovered = signal(false);
  const pressed = signal(false);

  const isDisabled = () => (dropdown?.isDisabled() ?? false) || props.isDisabled === true;
  const isPending = () => props.isPending === true;
  const isBlocked = () => isDisabled() || isPending();
  const triggerMode = () => dropdown?.triggerMode() ?? "press";

  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  // React Aria's `useMenuTrigger` binds the trigger's arrows and the Alt forms
  // of Return, Space and the arrows (`useMenuTrigger.ts:78-108`): ArrowDown
  // opens on the first row, ArrowUp on the last, and each key's focus strategy
  // rides on the open. Return and Space need no binding here: a keyboard press
  // on a focused view arrives as a native press, which `openFromPress` routes.
  // The bindings exist only while the trigger holds the keyboard focus.
  createKeymapScope({
    isActive: focused,
    bindings: {
      arrowdown: () => overlay?.triggerKeyOpen?.("first", true),
      "alt+arrowdown": () => overlay?.triggerKeyOpen?.("first"),
      arrowup: () => overlay?.triggerKeyOpen?.("last", true),
      "alt+arrowup": () => overlay?.triggerKeyOpen?.("last"),
      "alt+enter": () => overlay?.triggerKeyOpen?.("last"),
      "alt+space": () => overlay?.triggerKeyOpen?.("last"),
    },
  });

  const renderProps: DropdownTriggerRenderProps = {
    isHovered: hovered,
    isPressed: pressed,
    isFocused: focused,
    isFocusVisible,
    isDisabled,
    isPending,
  };

  const resolvedClassName = () => {
    const value = props.className;

    return (typeof value === "function" ? value(renderProps) : value) ?? "";
  };

  const classes = computed(() =>
    [slots.trigger(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const value = props.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  // R-003: one property list, one curve; `motion-reduce` is a class but the
  // inline property list would win over `transition-none`, so reduce-motion
  // also clears it here (Button's solved pattern).
  const transitionProperty = () =>
    reduceMotion() ? "none" : "transform, background-color, box-shadow";

  // V4: Return / Space report `pagePosition` exactly `{x: 0, y: 0}`, a real
  // pointer press reports where it happened; never infer it from hover.
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }
  };

  const openFromPress = (event: PressEvent) => {
    const keyboard = isKeyboardPress(event);

    if (keyboard) {
      // A keyboard activation opens in every mode but `contextMenu`, and the
      // menu takes its first row (`useMenuTrigger.ts:78-108`). It never closes
      // here: Enter and Space can also reach the trigger's keymap bindings,
      // and a toggle would close what the other channel just opened.
      if (triggerMode() !== "contextMenu" && !overlay?.isOpen()) {
        dropdown?.setOpenFocusStrategy("first");
        overlay?.setIsOpen(true);
      }

      return;
    }

    if (triggerMode() === "press") {
      dropdown?.setOpenFocusStrategy(undefined);
      overlay?.toggle();
    }
  };

  const handlePress = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    notePress(event);

    if (pressed()) {
      pressed.set(false);
      props.onPressChange?.(false);
    }

    // The trigger's own open runs before the caller's `onPress`, as
    // `PressResponder`'s injected handler runs before the element's.
    openFromPress(event);
    props.onPress?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    notePress(event);
    pressed.set(true);
    props.onPressStart?.(event);
    props.onPressDown?.(event);
    props.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    if (pressed()) {
      pressed.set(false);
      props.onPressChange?.(false);
    }

    if (isBlocked()) {
      return;
    }

    props.onPressUp?.(event);
    props.onPressEnd?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    // `longPress` opens only on the hold; `press` already opened on release.
    if (triggerMode() === "longPress") {
      overlay?.setIsOpen(true);
    }

    props.onLongPress?.(event);
  };

  const handleContextMenu = (event: ContextMenuEvent) => {
    if (!isBlocked() && triggerMode() === "contextMenu") {
      // The secondary button opens the menu at the pointer, as React Aria's
      // `contextMenu` trigger does; the popover anchors to this point.
      dropdown?.setContextMenuPoint(event.pagePosition);
      overlay?.setIsOpen(true);
    }

    props.onContextMenu?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    props.onMouseEnter?.(event);

    if (isDisabled() || hovered()) {
      return;
    }

    hovered.set(true);
    props.onHoverStart?.(event);
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    props.onMouseLeave?.(event);
    pressed.set(false);

    if (!hovered()) {
      return;
    }

    hovered.set(false);
    props.onHoverEnd?.(event);
    props.onHoverChange?.(false);
  };

  const handleFocus = () => {
    focused.set(true);
    // A view is focused by Tab / `focus()`, never by a pointer press.
    modality.onFocus();
    props.onFocusChange?.(true);
    props.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    props.onFocusChange?.(false);
    props.onBlur?.();
  };

  let node: ViewRef | undefined;
  let unregister: (() => void) | undefined;

  const handleRef = (next: ViewRef) => {
    node = next;
    unregister?.();
    unregister = overlay?.registerTrigger(next);
    cleanup(() => unregister?.());
    props.ref?.(next);
  };

  let didAutoFocus = false;

  effect(() => {
    if (didAutoFocus || !props.autoFocus) {
      return;
    }

    didAutoFocus = true;
    node?.focus();
  });

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...props.accessibilityState,
    expanded: props["aria-expanded"] ?? overlay?.isOpen(),
    disabled: isDisabled(),
  }));

  // R-005 focus ring, R-006 disabled look, R-007 pending, R-008 pressed scale.
  const classList = computed(() => ({
    "ring-2 ring-focus ring-offset-0 ring-offset-background outline-none": isFocusVisible(),
    "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
    "pointer-events-none": isPending(),
    "scale-[0.97]": pressed(),
  }));

  const content = (): JSX.Element => {
    const value = props.children;

    if (typeof value === "function" && value.length >= 1) {
      return renderChildren(
        (value as (values: DropdownTriggerRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(value as JSX.Element);
  };

  return (
    <View
      ref={handleRef}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      tooltip={props.tooltip}
      role={props.role ?? "button"}
      disabled={isDisabled()}
      focusable={props.excludeFromTabOrder === true ? false : undefined}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={accessibilityState()}
      class={classes()}
      classList={classList()}
      style={[{ transitionProperty: transitionProperty() }, resolvedStyle()]}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={props.onLayout}
    >
      {content()}
    </View>
  );
}
