import type {
  Accessor,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  cleanup,
  computed,
  createAnimatedValue,
  reduceMotion,
  signal,
  split,
  View,
} from "nsh";

import { createInput } from "../../primitives/environment";
import {
  createPressFeedback,
  PressableFeedbackContext,
  type PressableFeedbackContextValue,
} from "../../primitives/pressable";
import { IconMinus, IconPlus } from "../icons";
import { joinClassNames } from "./class-names";
import { NumberFieldContext } from "./context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./number-field-dom-props";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The values HeroUI's step buttons hand to their render props (React Aria's
 * `ButtonRenderProps`), as accessors per D17. A step button is not a focus stop
 * and never shows pending work, so `isFocused` / `isFocusVisible` / `isPending`
 * stay false (port sheet §1.5).
 */
export interface NumberFieldStepButtonRenderProps {
  /** A pointer rests on the button. */
  isHovered: Accessor<boolean>;

  /** The button is being pressed. */
  isPressed: Accessor<boolean>;

  /** Always false: step buttons are outside the Tab order. */
  isFocused: Accessor<boolean>;

  /** Always false, as `isFocused`. */
  isFocusVisible: Accessor<boolean>;

  /** The effective disabled state: the prop, the bound, or the field. */
  isDisabled: Accessor<boolean>;

  /** Always false: a number field never shows a pending button. */
  isPending: Accessor<boolean>;
}

/* -------------------------------------------------------------------------------------------------
 * Button props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `NumberField.IncrementButton` / `NumberField.DecrementButton`:
 * HeroUI 3.2.7's `NumberFieldIncrementButtonProps` / `...DecrementButtonProps`,
 * which are React Aria Components' `Button` (`ButtonProps`), expressed with
 * NSH's view host props.
 *
 * Both buttons accept the same members; they differ only in the default icon,
 * default accessible name, bound and separator side.
 */
export interface NumberFieldStepButtonProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role" | "disabled">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** A custom icon; without it the button shows the default plus / minus. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. Function form gets the same accessors. */
  className?:
    | string
    | ((values: NumberFieldStepButtonRenderProps) => string | undefined);

  /** Style of the button; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: NumberFieldStepButtonRenderProps) => StyleProp<ViewStyle>);

  /** Disables this button; wins over the bound and the field's state. */
  isDisabled?: boolean;

  /** The button was pressed: the step already happened before this runs. */
  onPress?: (event: PressEvent) => void;

  /** The press went down: the step already happened before this runs. */
  onPressStart?: (event: PressEvent) => void;

  /** The press ended. */
  onPressUp?: (event: PressEvent) => void;

  /** The press ended, after `onPressUp`. */
  onPressEnd?: (event: PressEvent) => void;

  /** Both press transitions, as React Aria's `usePress` reports them. */
  onPressChange?: (isPressed: boolean) => void;

  /** The accessible name; `Increase <label>` / `Decrease <label>` by default. */
  "aria-label"?: string;

  /** The accessible name through the host prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** Accepted, no effect: the button is always outside the Tab order here. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: a pointer press does not focus a view in NSH. */
  preventFocusOnPress?: boolean;

  /** Accepted, no effect: a disabled view never takes the focus. */
  allowFocusWhenDisabled?: boolean;

  /** Whether the button is a Tab stop; `false` by default, as upstream's `excludeFromTabOrder`. */
  focusable?: boolean;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to; below `id`. */
  nativeID?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** HTML button attributes with no NSH counterpart at all. */
  type?: string;
  form?: string;
  autoFocus?: boolean;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;
  name?: string;
  value?: string;

  /** The pointer entered the button (off while disabled). */
  onHoverStart?: (e: NshMouseEvent) => void;

  /** The pointer left the button. */
  onHoverEnd?: (e: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** The button's view, forwarded as a callback. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Hold-to-repeat timings (React Aria's `useSpinButton`)
 * -----------------------------------------------------------------------------------------------*/

/**
 * How long a press must be held before the value starts repeating, per
 * `Environment.input` (A-006): RAC's `useSpinButton` keeps 400 ms on the
 * pointer half and widens the first repeat to 600 ms on the touch half.
 * `PressEvent` carries no `pointerType`, so the axis picks the delay for the
 * whole environment — a touch screen that also has a trackpad mounts
 * `EnvironmentScope` to split them.
 */
