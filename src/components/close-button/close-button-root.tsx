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
import { computed, effect, reduceMotion, signal, View } from "nsh";
import type { Accessor } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { FieldsetContext } from "../fieldset/context";
import { renderChildren } from "./children";
import { CloseIcon } from "./close-icon";
import { closeButtonVariants, type CloseButtonVariants } from "./close-button.styles";
import {
  type AriaProps,
  type DataProps,
  type FocusEvents,
  type FormProps,
  type GlobalDomEvents,
  type GlobalDomProps,
  type KeyboardEvents,
} from "./dom-props";
import { toAccessibilityRole } from "./roles";

/** The live state HeroUI hands to render-prop children, `className` and `style`. */
export interface CloseButtonRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPending: Accessor<boolean>;
}

/**
 * The props of `CloseButton.Root` (= `CloseButton`): HeroUI 3.2.7's
 * `CloseButtonRootProps`, which is `ComponentPropsWithRef<typeof ButtonPrimitive>`
 * plus `CloseButtonVariants`.
 *
 * The DOM-only members (form props, `role`, `tabIndex`, `render`, the global
 * DOM attributes and events) are accepted so code written against HeroUI keeps
 * compiling; port sheet §1.2 and §5 list what they do here. The members with a
 * real NSH counterpart are mapped by the component body.
 */
