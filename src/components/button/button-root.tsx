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
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { FormContext } from "../form/context";
import { FieldsetContext } from "../fieldset/context";
import { ToolbarContext } from "../toolbar/context";
import { ButtonGroupContext } from "./button-group-context";
import { buttonGroupItemClasses } from "./button-group-classes";
import { buttonVariants, type ButtonVariants } from "./button.styles";
import { renderChildren } from "./children";
import { type AriaProps, type GlobalDomProps } from "./dom-props";
import { toAccessibilityRole } from "./roles";

/** The live state HeroUI hands to render-prop children, `className` and `style`. */
export interface ButtonRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPending: Accessor<boolean>;
}

export interface ButtonRootProps extends ButtonVariants, AriaProps, GlobalDomProps {
  children?: JSX.Element | ((values: ButtonRenderProps) => JSX.Element);
  className?: string | ((values: ButtonRenderProps) => string);
  style?: StyleProp<ViewStyle> | ((values: ButtonRenderProps) => StyleProp<ViewStyle>);
  isDisabled?: boolean;
  isPending?: boolean;
  /** Focuses the button after it mounts. */
  autoFocus?: boolean;
  /** Leaves the button out of the Tab order. */
  excludeFromTabOrder?: boolean;
  role?: string;
  id?: string;
  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;
  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;
  /** Maps to `isDisabled` when `true`. */
  "aria-disabled"?: boolean;
  /** Maps to the matching `accessibilityState` field. */
  "aria-busy"?: boolean;
  "aria-checked"?: boolean | "mixed";
  "aria-expanded"?: boolean;
  "aria-pressed"?: boolean | "mixed";
  "aria-selected"?: boolean;
  /** NSH host props, accepted beside the ARIA aliases above. */
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;
  testID?: string;
  nativeID?: string;
  tooltip?: JSX.Element;
  onLayout?: (e: { bounds: Bounds }) => void;
  ref?: (node: ViewRef) => void;
  onPress?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressUp?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  onPressDown?: (e: PressEvent) => void;
  onLongPress?: (e: PressEvent) => void;
  onLongPressStart?: (e: PressEvent) => void;
  onLongPressEnd?: (e: PressEvent) => void;
  onHoverStart?: (e: NshMouseEvent) => void;
  onHoverEnd?: (e: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;
  /** NSH host mouse events, chained beside the internal hover tracking. */
  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** `submit` submits the enclosing Form; `button` (default) and `reset` do nothing (NSH has no native form). */
  type?: "button" | "submit" | "reset";
  /** React Aria DOM / form props: accepted for API parity, no effect in NSH. */
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;
  name?: string;
  value?: string;
  slot?: string;
  render?: unknown;
  preventFocusOnPress?: boolean;
  allowFocusOnInteraction?: boolean;
  "aria-describedby"?: string;
  "aria-labelledby"?: string;
  "aria-controls"?: string;
}

/**
 * Button.Root / ButtonRoot: the whole Button component. Built on the core
 * `View` and not on nsh/base `Button`, which cannot express the hover, focus
 * and visibility channels HeroUI's render props, `className` and `style`
 * functions take (port sheet section 3, criterion B3).
 */
export function ButtonRoot(props: ButtonRootProps) {
  const group = ButtonGroupContext();
  // Port sheet popover §5.2: a Button written inside a popover root becomes its
  // trigger. NSH has no handler injection channel, so the Button consumes the
  // trigger context itself; outside one it is `null` and nothing changes.
  const overlayTrigger = OverlayTriggerContext();
  // Form sheet §5.2: `<Button type="submit">` is how HeroUI submits the form
  // around it. NSH has no native submit event, so the Button asks the enclosing
  // Form through its context; outside a Form this is `undefined` and nothing
  // changes.
  const form = FormContext();
  // Port sheet toolbar §5: a Button written inside a Toolbar joins its arrow-key
  // registry. Outside one this is `null` and nothing changes.
  const toolbar = ToolbarContext();

  const isHovered = signal(false);
  const isPressed = signal(false);
  const isFocused = signal(false);
  const modality = createInteractionModality();

  const isFocusVisible = computed(() => isFocused() && modality.isKeyboard());

  // A Button placed in a Dropdown root is that overlay's trigger, so it takes
  // the trigger's keys (`useMenuTrigger.ts:88-100`, dropdown port sheet §5):
  // ArrowDown opens on the first row, ArrowUp on the last, the Alt arrows in
  // every mode, the plain arrows only outside `longPress`, and the Alt forms of
  // Return and Space only in `longPress` mode, on the first row. Outside such a
  // root the context has no channel and the Button binds nothing.
  createKeymapScope({
    isActive: isFocused,
    bindings: overlayTrigger?.triggerKeyOpen
      ? {
          arrowdown: () => overlayTrigger?.triggerKeyOpen?.("first", "arrow"),
          "alt+arrowdown": () => overlayTrigger?.triggerKeyOpen?.("first", "altArrow"),
          arrowup: () => overlayTrigger?.triggerKeyOpen?.("last", "arrow"),
          "alt+arrowup": () => overlayTrigger?.triggerKeyOpen?.("last", "altArrow"),
          "alt+enter": () => overlayTrigger?.triggerKeyOpen?.("first", "activation"),
          "alt+space": () => overlayTrigger?.triggerKeyOpen?.("first", "activation"),
        }
      : {},
  });

  const isPending = () => props.isPending ?? false;
  const ownIsDisabled = () =>
    props.isDisabled ?? (props["aria-disabled"] === true ? true : undefined);
  // `??`, not `||`: a Button's own `false` overrides a disabled group.
  // Fieldset sheet §5.2: a disabled `Fieldset` replaces the browser's native
  // `<fieldset disabled>` propagation and RAC's `ButtonContext`, so it is ORed
  // in ahead of both and a Button cannot re-enable itself with `false`.
  const fieldset = FieldsetContext();
  const isDisabled = computed(
    () =>
      fieldset?.isDisabled() === true ||
      (ownIsDisabled() ?? group?.isDisabled() ?? false),
  );

  const size = computed(() => props.size ?? group?.size());
  const variant = computed(() => props.variant ?? group?.variant());
  const fullWidth = computed(() => props.fullWidth ?? group?.fullWidth() ?? false);
  const isIconOnly = () => props.isIconOnly ?? false;

  const renderProps: ButtonRenderProps = {
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

  // R-033 … R-052
  const groupClasses = computed(() =>
    group ? buttonGroupItemClasses(group.orientation(), variant()) : "",
  );

  const classes = computed(() => {
    const variantClasses = buttonVariants({
      fullWidth: fullWidth(),
      isIconOnly: isIconOnly(),
      size: size(),
      variant: variant(),
    });

    return [variantClasses, groupClasses(), resolvedClassName() ?? ""]
      .filter((part) => part !== "")
      .join(" ");
  });

  const resolvedStyle = () => {
    const style = props.style;
    return typeof style === "function" ? style(renderProps) : style;
  };

  // R-002: the CSS transition names three properties with two durations and
  // two curves. NSH takes one property list, one duration and one curve, so the
  // list is an inline style (that is the only owner of `transitionProperty`)
  // and duration / curve come from the class string. A disabled or
  // reduce-motion button transitions nothing, which keeps the opacity switch
  // instant as `disabled:transition-none` would.
  const transitionProperty = () =>
    reduceMotion() || isDisabled() ? "none" : "transform, background-color, box-shadow";

  const isBlocked = () => isDisabled() || isPending();

  // V4: Return and Space activation fire the same press handlers a pointer
  // press does, and `PressEvent` carries no `pointerType`; `isKeyboardPress`
  // reads the reported position instead. React Aria sets the modality from the
  // event that caused it (`useFocusVisible.ts:86-100`), so a keyboard
  // activation keeps the keyboard modality (and the ring, R-006) and any other
  // press switches to the pointer one. Never infer this from hover: a hovered
  // button activated by Enter is still a keyboard interaction.
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
    // Before the caller's `onPress`, as PressResponder's handler runs before
    // the element's own: a disabled Button never reaches this line. A root that
    // owns a press channel (Dropdown) decides what a press does; elsewhere the
    // press toggles the overlay (dropdown port sheet §5, third change).
    if (overlayTrigger?.triggerPress) {
      overlayTrigger.triggerPress(isKeyboardPress(event) ? "keyboard" : "pointer");
    } else {
      overlayTrigger?.toggle();
    }
    // Form sheet §5.2: a submit Button asks the enclosing Form; `button` (the
    // default) and `reset` do nothing, NSH having no native form.
    if (props.type === "submit") {
      form?.submit();
    }
    props.onPress?.(event);
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

  const handlePressUp = (event: PressEvent) => {
    if (isPressed()) {
      isPressed.set(false);
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

    // A held press is the long-press trigger of an overlay root that opens
    // that way (Dropdown's `longPress`); before the caller's handlers, as
    // PressResponder's injected `onLongPress` runs before the element's.
    overlayTrigger?.triggerLongPress?.();
    props.onLongPressStart?.(event);
    props.onLongPress?.(event);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    props.onMouseEnter?.(event);

    // RAC's useHover is off while disabled or pending.
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
    // not focus it, so this is the keyboard modality arriving.
    modality.onFocus();
    props.onFocus?.();
  };

  const handleBlur = () => {
    isFocused.set(false);
    props.onBlur?.();
  };

  let node: ViewRef | undefined;
  const handleRef = (next: ViewRef) => {
    node = next;
    // The popover anchor and focus-return target (§5.2). The registration
    // hands back its cleanup, held by the same owner as ButtonGroup's.
    if (overlayTrigger) {
      cleanup(overlayTrigger.registerTrigger(next));
    }
    props.ref?.(next);
  };

  effect(() => {
    if (props.autoFocus) {
      node?.focus();
    }
  });

  if (group) {
    cleanup(group.registerItem({ focused: isFocused, focusVisible: isFocusVisible }));
  }

  // The toolbar walks its registered controls instead of enumerating the DOM
  // (port sheet toolbar §5, cross-unit change 1). Everything the arrows need is
  // already here: the focus signal, the ref's `focus()`, and the two reasons a
  // Button is not a Tab stop. A pending Button stays focusable upstream, so it
  // only leaves the walk when disabled or explicitly kept out of the Tab order.
  if (toolbar) {
    cleanup(
      toolbar.registerItem({
        focused: isFocused,
        focusable: () => props.excludeFromTabOrder !== true && !isDisabled(),
        focus: () => node?.focus(),
      }),
    );
  }

  // RAC reports a pending button as unavailable but keeps it focusable, so
  // `accessibilityState.disabled` covers both while `View.disabled` does not
  // (R-008).
  const accessibilityState = computed<AccessibilityState>(() => {
    const own = props.accessibilityState ?? {};

    return {
      ...own,
      disabled: isDisabled() || isPending() || own.disabled === true,
      busy: props["aria-busy"] ?? own.busy,
      checked: props["aria-checked"] ?? own.checked,
      expanded: props["aria-expanded"] ?? overlayTrigger?.isOpen() ?? own.expanded,
      pressed: props["aria-pressed"] ?? own.pressed,
      selected: props["aria-selected"] ?? own.selected,
    };
  });

  // Read `props.children` once, right where the children go (research 4.1).
  // A computed would move the read out of the ButtonGroup provider's owner and
  // the buttons would stop seeing their group, so the placement reads it.
  const renderContent = (
    content: JSX.Element | ((values: ButtonRenderProps) => JSX.Element),
  ) => {
    // D17: a function that takes arguments is the HeroUI render prop; a
    // zero-argument function is an NSH reactive child. HeroUI renders the
    // render prop's result as a React node, so a string or number result must
    // become Text here just like static children do.
    if (typeof content === "function" && content.length >= 1) {
      return renderChildren((content as (values: ButtonRenderProps) => JSX.Element)(renderProps));
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
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      accessibilityState={accessibilityState()}
      accessibilityElementsHidden={props["aria-hidden"] ?? props.accessibilityElementsHidden}
      class={classes()}
      // R-006 focus ring; R-008 pending pointer blocking.
      classList={{
        "ring-2 ring-focus ring-offset-2 ring-offset-background": isFocusVisible(),
        "pointer-events-none": isPending(),
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
