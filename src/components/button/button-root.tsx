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
import { cleanup, computed, createAnimatedValue, effect, reduceMotion, signal, View } from "nsh";
import type { Accessor } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { createInput } from "../../primitives/environment";
import {
  createPressFeedback,
  getRootAnimationState,
  PressableFeedback,
  PressableFeedbackContext,
  type AnimationRoot,
  type PressableFeedbackContextValue,
  type PressableFeedbackHighlightAnimation,
  type PressableFeedbackRippleAnimation,
  type PressableFeedbackScaleAnimation,
} from "../../primitives/pressable";
import { themeToken } from "../../theme";
import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { HoverTriggerContext, OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
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

/**
 * A-006: which press feedback the button renders under `input === "touch"`,
 * heroui-native's `feedbackVariant` plus `"auto"`. `"auto"` (the default)
 * resolves to `scale-highlight` on touch — upstream's own default — and to
 * `none` under a pointer, keeping the desktop zero-change guarantee. `scale`
 * presses the root only; `scale-highlight` / `scale-ripple` add the matching
 * overlay; `none` mounts and animates nothing while `onPress` still fires.
 */
export type ButtonFeedbackVariant =
  | "auto"
  | "scale-highlight"
  | "scale-ripple"
  | "scale"
  | "none";

/**
 * A-006: the `animation` prop, upstream's per-preset discriminated union
 * merged into one shape (`sheet §3` — the §8 difference proposal): `scale`
 * configures the root's built-in channel, `highlight` / `ripple` the
 * overlay of the same name; keys the active preset does not use are
 * ignored. `false` / `"disabled"` and `"disable-all"` hold every channel at
 * rest (upstream's `isAnimationDisabled` treats them alike).
 */
export type ButtonAnimation = AnimationRoot<{
  scale?: PressableFeedbackScaleAnimation;
  highlight?: PressableFeedbackHighlightAnimation;
  ripple?: PressableFeedbackRippleAnimation;
}>;

export interface ButtonRootProps
  extends Omit<ButtonVariants, "input">,
    AriaProps,
    GlobalDomProps {
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
  /** A-006: the press feedback the touch environment renders. @default "auto" */
  feedbackVariant?: ButtonFeedbackVariant;
  /** A-006: per-channel animation configuration. */
  animation?: ButtonAnimation;
  /**
   * A-006: whether the feedback seam may write `scale` on the root style.
   * `false` leaves the transform channel to the caller.
   * @default true
   */
  isAnimatedStyleActive?: boolean;
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
export function ButtonRoot(
  props: ButtonRootProps & {
    /** Milliseconds before a press becomes a long press (View's own host
     * prop, default 500). Upstream spreads `...rest` onto its pressable, so
     * callers can pass it; it rides the call surface as an inline parameter
     * member — like the sheet-handoff `onScroll` fix — rather than the
     * exported `ButtonRootProps` interface, keeping the named contract
     * byte-identical to the port baseline. */
    delayLongPress?: number;
  },
) {
  const group = ButtonGroupContext();
  // Port sheet popover §5.2: a Button written inside a popover root becomes its
  // trigger. NSH has no handler injection channel, so the Button consumes the
  // trigger context itself; outside one it is `null` and nothing changes.
  const overlayTrigger = OverlayTriggerContext();
  // Tooltip port sheet §5.3: a Button inside a Tooltip root is its trigger too.
  // This is the hover / focus channel, beside the press channel above: both can
  // be present, so a Tooltip inside a Popover trigger still presses correctly.
  const hoverTrigger = HoverTriggerContext();
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

  // A-002 / A-003 / A-004 / A-005: the press-feedback seam. `createInput()`
  // feeds the tv() `input` axis and gates `createPressFeedback`; under the
  // default pointer environment the seam is inert — no press edge, no
  // hitSlop, scale held at 1 — which is the desktop-zero-change half of the
  // encapsulation model. Everything the caller sees stays exactly as it
  // was: the seam's `isPressed` is a private channel, not the render-prop
  // one, and the user callback order is untouched.
  const input = createInput();

  // A-006: `"auto"` resolves per input — upstream's own default
  // (`scale-highlight`) on touch, `none` under a pointer.
  const preset = computed<Exclude<ButtonFeedbackVariant, "auto">>(() => {
    const value = props.feedbackVariant ?? "auto";

    if (value !== "auto") {
      return value;
    }

    return input() === "touch" ? "scale-highlight" : "none";
  });

  // Upstream's `isAnimationDisabled` (button.utils.ts): `false` / `"disabled"`
  // and `"disable-all"` all hold every channel at rest.
  const { isAnimationDisabled: feedbackAllDisabled } = getRootAnimationState(
    props.animation,
  );

  // Upstream's `rootAnimation` (`button.tsx:236-250`): `"disable-all"`
  // cascades to every channel, `preset === "none"` or an off `scale` key
  // switches the built-in scale off, an object configures it. The strings
  // collapse to `scaleOff` for the factory: its own `getAnimationState`
  // does not read `"disable-all"`, so `false` is what pins `scale` to 1.
  const feedbackAnimation = (() => {
    if (feedbackAllDisabled) {
      return false as const;
    }

    const user =
      typeof props.animation === "object" && props.animation !== null
        ? props.animation
        : undefined;

    if (preset() === "none" || user?.scale === false || user?.scale === "disabled") {
      return false as const;
    }

    if (typeof user?.scale === "object") {
      return { scale: user.scale };
    }

    return undefined;
  })();

  const feedbackEnabled = () =>
    input() === "touch" && !isDisabled() && preset() !== "none";

  const feedback = createPressFeedback({
    enabled: feedbackEnabled,
    animation:
      typeof feedbackAnimation === "object"
        ? feedbackAnimation.scale
        : feedbackAnimation,
  });

  // A-005: the seam's read half for the Highlight / Ripple parts (and for
  // probes — the channels are the only observable surface `nsh/test` can
  // reach; A-009's harness/button.fixtures.tsx probe reads them through
  // `PressableFeedbackContext`). The root keeps the writers; the parts only
  // ever animate the root-owned `highlightOpacity` / `rippleProgress`,
  // matching the `PressableFeedback` root's own context value.
  const feedbackContextValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled: feedbackEnabled,
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => feedbackAllDisabled,
  };

  // A-005 / upstream `highlightAnimationConfig` (`button.tsx:154-190`): the
  // overlay tints with the variant's hover color — a highlight is what a
  // press draws when there is no hover — with the default-cell alpha folded
  // into the hex (`hasDefaultThemeBackground` is always false on NSH; the
  // glass background stays a §7-deferred item). The opacity peak stays the
  // part's own `[0, 0.1]` (upstream overrides `[0,1]`; sheet M-004 fixes the
  // channel's end value at 0.1, the same peak `HIGHLIGHT_PEAK` and the
  // ripple channel use — recorded in sheet §7).
  const highlightBackgroundColor = () => {
    switch (variant()) {
      case "primary":
        return themeToken("accent-hover");
      case "secondary":
      case "tertiary":
        return `${themeToken("default-hover")}33`;
      case "outline":
      case "ghost":
        return `${themeToken("default-hover")}4d`;
      case "danger":
        return themeToken("danger-hover");
      case "danger-soft":
        return themeToken("danger-soft-hover");
      default:
        return themeToken("foreground");
    }
  };

  const highlightAnimation = computed(() => {
    if (preset() !== "scale-highlight") {
      return undefined;
    }

    const user =
      typeof props.animation === "object" && props.animation !== null
        ? props.animation.highlight
        : undefined;

    if (user === false || user === "disabled") {
      return undefined;
    }

    const base = {
      backgroundColor: { value: highlightBackgroundColor() },
      opacity: { value: [0, 0.1] as [number, number] },
    };

    if (typeof user === "object" && user !== null) {
      return {
        ...user,
        backgroundColor: { ...base.backgroundColor, ...(user.backgroundColor ?? {}) },
        opacity: { ...base.opacity, ...(user.opacity ?? {}) },
      };
    }

    return base;
  });

  // Upstream's `rippleAnimationConfig` (`button.tsx:192-230`): same tint and
  // merge order as the highlight — button defaults fill the channels the
  // caller's `ripple` config leaves alone (the opacity peak is the part's
  // own `[0, 0.1, 0]` for the same reason as the highlight's).
  const rippleAnimation = computed(() => {
    if (preset() !== "scale-ripple") {
      return undefined;
    }

    const user =
      typeof props.animation === "object" && props.animation !== null
        ? props.animation.ripple
        : undefined;

    if (user === false || user === "disabled") {
      return undefined;
    }

    const base = {
      backgroundColor: { value: highlightBackgroundColor() },
      opacity: { value: [0, 0.1, 0] as [number, number, number] },
    };

    if (typeof user === "object" && user !== null) {
      return {
        ...user,
        backgroundColor: { ...base.backgroundColor, ...(user.backgroundColor ?? {}) },
        opacity: { ...base.opacity, ...(user.opacity ?? {}) },
        scale: user.scale,
        progress: user.progress,
      };
    }

    return base;
  });

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

  // R-033 … R-052. The group answers where this button sits, since NSH has no
  // `:first-child` / `:last-child`.
  const groupItem = { focused: isFocused, focusVisible: isFocusVisible };
  const groupPosition = computed(() => group?.positionOf(groupItem)() ?? "only");

  const groupClasses = computed(() =>
    group
      ? buttonGroupItemClasses(group.orientation(), variant(), groupPosition())
      : "",
  );

  const classes = computed(() => {
    // A-002: the `input` axis takes the environment's accessor; every other
    // resolution is unchanged.
    const variantClasses = buttonVariants({
      fullWidth: fullWidth(),
      input: input(),
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

  // A-004: `isAnimatedStyleActive` owns the `scale` channel entirely — while
  // off, nothing writes it, so the caller's own transform never races the
  // animation (the two-writers ban). The channel is bound only while the
  // root's scale animation can actually run: `preset` "none" and an off
  // `scale` key leave the caller's transform untouched as well.
  const animatedStyleActive = () => props.isAnimatedStyleActive ?? true;
  const scaleChannelBound = () =>
    animatedStyleActive() && feedbackAnimation !== false;

  const rootStyle = (): StyleProp<ViewStyle> => [
    { transitionProperty: transitionProperty() },
    ...(scaleChannelBound() ? [{ scale: feedback.scale }] : []),
    resolvedStyle(),
  ];

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
    // Tooltip port sheet §5.3: a keyboard Return / Space on the Tooltip trigger
    // closes the tip; a pointer press already went through `pressStart`.
    hoverTrigger?.press();
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
    // A-003: the seam's edge sits where the render-prop `isPressed` sits —
    // after the `isBlocked` early return, before any user callback. The two
    // channels are parallel: a pending button produces neither.
    feedback.pressDown(event);
    isPressed.set(true);
    // Tooltip port sheet §5.3: React Aria closes on pointerdown, so a held
    // press hides the tip at once instead of waiting for the release.
    hoverTrigger?.pressStart();
    props.onPressStart?.(event);
    props.onPressDown?.(event);
    props.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    // A-003: the seam clears at the same point the render-prop state does —
    // release and cancel share `onPressUp` on NSH, so both take this path.
    feedback.pressUp(event);

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
    // Tooltip port sheet §5.3: before the disabled early return, as React Aria's
    // injected hover handler does not look at the Button's look either: a
    // disabled Button's tip explains why it is disabled.
    hoverTrigger?.hoverStart();
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
    hoverTrigger?.hoverEnd();
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
    // Tooltip port sheet §5.3: a view's focus only comes from Tab / `focus()`,
    // which is React Aria's `isFocusVisible()` for a tooltip trigger.
    hoverTrigger?.focusStart();
    props.onFocus?.();
  };

  const handleBlur = () => {
    isFocused.set(false);
    hoverTrigger?.focusEnd();
    props.onBlur?.();
  };

  // A-003: the seam needs the measured bounds for `hitSlop` and the scale
  // coefficient; the caller's `onLayout` keeps its payload and position.
  const handleLayout = (event: { bounds: Bounds }) => {
    feedback.layout(event);
    props.onLayout?.(event);
  };

  let node: ViewRef | undefined;
  const handleRef = (next: ViewRef) => {
    node = next;
    // The popover anchor and focus-return target (§5.2). The registration
    // hands back its cleanup, held by the same owner as ButtonGroup's.
    if (overlayTrigger) {
      cleanup(overlayTrigger.registerTrigger(next));
    }
    // Tooltip port sheet §5.3: the same Button can be both anchors at once; the
    // two registrations clean up independently.
    if (hoverTrigger) {
      cleanup(hoverTrigger.registerTrigger(next));
    }
    props.ref?.(next);
  };

  effect(() => {
    if (props.autoFocus) {
      node?.focus();
    }
  });

  if (group) {
    cleanup(group.registerItem(groupItem));
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
    <PressableFeedbackContext.Provider value={feedbackContextValue}>
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
        style={rootStyle()}
        // A-004: the seam's computed hitSlop is the only writer of this view
        // prop — components never set a literal and never take a hitSlop prop.
        hitSlop={feedback.hitSlop()}
        onPress={handlePress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        delayLongPress={props.delayLongPress}
        onLongPress={handleLongPress}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onLayout={handleLayout}
      >
        {/* A-005: children read `PressableFeedbackContext` — `props.children`
            is still read exactly once, inside the provider. The overlays are
            absolute `pointerEvents: none` layers, so they neither lay out nor
            take presses. The Provider wraps the root View outright (the same
            shape `PressableFeedback` uses): a Provider nested inside the root
            View leaves children outside its scope on the web host. */}
        <If when={highlightAnimation() !== undefined}>
          <PressableFeedback.Highlight animation={highlightAnimation()} />
        </If>
        <If when={rippleAnimation() !== undefined}>
          <PressableFeedback.Ripple animation={rippleAnimation()} />
        </If>
        {renderContent(props.children)}
      </View>
    </PressableFeedbackContext.Provider>
  );
}