const HOLD_DELAY_POINTER = 400;
const HOLD_DELAY_TOUCH = 600;

/** The gap between repeats once the hold started; the same on both inputs. */
const HOLD_REPEAT = 60;

/* -------------------------------------------------------------------------------------------------
 * The shared button
 * -----------------------------------------------------------------------------------------------*/

type StepDirection = "increment" | "decrement";

/**
 * Creates one of the two step buttons. They are one implementation because
 * every behaviour is mirrored: an immediate step on press-down, the 400 / 60 ms
 * hold repeat, the focus hand-off to the input, and the press / hover render
 * props. Only the direction, the slot, the default icon and the default
 * accessible name differ.
 *
 * A step button is a real `View role="button"`, not nsh/base's `Button`: NSH's
 * button has no way to leave the Tab order, and upstream's step buttons are
 * `excludeFromTabOrder` (port sheet §3, B1 … B4).
 */
function createStepButton(direction: StepDirection) {
  const isIncrement = direction === "increment";

  return function NumberFieldStepButton(props: NumberFieldStepButtonProps): JSX.Element {
    const [local, rest] = split(props, [
      "children",
      "className",
      "style",
      "isDisabled",
      "onPress",
      "onPressStart",
      "onPressUp",
      "onPressEnd",
      "onPressChange",
      "aria-label",
      "accessibilityLabel",
      "excludeFromTabOrder",
      "preventFocusOnPress",
      "allowFocusWhenDisabled",
      "focusable",
      "id",
      "nativeID",
      "slot",
      "render",
      "type",
      "form",
      "autoFocus",
      "formAction",
      "formEncType",
      "formMethod",
      "formNoValidate",
      "formTarget",
      "name",
      "value",
      "onHoverStart",
      "onHoverEnd",
      "onHoverChange",
      "onMouseEnter",
      "onMouseLeave",
      "onPressDown",
      "onLayout",
      "ref",
    ] as const);

    // Read once in the body; every handler closes over this value.
    const field = NumberFieldContext();

    // A-002 / A-006: the `input` axis — the field's accessor inside a root,
    // the environment's own for a standalone button. It gates the seam below,
    // the hover writes and the hold's first-repeat delay.
    const envInput = createInput();
    const input = () => field?.input() ?? envInput();

    // --- Registration (R-009 / R-010) --------------------------------------
    // Stands in for `:has([slot="increment"])` / `:has([slot="decrement"])`:
    // the group's column template follows these counts. `:has()` also only
    // answers "is one there", so registration order never matters.
    const register = isIncrement ? field?.registerIncrement : field?.registerDecrement;

    if (register) {
      cleanup(register());
    }

    // --- State -------------------------------------------------------------
    const canStep = computed(() =>
      isIncrement ? (field?.canIncrement() ?? true) : (field?.canDecrement() ?? true),
    );

    const isDisabled = computed(() => local.isDisabled ?? !canStep());

    const hovered = signal(false);
    const pressed = signal(false);

    // --- Touch press feedback (A-004) ---------------------------------------
    // The seam's gate: `input() === "touch"` and not disabled. Under the
    // default pointer environment `enabled` rests — `pressDown`/`pressUp` only
    // forward, `hitSlop()` answers `undefined` and `scale` stays 1, so the
    // desktop chain is byte-for-byte the old one. `ignoreScaleCoefficient`
    // keeps the 0.97 press flat rather than narrowing it by the button's
    // 44 px width, matching upstream's `active:scale-[0.97]` (sheet §8
    // registers the literal-vs-coefficient choice).
    const feedbackGate = () => input() === "touch" && !isDisabled();
    const feedback = createPressFeedback({
      enabled: feedbackGate,
      animation: { value: 0.97, ignoreScaleCoefficient: true },
    });

    // The seam's read half for probes and overlay parts (the A-012 fixture
    // probes mount `StepButtonProbe` here): the provider wraps the button's
    // children so a probe mounted there sees the live channels
    // instead of `RESTING_PRESS_FEEDBACK` (pagination's carrier). No
    // Highlight / Ripple mounts by default.
    const feedbackValue: PressableFeedbackContextValue = {
      isPressed: feedback.isPressed,
      pressed: feedback.pressed,
      bounds: feedback.bounds,
      pressOrigin: feedback.pressOrigin,
      scale: feedback.scale,
      highlightOpacity: createAnimatedValue(0),
      rippleProgress: createAnimatedValue(0),
      enabled: feedbackGate,
      hitSlop: feedback.hitSlop,
      isAllAnimationsDisabled: () => false,
    };

    // --- Hold repeat -------------------------------------------------------
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const clearHold = () => {
      if (holdTimer !== undefined) {
        clearTimeout(holdTimer);
        holdTimer = undefined;
      }
    };

    const step = () => {
      if (isDisabled()) {
        return;
      }

      if (isIncrement) {
        field?.increment();
      } else {
        field?.decrement();
      }
    };

    const schedule = (delay: number) => {
      holdTimer = setTimeout(() => {
        holdTimer = undefined;

        if (!pressed() || isDisabled()) {
          return;
        }

        step();
        schedule(HOLD_REPEAT);
      }, delay);
    };

    const startHold = () => {
      clearHold();
      // A-006: the first repeat's delay follows the axis — touch widens the
      // window so a scroll intent or a fat-finger hold does not step
      // immediately; the cadence afterwards is one `HOLD_REPEAT` on both.
      schedule(input() === "touch" ? HOLD_DELAY_TOUCH : HOLD_DELAY_POINTER);
    };

    // The timer belongs to the component: unmounting a held button must not
    // leave it stepping a field that no longer exists. Web pages also die
    // between `open()` calls without an unmount, so a timer bound here can
    // never outlive its page.
    cleanup(clearHold);

    // --- Events ------------------------------------------------------------
    const handlePressDown = (event: PressEvent) => {
      // RAC's `onButtonPressStart`: the press steps first, then moves the focus
      // to the input, so the keyboard keeps working after a click. `PressEvent`
      // has no `pointerType`, so RAC's per-event touch half is picked by the
      // environment instead: the first-repeat delay widens on touch while the
      // press-down step stays (sheet §8 / A-006).
      step();
      startHold();
      pressed.set(true);
      field?.focusInput();
      // A-004: the seam hears the press after the button's own state settled,
      // before the caller's callbacks — gated, it records nothing.
      feedback.pressDown(event);
      local.onPressDown?.(event);
      local.onPressStart?.(event);
      local.onPressChange?.(true);
    };

    const handlePressUp = (event: PressEvent) => {
      clearHold();
      // A-004: release and cancel share `onPressUp`; the seam unwinds before
      // the callers hear the end (sheet §2 A-004's chain-head placement).
      feedback.pressUp(event);
      pressed.set(false);
      local.onPressUp?.(event);
      local.onPressEnd?.(event);
      local.onPressChange?.(false);
    };

    const handlePress = (event: PressEvent) => {
      // The value already moved on press-down; this is the caller's hook only.
      local.onPress?.(event);
    };

    // A-004: `bounds` feeds `hitSlop` and `scale`, so the seam reads the
    // layout before the caller's `onLayout`, which stays last.
    const handleLayout = (event: { bounds: Bounds }) => {
      feedback.layout(event);
      local.onLayout?.(event);
    };

    const handleMouseEnter = (event: NshMouseEvent) => {
      local.onMouseEnter?.(event);

      // A-005: under touch the hover state and the `onHover*` callbacks stay
      // off entirely; the host's own `onMouseEnter` still forwards.
      if (input() === "touch") {
        return;
      }

      if (isDisabled() || hovered()) {
        return;
      }

      hovered.set(true);
      local.onHoverStart?.(event);
      local.onHoverChange?.(true);
    };

    const handleMouseLeave = (event: NshMouseEvent) => {
      local.onMouseLeave?.(event);

      if (input() === "touch") {
        return;
      }

      if (!hovered()) {
        return;
      }

      hovered.set(false);
      local.onHoverEnd?.(event);
      local.onHoverChange?.(false);
    };

    // --- Render props and classes -----------------------------------------
    const never = () => false;

    const renderProps: NumberFieldStepButtonRenderProps = {
      isHovered: hovered,
      isPressed: pressed,
      isFocused: never,
      isFocusVisible: never,
      isDisabled,
      isPending: never,
    };

    const resolvedClassName = () => {
      const value = local.className;

      return typeof value === "function" ? value(renderProps) : value;
    };

    const resolvedStyle = () => {
      const value = local.style;

      return typeof value === "function" ? value(renderProps) : value;
    };

    // R-025 / R-026: the transitioned properties upstream
    // (`background-color 150ms, border-color 150ms`), as an inline list; the
    // class carries the duration and curve, reduced motion turns the list off.
    // A-004: `scale` owns the transform channel under touch and rests at 1
    // under pointer — the `input` axis keeps `active:scale-*` out of the
    // touch class output, so nothing else writes the same property.
    const style = computed<StyleProp<ViewStyle>>(() => [
      { scale: feedback.scale },
      {
        transitionProperty: reduceMotion() ? "none" : "background-color, border-color",
      },
      resolvedStyle(),
    ]);

    const classes = computed(() =>
      joinClassNames(
        isIncrement ? field?.slots.incrementButton() : field?.slots.decrementButton(),
        resolvedClassName(),
      ),
    );

    const accessibilityLabel = computed(
      () =>
        local["aria-label"] ??
        local.accessibilityLabel ??
        (isIncrement ? field?.incrementAriaLabel() : field?.decrementAriaLabel()),
    );

    return (
      <View
        {...hostProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        role="button"
        accessibilityLabel={accessibilityLabel()}
        // R-029: `status-disabled` → the literal opacity and cursor; the
        // disabled view itself carries the `pointer-events` half and the
        // accessibility state.
        class={classes()}
        classList={{
          "opacity-50 cursor-not-allowed": isDisabled(),
        }}
        style={style()}
        disabled={isDisabled()}
        // Upstream forces `excludeFromTabOrder`: a step button is reachable by
        // the pointer and by assistive technologies, never by Tab.
        focusable={local.focusable ?? false}
        // A-004: the view-prop half of the hit area — the seam's computed
        // slop, `undefined` while gated off or while the 44 pt column already
        // fills the target. The button never sets a literal and never grows
        // one as a prop.
        hitSlop={feedback.hitSlop()}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onPress={handlePress}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onLayout={handleLayout}
      >
        {/* A-004: a `PressableFeedbackContext` probe inside the button reads
            the live channels. The content half renders as its own component
            under the provider — resolving `props.children` in this body would
            bind the children to this scope, above the provider (pagination's
            carrier pattern). */}
        <PressableFeedbackContext.Provider value={feedbackValue}>
          <StepButtonContent isIncrement={isIncrement}>
            {local.children}
          </StepButtonContent>
        </PressableFeedbackContext.Provider>
      </View>
    );
  };
}

/**
 * The children half of a step button, mounted inside
 * `PressableFeedbackContext.Provider`. `props.children` is a lazy accessor:
 * whichever component invokes it owns the scope its descendants are created
 * in. Resolving it here — under the provider — is what lets a child reading
 * `PressableFeedbackContext` (a seam probe, a `PressableFeedback.Scale` /
 * `Highlight` / `Ripple` overlay part) see the live seam value instead of
 * `RESTING_PRESS_FEEDBACK`; resolving it in the button's own scope, above the
 * provider, binds every child to the default (A-004).
 */
function StepButtonContent(props: {
  children?: JSX.Element;
  isIncrement: boolean;
}): JSX.Element {
  // The single read of the part's `props.children`, through a computed,
  // rendered at the placement so a signal inside a child keeps updating.
  const children = computed(() => props.children);

  const child = children();

  if (child != null) {
    return renderChildren(child);
  }

  // R-030: `.number-field__*-button [data-slot="…-button-icon"] { size-4 }`.
  // The descendant selector becomes the default icon's construction; the
  // icons already carry `h-4 w-4`, and a caller's custom icon is untouched.
  return props.isIncrement ? <IconPlus /> : <IconMinus />;
}

/* -------------------------------------------------------------------------------------------------
 * Increment / Decrement
 * -----------------------------------------------------------------------------------------------*/

/** The button that steps the value up (R-031) and repeats while held. */
export const NumberFieldIncrementButton = createStepButton("increment");

/** The button that steps the value down (R-032) and repeats while held. */
export const NumberFieldDecrementButton = createStepButton("decrement");

/* -------------------------------------------------------------------------------------------------
 * HeroUI's per-button prop names
 * -----------------------------------------------------------------------------------------------*/

/** HeroUI's name for the increment button's props; the two buttons take the same members. */
export type NumberFieldIncrementButtonProps = NumberFieldStepButtonProps;

/** HeroUI's name for the decrement button's props; the two buttons take the same members. */
export type NumberFieldDecrementButtonProps = NumberFieldStepButtonProps;
