import type {
  Accessor,
  MouseEvent as NshMouseEvent,
  PressEvent,
  ViewRef,
} from "nsh";
import { computed, effect, signal } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";

/**
 * The live state HeroUI hands to a render-prop `children`, `className` or
 * `style` of `Link` / `Previous` / `Next`. HeroUI passes plain booleans and
 * re-renders; NSH has no re-render, so the same members are accessors (D17).
 * `isPending` is always `false`: pagination has no pending state (port sheet
 * §1.3).
 */
export interface PaginationRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPending: Accessor<boolean>;
}

/**
 * The event and state surface the three pressable parts share: React Aria's
 * `Button` callbacks, mapped onto the NSH host events a view actually has.
 *
 * `onPressUp` and `onPressEnd` share the single host `onPressUp` (NSH cannot
 * tell the two apart); `onClick` is the release-path companion of `onPress`,
 * as React Aria's synthetic click is.
 */
export interface PaginationPressableProps {
  /** Accepts or blocks presses and hover; `aria-disabled` folds in. */
  isDisabled?: boolean;

  /** `aria-disabled="true"` / `true` is the same state as `isDisabled`. */
  "aria-disabled"?: boolean | "true" | "false";

  /** Focuses the part after it mounts. */
  autoFocus?: boolean;

  /** Reaches the root `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;

  onPress?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressUp?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;

  /** NSH host press-down event, beside `onPressStart`. */
  onPressDown?: (e: PressEvent) => void;

  /** React Aria's click alias: fires on the release that fires `onPress`. */
  onClick?: (e: PressEvent) => void;

  onHoverStart?: (e: NshMouseEvent) => void;
  onHoverEnd?: (e: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;

  /** NSH host mouse events; chained beside the internal hover tracking. */
  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;

  onFocus?: () => void;
  onBlur?: () => void;

  /** Called with `true` on focus and `false` on blur, on the same host events. */
  onFocusChange?: (isFocused: boolean) => void;
}

/** The host handlers the pressable hands to its root `View`. */
export interface PaginationPressableHandlers {
  onPress: (e: PressEvent) => void;
  onPressDown: (e: PressEvent) => void;
  onPressUp: (e: PressEvent) => void;
  onMouseEnter: (e: NshMouseEvent) => void;
  onMouseLeave: (e: NshMouseEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface PaginationPressableState {
  /** `isDisabled` or `aria-disabled`, as one predicate. */
  isDisabled: Accessor<boolean>;
  renderProps: PaginationRenderProps;
  handlers: PaginationPressableHandlers;
  /** Forwards the root view to the caller's `ref`, keeping the node for `autoFocus`. */
  handleRef: (node: ViewRef) => void;
}

/**
 * The state machine behind `Pagination.Link`, `Pagination.Previous` and
 * `Pagination.Next`, which HeroUI builds from React Aria's `useButton`,
 * `useHover` and `useFocusRing`. The three parts are structurally identical, so
 * the tracking, the release order and the disabled guards live here once
 * (port sheet §5). It stays inside the component directory rather than
 * `src/primitives/`, because a batch may not add a shared primitive (batch
 * rule).
 *
 * RAC's order on release (`usePress.ts:252-285`): `onPressUp`, then
 * `onPressEnd`, then `onPressChange(false)` with the pressed state, then
 * `onPress` / `onClick`. `handlePress` runs after the host's `onPressUp`.
 */
export function createPaginationPressable(
  props: PaginationPressableProps,
): PaginationPressableState {
  const isHovered = signal(false);
  const isPressed = signal(false);
  const isFocused = signal(false);
  const modality = createInteractionModality();

  // R-011: React Aria's `:focus-visible` / `[data-focus-visible]` becomes
  // "focused while the keyboard is the last interaction", which is the
  // closest NSH equivalent (there is no `:focus-visible`).
  const isFocusVisible = computed(() => isFocused() && modality.isKeyboard());

  // R-012: `isDisabled` and `aria-disabled` are one state, as `:disabled` and
  // `[aria-disabled="true"]` are upstream.
  const isDisabled = () =>
    props.isDisabled === true ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";

  const isPending = () => false;

  const renderProps: PaginationRenderProps = {
    isHovered,
    isPressed,
    isFocused,
    isFocusVisible,
    isDisabled,
    isPending,
  };

  // V4: Return / Space activation reports `pagePosition` exactly `{0, 0}` while
  // a real pointer press reports where it happened. A keyboard activation keeps
  // the keyboard modality, so the focus ring stays (R-011).
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
    props.onPress?.(event);
    props.onClick?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    isPressed.set(true);
    props.onPressStart?.(event);
    props.onPressDown?.(event);
    props.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    if (!isDisabled()) {
      props.onPressUp?.(event);
      props.onPressEnd?.(event);
    }

    // Still clears a press that started before the part became disabled, so
    // `isPressed` cannot stay stuck true.
    if (isPressed()) {
      isPressed.set(false);
      props.onPressChange?.(false);
    }
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    // RAC's `useHover` is off while disabled, but the caller's own host handler
    // still hears the event (port sheet §1.3).
    if (!isDisabled() && !isHovered()) {
      isHovered.set(true);
      props.onHoverStart?.(event);
      props.onHoverChange?.(true);
    }

    props.onMouseEnter?.(event);
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    if (isHovered()) {
      isHovered.set(false);
      props.onHoverEnd?.(event);
      props.onHoverChange?.(false);
    }

    props.onMouseLeave?.(event);
  };

  const handleFocus = () => {
    isFocused.set(true);
    // V4: a view is focused by Tab on macOS and the web; a pointer press does
    // not focus it, so this is the keyboard modality arriving.
    modality.onFocus();
    props.onFocus?.();
    props.onFocusChange?.(true);
  };

  const handleBlur = () => {
    isFocused.set(false);
    props.onBlur?.();
    props.onFocusChange?.(false);
  };

  let node: ViewRef | undefined;
  const handleRef = (next: ViewRef) => {
    node = next;
    props.ref?.(next);
  };

  // React Aria focuses the button after mount; NSH a view through its ref.
  effect(() => {
    if (props.autoFocus) {
      node?.focus();
    }
  });

  return {
    isDisabled,
    renderProps,
    handlers: {
      onPress: handlePress,
      onPressDown: handlePressDown,
      onPressUp: handlePressUp,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
    handleRef,
  };
}
