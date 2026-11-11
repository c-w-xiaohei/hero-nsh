import type {
  AccessibilityRole,
  AccessibilityState,
  JSX,
  PressEvent,
  ViewRef,
} from "nsh";
import { computed, reduceMotion, signal, Text, View } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import type { ModalPartDomProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import type { ModalSlots } from "./modal.styles";
import { modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Trigger`: HeroUI's `ModalTriggerProps`, which is
 * `DOMRenderProps<'div', undefined>` plus `children` and `className`. The
 * press surface is NSH's host view props; `role` is `"button"` unless given.
 */
export interface ModalTriggerProps extends ModalPartDomProps {
  /** HeroUI writes `role="button"` and lets the caller override it. */
  role?: AccessibilityRole;

  /** `aria-disabled` upstream; the trigger treats a press as blocked. */
  "aria-disabled"?: boolean;

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Maps to `accessibilityState.expanded`. */
  "aria-expanded"?: boolean;
}

/**
 * Modal.Trigger / ModalTrigger: HeroUI's `Pressable` around a
 * `div[role="button"]`. Like Popover's trigger it consumes the root's
 * `OverlayTriggerContext`, so a press toggles the shared open state, and it
 * registers its view as the anchor / focus-return target.
 */
export function ModalTrigger(props: ModalTriggerProps): JSX.Element {
  const modal = ModalContext();
  const trigger = OverlayTriggerContext();

  // Upstream reads `slots.trigger` from `ModalContext`; outside a Root the
  // table's defaults still render, as its empty context default does.
  const slots = (): ModalSlots => modal?.slots() ?? modalVariants();

  const modality = createInteractionModality();
  // `createInteractionModality` tracks the last modality; this signal tracks
  // whether the view has focus at all, because R-004 needs both.
  const focused = signal(false);

  const isDisabled = () => props.disabled === true || props["aria-disabled"] === true;
  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  // R-001 … R-002: the slot classes carry the cursor, the transition timing and
  // the disabled / pressed looks; the caller's classes come later and win.
  const classes = computed(() =>
    [slots().trigger(), props.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-003: one property list, one curve. `motion-reduce:transition-none` is a
  // class, but the inline list would win over it, so reduced motion clears the
  // list here too (Popover / CloseButton's solved pattern).
  const transitionProperty = () =>
    reduceMotion() ? "none" : "transform, background-color, box-shadow";

  // V4: Return / Space activation reports `pagePosition` exactly `{x: 0, y: 0}`
  // while a real pointer press reports where it happened.
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }
  };

  const handlePress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    // PressResponder's press runs before the element's own `onPress`.
    trigger?.toggle();
    props.onPress?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    props.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    props.onPressUp?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    props.onLongPress?.(event);
  };

  const handleFocus = () => {
    focused.set(true);
    // A view is focused by Tab / `focus()`, never by a pointer press.
    modality.onFocus();
    props.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    props.onBlur?.();
  };

  let unregister: (() => void) | undefined;

  const handleRef = (node: ViewRef) => {
    unregister?.();
    unregister = trigger?.registerTrigger(node);
    props.ref?.(node);
  };

  // R-004: the focus ring only for keyboard focus. Upstream's
  // `:not([data-focused])` branch has no state channel here (port sheet).
  const classList = computed(() => ({
    "ring-2 ring-focus ring-offset-2 ring-offset-background": isFocusVisible(),
  }));

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...props.accessibilityState,
    expanded: props["aria-expanded"] ?? trigger?.isOpen(),
  }));

  return (
    <View
      ref={handleRef}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      role={props.role ?? "button"}
      // R-005: the disabled look is the table's `disabled:` variants, so the
      // blocked state has to reach the host view.
      disabled={isDisabled()}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={accessibilityState()}
      class={classes()}
      classList={classList()}
      style={[{ transitionProperty: transitionProperty() }, props.style]}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {renderTriggerChildren(props.children)}
    </View>
  );
}

/**
 * Renders the child value read at the placement: a bare string or number
 * becomes a `<Text>` (a string directly inside a `View` is not shown), arrays
 * map item by item, and an element or a zero-argument reactive child passes
 * through. Local copy of `src/components/close-button/children.tsx`, kept
 * private to this file (the shared version is a port sheet §5 proposal).
 */
function renderTriggerChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  if (typeof node === "function") {
    return renderTriggerChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderTriggerChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