export interface CloseButtonRootProps
  extends CloseButtonVariants,
    AriaProps,
    DataProps,
    GlobalDomProps,
    GlobalDomEvents,
    KeyboardEvents,
    FocusEvents,
    FormProps {
  children?: JSX.Element | ((values: CloseButtonRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. */
  className?: string | ((values: CloseButtonRenderProps) => string);

  style?: StyleProp<ViewStyle> | ((values: CloseButtonRenderProps) => StyleProp<ViewStyle>);

  /** Accepts or blocks presses, hover and the focus ring; `aria-disabled` folds in. */
  isDisabled?: boolean;

  /** Blocks presses and hover while staying focusable, as RAC's `isPending` does. */
  isPending?: boolean;

  /** Focuses the button after it mounts. */
  autoFocus?: boolean;

  /** Leaves the button out of the Tab order. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: a pointer press does not focus a view in NSH. */
  preventFocusOnPress?: boolean;

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Maps to `accessibilityLabel`, with `"Close"` when it is absent. */
  "aria-label"?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** A DOM role upstream; defaults to `"button"` as React Aria's button does. */
  role?: string;

  /** Accepted, no effect: a view is a focus stop or it is not. */
  tabIndex?: number;

  /** React Aria's slot collection prop: accepted, no effect (no Provider slots). */
  slot?: string;

  /** Accepted, no effect: NSH has no replaceable DOM element. */
  render?: unknown;

  /** Reaches the root `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;

  onPress?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressUp?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;

  /**
   * React Aria calls it on the release that fires `onPress`, for a pointer and a
   * keyboard alike. NSH has no DOM `MouseEvent`, so the payload is the press.
   */
  onClick?: (e: PressEvent) => void;

  /** NSH host press-down event, beside `onPressStart`. */
  onPressDown?: (e: PressEvent) => void;

  onHoverStart?: (e: NshMouseEvent) => void;
  onHoverEnd?: (e: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;

  /** NSH host mouse events; chained beside the internal hover tracking. */
  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;

  /** Forwarded to the root view as it is. */
  onMouseMove?: (e: NshMouseEvent) => void;

  /** Forwarded to the root view as it is. */
  onContextMenu?: (e: ContextMenuEvent) => void;

  onFocus?: () => void;
  onBlur?: () => void;

  /** NSH host props, accepted beside the ARIA aliases above. */
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;
}

function foldBoolean(value: boolean | "true" | "false" | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}

function foldPressed(
  value: boolean | "true" | "false" | "mixed" | undefined,
): boolean | "mixed" | undefined {
  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}

function foldCurrent(
  value: boolean | "true" | "false" | "page" | "step" | "location" | "date" | "time" | undefined,
): AccessibilityState["current"] {
  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}

/**
 * CloseButton.Root / CloseButtonRoot: the whole CloseButton. Built on the core
 * `View` and not on nsh/base `Button`, which cannot express the hover, focus
 * and visibility channels HeroUI's render props, `className` and `style`
 * functions take (port sheet §3, criterion B3). It has no state shared with
 * another part, so there is no context; the only shared logic is the existing
 * `createInteractionModality`.
 */
export function CloseButtonRoot(props: CloseButtonRootProps) {
  const isHovered = signal(false);
  const isPressed = signal(false);
  const isFocused = signal(false);
  const modality = createInteractionModality();

  const isFocusVisible = computed(() => isFocused() && modality.isKeyboard());

  // R-007: `aria-disabled` and `isDisabled` are the same state, and RAC writes
  // `aria-disabled="true"` for a pending button too (Button.tsx:172), so the
  // pending look reuses R-007's declarations below (R-008).
  // Fieldset sheet §5.2: a disabled `Fieldset` replaces the browser's native
  // propagation and RAC's `ButtonContext`, so it is ORed in and a close button
  // cannot re-enable itself.
  const fieldset = FieldsetContext();
  const isDisabled = () =>
    fieldset?.isDisabled() === true ||
    props.isDisabled === true ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";
  const isPending = () => props.isPending === true;
  const isBlocked = () => isDisabled() || isPending();

  const variant = computed(() => props.variant ?? "default");

  const renderProps: CloseButtonRenderProps = {
    isHovered,
    isPressed,
    isFocused,
    isFocusVisible,
    isDisabled,
    isPending,
  };

  const resolvedClassName = () => {
    const className = props.className;

    return typeof className === "function" ? className(renderProps) : className;
  };

  // R-001 … R-004, R-012 … R-015: the variant table, then the caller's classes,
  // which win by coming later (D13).
  const classes = computed(() =>
    [closeButtonVariants({ variant: variant() }), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const style = props.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  // R-004: the transition names four properties with two curves and three
  // durations. NSH takes one list, one duration and one curve, so the list is
  // the inline style (its only owner) and `duration-[250ms] ease-out-quart`
  // come from the base class. Reduced motion takes the CSS
  // `motion-reduce:transition-none` path as an inline `"none"`.
  const transitionProperty = () =>
    reduceMotion() ? "none" : "transform, color, background-color, box-shadow";

  // V4: Return / Space activation reports `pagePosition` exactly `{0, 0}` while
  // a real pointer press reports where it happened. A keyboard activation keeps
  // the keyboard modality, so the focus ring stays (R-006).
  const notePress = (event: PressEvent) => {
    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }
  };

  const handlePress = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    notePress(event);
    props.onPress?.(event);
    // RAC's usePress dispatches `onPress` and then the synthetic `click` on the
    // same release; both the pointer and the keyboard activation take it.
    props.onClick?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isBlocked()) {
      return;
    }

    notePress(event);
    isPressed.set(true);
    props.onPressStart?.(event);
    props.onPressDown?.(event);
    props.onPressChange?.(true);
  };

  // RAC's release order (usePress.ts:252-285, `triggerPressEnd` called after
  // `triggerPressUp`): `onPressUp`, then `onPressEnd`, then `onPressChange(false)`
  // with the pressed state, then `onPress` / `onClick` on the same release
  // (`handlePress` runs after this host event).
  const handlePressUp = (event: PressEvent) => {
    const blocked = isBlocked();

    if (!blocked) {
      props.onPressUp?.(event);
      props.onPressEnd?.(event);
    }

    // Still clears a press that started before the button became blocked, so
    // `isPressed` cannot stay stuck true.
    if (isPressed()) {
      isPressed.set(false);
      props.onPressChange?.(false);
    }
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    // RAC's useHover is off while disabled or pending, but the caller's own
    // host handler still hears the event (port sheet §1.2).
    if (!isBlocked() && !isHovered()) {
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
    // Port sheet §2: the same host event drives the render state and the
    // caller's `onFocusChange`.
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

  effect(() => {
    if (props.autoFocus) {
      node?.focus();
    }
  });

  // R-007: `isDisabled` is the state a view reports as unavailable. R-008's
  // pending look reuses R-007's declarations, but pending must NOT reach
  // `accessibilityState.disabled`: NSH drops a view that reports disabled from
  // the focus system, while RAC's `isPending` retains focusability
  // (Button.tsx:89-93). Pending's screen-reader announcement is a registered
  // §5 difference; `View.disabled` and the `isBlocked()` guards keep press and
  // hover blocked.
  const accessibilityState = computed<AccessibilityState>(() => {
    const own = props.accessibilityState ?? {};

    return {
      ...own,
      disabled: isDisabled() || own.disabled === true,
      expanded: foldBoolean(props["aria-expanded"]) ?? own.expanded,
      pressed: foldPressed(props["aria-pressed"]) ?? own.pressed,
      current: foldCurrent(props["aria-current"]) ?? own.current,
    };
  });

  // Read `props.children` once, through a computed, and render it at the
  // placement so a signal inside `<CloseButton>{count()}</CloseButton>` keeps
  // updating (research 4.1, 4.6).
  const children = computed(() => props.children);

  const renderContent = () => {
    const content = children();

    // HeroUI's `children ?? <CloseIcon />`: only the two empty values take the
    // default icon. A zero-argument function is NSH's reactive child, never
    // "no children" (D17).
    if (content === undefined || content === null) {
      return <CloseIcon />;
    }

    // D17: a function that takes arguments is the HeroUI render prop; the
    // parameter object holds accessors.
    if (typeof content === "function" && content.length >= 1) {
      return renderChildren(
        (content as (values: CloseButtonRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(content as JSX.Element);
  };

  return (
    <View
      ref={handleRef}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      tooltip={props.tooltip}
      role={toAccessibilityRole(props.role, "button")}
      disabled={isDisabled()}
      focusable={props.excludeFromTabOrder === true ? false : undefined}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel ?? "Close"}
      accessibilityState={accessibilityState()}
      accessibilityElementsHidden={props["aria-hidden"] ?? props.accessibilityElementsHidden}
      class={classes()}
      // R-006 focus ring; R-007 / R-008 disabled and pending look.
      classList={{
        "ring-2 ring-focus ring-offset-2 ring-offset-background": isFocusVisible(),
        "opacity-50 cursor-not-allowed pointer-events-none": isBlocked(),
      }}
      style={[{ transitionProperty: transitionProperty() }, resolvedStyle()]}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={props.onMouseMove}
      onContextMenu={props.onContextMenu}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={props.onLayout}
    >
      {renderContent()}
    </View>
  );
}
