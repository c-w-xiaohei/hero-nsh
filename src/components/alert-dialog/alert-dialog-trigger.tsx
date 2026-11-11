import type {
  AccessibilityRole,
  AccessibilityState,
  JSX,
  PressEvent,
  ViewRef,
} from "nsh";
import { computed, reduceMotion, signal, split, Text, View } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { AlertDialogContext } from "./alert-dialog-context";
import type { AlertDialogPartDomProps } from "./alert-dialog-dom-props";
import { viewProps } from "./alert-dialog-dom-props";
import type { AlertDialogSlots } from "./alert-dialog.styles";
import { alertDialogVariants } from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.Trigger`: HeroUI's `AlertDialogTriggerProps`, which
 * is `HTMLAttributes<HTMLDivElement>` — a plain div with `role="button"`, not
 * the Button primitive. Every DOM member HeroUI's type allows reaches the view
 * through `viewProps`.
 */
export interface AlertDialogTriggerProps extends AlertDialogPartDomProps {
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
 * AlertDialog.Trigger / AlertDialogTrigger: HeroUI's `Pressable` around a
 * `div[role="button"]`. It consumes the root's `OverlayTriggerContext`, so a
 * press toggles the shared open state, and it registers its view as the focus
 * return target.
 */
export function AlertDialogTrigger(props: AlertDialogTriggerProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "role",
    "aria-disabled",
    "aria-label",
    "aria-expanded",
    "disabled",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onLongPress",
    "onFocus",
    "onBlur",
  ]);

  const alertDialog = AlertDialogContext();
  const trigger = OverlayTriggerContext();

  // Upstream reads `slots.trigger` from `AlertDialogContext`; outside a Root the
  // table's defaults still render, as its empty context default does.
  const slots = (): AlertDialogSlots => alertDialog?.slots() ?? alertDialogVariants();

  const modality = createInteractionModality();
  // `createInteractionModality` tracks the last modality; this signal tracks
  // whether the view has focus at all, because R-004 needs both.
  const focused = signal(false);

  const isDisabled = () => local.disabled === true || local["aria-disabled"] === true;
  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  // R-001 … R-006: the slot classes carry the box, the cursor, the timing, the
  // disabled and pressed looks; the caller's classes come later and win.
  const classes = computed(() =>
    [slots().trigger(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-003: one property list, one curve. `motion-reduce:transition-none` is a
  // class, but the inline list would win over it, so reduced motion clears the
  // list here too (Popover / Modal's solved pattern).
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
    local.onPress?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    local.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    local.onPressUp?.(event);
  };

  const handleLongPress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    local.onLongPress?.(event);
  };

  const handleFocus = () => {
    focused.set(true);
    // A view is focused by Tab / `focus()`, never by a pointer press.
    modality.onFocus();
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    local.onBlur?.();
  };

  let unregister: (() => void) | undefined;

  const handleRef = (node: ViewRef) => {
    unregister?.();
    unregister = trigger?.registerTrigger(node);
    local.ref?.(node);
  };

  // R-004: the focus ring only for keyboard focus. Upstream's
  // `:not([data-focused])` branch has no state channel here (port sheet §8).
  const classList = computed(() => ({
    "ring-2 ring-focus ring-offset-2 ring-offset-background": isFocusVisible(),
  }));

  const accessibilityState = computed<AccessibilityState>(() => ({
    ...props.accessibilityState,
    expanded: local["aria-expanded"] ?? trigger?.isOpen(),
  }));

  return (
    <View
      // Every other caller prop reaches the view: `testID`, `onLayout`,
      // `tooltip`, `hitSlop`, the pointer and context-menu handlers …
      {...viewProps(rest)}
      ref={handleRef}
      nativeID={local.id ?? local.nativeID}
      role={local.role ?? "button"}
      // R-005: the disabled look is the table's `disabled:` variants, so the
      // blocked state has to reach the host view.
      disabled={isDisabled()}
      accessibilityLabel={local["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={accessibilityState()}
      class={classes()}
      classList={classList()}
      style={[{ transitionProperty: transitionProperty() }, local.style]}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onLongPress={handleLongPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {renderTriggerChildren(local.children)}
    </View>
  );
}

/**
 * Renders the child value read at the placement: a bare string or number
 * becomes a `<Text>` (a string directly inside a `View` is not shown), arrays
 * map item by item, and an element or a zero-argument reactive child passes
 * through.
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
