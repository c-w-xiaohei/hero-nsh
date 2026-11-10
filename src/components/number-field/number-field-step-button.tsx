import type {
  Accessor,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, reduceMotion, signal, split, View } from "nsh";

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

/** How long a press must be held before the value starts repeating. */
const HOLD_DELAY = 400;

/** The gap between repeats once the hold started. */
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
      "ref",
    ] as const);

    // Read once in the body; every handler closes over this value.
    const field = NumberFieldContext();

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
      schedule(HOLD_DELAY);
    };

    // The timer belongs to the component: unmounting a held button must not
    // leave it stepping a field that no longer exists.
    cleanup(clearHold);

    // --- Events ------------------------------------------------------------
    const handlePressDown = (event: PressEvent) => {
      // RAC's `onButtonPressStart`: the press steps first, then moves the focus
      // to the input, so the keyboard keeps working after a click. `PressEvent`
      // has no `pointerType`, so the touch half (600 ms, no immediate step) is
      // not reachable (port sheet §8).
      step();
      startHold();
      pressed.set(true);
      field?.focusInput();
      local.onPressDown?.(event);
      local.onPressStart?.(event);
      local.onPressChange?.(true);
    };

    const handlePressUp = (event: PressEvent) => {
      clearHold();
      pressed.set(false);
      local.onPressUp?.(event);
      local.onPressEnd?.(event);
      local.onPressChange?.(false);
    };

    const handlePress = (event: PressEvent) => {
      // The value already moved on press-down; this is the caller's hook only.
      local.onPress?.(event);
    };

    const handleMouseEnter = (event: NshMouseEvent) => {
      local.onMouseEnter?.(event);

      if (isDisabled() || hovered()) {
        return;
      }

      hovered.set(true);
      local.onHoverStart?.(event);
      local.onHoverChange?.(true);
    };

    const handleMouseLeave = (event: NshMouseEvent) => {
      local.onMouseLeave?.(event);

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
    const style = computed<StyleProp<ViewStyle>>(() => [
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

    // --- Content -----------------------------------------------------------
    const children = computed(() => local.children);

    const content = computed(() => {
      const child = children();

      if (child != null) {
        return renderChildren(child);
      }

      // R-030: `.number-field__*-button [data-slot="…-button-icon"] { size-4 }`.
      // The descendant selector becomes the default icon's construction; the
      // icons already carry `h-4 w-4`, and a caller's custom icon is untouched.
      return isIncrement ? <IconPlus /> : <IconMinus />;
    });

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
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onPress={handlePress}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content()}
      </View>
    );
  };
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
