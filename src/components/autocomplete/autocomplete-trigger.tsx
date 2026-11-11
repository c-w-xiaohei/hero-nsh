import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  cleanup,
  computed,
  effect,
  reduceMotion,
  signal,
  split,
  View,
} from "nsh";

import { isKeyboardPress, OverlayTriggerContext } from "../../primitives";
import { renderChildren } from "../list-box/children";
import {
  AutocompleteContext,
  AutocompleteTriggerContext,
  type AutocompleteTriggerContextValue,
} from "./autocomplete-context";

/**
 * What a trigger `children` function receives: React Aria's
 * `ButtonRenderProps`. Every flag is an accessor (D17); `isPending` is always
 * `false`, since an Autocomplete has no pending state.
 */
export interface AutocompleteTriggerRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPending: Accessor<boolean>;
}

/** The props of `Autocomplete.Trigger`: React Aria's `Group` plus `isDisabled`. */
export interface AutocompleteTriggerProps {
  /** The trigger's content, or a render prop called once with accessors. */
  children?: JSX.Element | ((values: AutocompleteTriggerRenderProps) => JSX.Element);

  /** Appended after the variant classes; function form gets the same accessors. */
  className?: string | ((values: AutocompleteTriggerRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: AutocompleteTriggerRenderProps) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  /** Overrides the root's `isDisabled`; the clear button reads this value. */
  isDisabled?: boolean;

  /** Focuses the trigger after mount (macOS and the web). */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH has no tab index, only `focusable`. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: there is no form button to submit. */
  type?: "button" | "submit" | "reset";
  form?: string;
  name?: string;
  value?: string;

  /** The trigger was pressed (a pointer, Return or Space; it opens or closes). */
  onPress?: (e: PressEvent) => void;

  onPressDown?: (e: PressEvent) => void;
  onPressUp?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  onLongPress?: (e: PressEvent) => void;

  onMouseEnter?: (e: NshMouseEvent) => void;
  onMouseLeave?: (e: NshMouseEvent) => void;
  onHoverStart?: (e: NshMouseEvent) => void;
  onHoverEnd?: (e: NshMouseEvent) => void;
  onHoverChange?: (isHovered: boolean) => void;

  onFocus?: () => void;
  onBlur?: () => void;
  onFocusChange?: (isFocused: boolean) => void;

  /** A DOM click upstream; a press here. */
  onClick?: (e: PressEvent) => void;

  /** A DOM key event upstream; keys arrive through `keymap` here. */
  onKeyDown?: unknown;
  onKeyUp?: unknown;

  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;

  /** Accepted, no effect: NSH has one kind of host element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Autocomplete.Trigger / AutocompleteTrigger: HeroUI's `Group` (a plain `div`
 * with `onClick`), the field's visible box. It holds the Value, the optional
 * ClearButton and the Indicator, opens and closes the popover, and is the
 * overlay's anchor and focus-return target. It is also the field's Tab stop:
 * the popover unmounts while closed, so the search input cannot be one, and
 * `Label`'s press asks the trigger to take the focus (`focusTrigger`).
 */
export function AutocompleteTrigger(
  props: AutocompleteTriggerProps,
): JSX.Element | null {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "isDisabled",
    "autoFocus",
    "excludeFromTabOrder",
    "type",
    "form",
    "name",
    "value",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onPressStart",
    "onPressEnd",
    "onPressChange",
    "onLongPress",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onClick",
    "onKeyDown",
    "onKeyUp",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "elementType",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const autocomplete = AutocompleteContext();

  if (!autocomplete) {
    return null;
  }

  const overlay = OverlayTriggerContext();

  // The trigger's own `isDisabled` wins over the root's, as upstream
  // (`isDisabledProp ?? rootDisabled ?? false`); the clear button reads the
  // same resolved value through the trigger context.
  const isDisabled = () => local.isDisabled ?? autocomplete.isDisabled();
  const isOpen = autocomplete.isOpen;

  const hovered = signal(false);
  const pressed = signal(false);
  const focused = signal(false);
  // R-006: upstream's `:hover:not(:has(.autocomplete__clear-button:hover))`
  // suppresses the trigger's hover while the clear button holds the pointer.
  // NSH has no `:has`, so the clear button reports its own hover here.
  const clearHovered = signal(false);
  // R-005: `:has(.autocomplete__indicator)` is a presence test, so indicators
  // are counted: two of them must not switch the padding off when one leaves.
  const indicatorCount = signal(0);
  const hasIndicator = computed(() => indicatorCount() > 0);

  // R-007: `:focus-visible` is `focused` plus the keyboard modality; a pointer
  // press does not focus a view here, so a focused trigger is a Tab arrived one.
  const isFocusVisible = computed(
    () => focused() && autocomplete.isKeyboard(),
  );

  const renderProps: AutocompleteTriggerRenderProps = {
    isHovered: hovered,
    isPressed: pressed,
    isFocused: focused,
    isFocusVisible,
    isDisabled,
    isPending: () => false,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  const classes = computed(() =>
    [autocomplete.slots().trigger(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  // R-003: background, border and shadow at 150ms `--ease-smooth`. The property
  // list is the one inline owner (NSH's `transition-colors` omits the shadow and
  // `transition-all` adds radius and border width); reduced motion transitions
  // nothing, as the slot's `motion-reduce:transition-none` says.
  const transitionProperty = () =>
    reduceMotion() ? "none" : "background-color, border-color, box-shadow";

  const classList = computed(() => {
    const list: Record<string, boolean> = {};

    // R-005: the inline-end room the Indicator needs, while one is mounted.
    if (hasIndicator()) {
      list["pe-7"] = true;
    }

    // R-006: the hover background and border, unless the clear button holds the
    // pointer. `border-0` keeps the colour invisible, as upstream's resting
    // field border width of 0 does.
    if (hovered() && !clearHovered()) {
      list["bg-field-hover border-field-border-hover"] = true;
    }

    // R-007: `status-focused`. The utility rings with a 2pt page-coloured
    // offset and paints the field-focus background. NSH joins the class string
    // and the classList in that order, so these win over the slot's own
    // background and border.
    if (isFocusVisible()) {
      list["ring-2 ring-focus ring-offset-2 ring-offset-background outline-none border-field-border-focus bg-field-focus"] = true;
    }

    // R-008: `status-invalid-field`. Its ring sets `--tw-ring-offset-width: 0`,
    // so the focused branch forces `ring-offset-0` over R-007's offset; the
    // resting branch draws the 1pt invalid outline. Both take the field-focus
    // background, as upstream's `.autocomplete[data-invalid] &` block does.
    if (autocomplete.isInvalid()) {
      if (focused()) {
        list["ring-2 ring-danger ring-offset-0 outline-none bg-field-focus"] = true;
      } else {
        list["outline outline-1 outline-danger bg-field-focus"] = true;
      }
    }

    // R-011: the secondary variant keeps the default token as its background in
    // every state, and uses the default hover token while hovered (the three
    // `--autocomplete-trigger-bg*` variables). It comes after the primary
    // states, as the later block of `autocomplete.css` does, so it wins.
    if (autocomplete.variant() === "secondary") {
      if (hovered() && !clearHovered()) {
        list["bg-default-hover"] = true;
      }

      if (isFocusVisible() || autocomplete.isInvalid()) {
        list["bg-default"] = true;
      }
    }

    // R-009: `status-disabled` as literals (theme notes): 0.5 opacity, the
    // not-allowed cursor and no pointer target.
    if (isDisabled()) {
      list["opacity-50 cursor-not-allowed pointer-events-none"] = true;
    }

    return list;
  });

  /* -------------------------------------------------------------------------------------------
   * Presses
   * ----------------------------------------------------------------------------------------- */
  const notePress = (event?: PressEvent) => {
    if (event && !isKeyboardPress(event)) {
      autocomplete.notePointer();
    } else {
      autocomplete.noteKeyboard();
    }
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);
    pressed.set(true);
    local.onPressStart?.(event);
    local.onPressDown?.(event);
    local.onPressChange?.(true);
  };

  const handlePressUp = (event: PressEvent) => {
    if (pressed()) {
      pressed.set(false);
      local.onPressChange?.(false);
    }

    if (isDisabled()) {
      return;
    }

    local.onPressUp?.(event);
    local.onPressEnd?.(event);
  };

  const handlePress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    notePress(event);

    // HeroUI's `handleClick`: the caller's callback first, then
    // `state.toggle()`. That call carries no focus strategy, so the popover
    // keeps the selected option's highlight instead of jumping to an end.
    local.onPress?.(event);
    local.onClick?.(event);

    autocomplete.toggle();
  };

  const handleLongPress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    local.onLongPress?.(event);
  };

  /* -------------------------------------------------------------------------------------------
   * Hover
   * ----------------------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------------------------
   * Focus: the field's own focus state lives in the root; the trigger reports
   * its half of it (`triggerFocused` drives the root's `isFocused`).
   * ----------------------------------------------------------------------------------------- */
  // The root's `isFocused` joins the trigger's and the input's focus, but the
  // context exposes `triggerFocused` only as a reader (core gap, parts notes):
  // the trigger reports its local focus and the ring, while the field-level
  // state follows the search input.
  const handleFocus = () => {
    focused.set(true);
    autocomplete.noteFocus();
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    local.onFocusChange?.(false);
    local.onBlur?.();
  };

  /* -------------------------------------------------------------------------------------------
   * Registration: the overlay's anchor / focus-return target, and the context
   * the Indicator and the ClearButton read.
   * ----------------------------------------------------------------------------------------- */
  let node: ViewRef | undefined;
  let unregisterTrigger: (() => void) | undefined;

  cleanup(() => unregisterTrigger?.());

  const registerTrigger = (next: ViewRef | undefined) => {
    unregisterTrigger?.();
    unregisterTrigger = next ? overlay?.registerTrigger(next) : undefined;
  };

  const triggerContext: AutocompleteTriggerContextValue = {
    isDisabled,
    registerIndicator: () => {
      indicatorCount.update((count) => count + 1);

      return () => indicatorCount.update((count) => count - 1);
    },
    hasIndicator,
    setClearHovered: (isHovered) => clearHovered.set(isHovered),
    isClearHovered: clearHovered,
  };

  let didAutoFocus = false;

  effect(() => {
    if (didAutoFocus || !local.autoFocus) {
      return;
    }

    didAutoFocus = true;
    node?.focus();
  });

  // A press inside the ClearButton does not reach this view: NSH gives a press
  // to the deepest responder that claims it, while HeroUI checks
  // `clearButtonRef.current.contains(e.target)` before toggling. The clear
  // button's own press never bubbles up here, so that check has no counterpart.
  const content = () => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        (children as (values: AutocompleteTriggerRenderProps) => JSX.Element)(
          renderProps,
        ),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <AutocompleteTriggerContext.Provider value={triggerContext}>
      <View
        {...rest}
        ref={(next) => {
          node = next;
          registerTrigger(next);
          local.ref?.(next);
        }}
        testID={local.testID}
        nativeID={local.id ?? local.nativeID}
        tooltip={local.tooltip}
        role="button"
        // The field's Tab stop while the popover is closed; a disabled trigger
        // neither takes the focus nor activates.
        focusable={!isDisabled()}
        disabled={isDisabled()}
        accessibilityLabel={
          local["aria-label"] ??
          local.accessibilityLabel ??
          autocomplete.ariaLabel() ??
          autocomplete.labelText()
        }
        // The stand-in for upstream's `aria-describedby`: the registered
        // Description and FieldError texts join into one hint.
        accessibilityHint={
          local.accessibilityHint ??
          (() => {
            const hint = [
              autocomplete.descriptionText(),
              autocomplete.errorText(),
            ]
              .filter(
                (part): part is string =>
                  typeof part === "string" && part.length > 0,
              )
              .join(" ");

            return hint.length > 0 ? hint : undefined;
          })()
        }
        accessibilityState={{
          ...local.accessibilityState,
          // React Aria's `aria-expanded` on the trigger; `aria-haspopup` and
          // `aria-controls` have no NSH channel (port sheet §8).
          expanded: isOpen(),
        }}
        class={classes()}
        classList={classList()}
        style={[resolvedStyle(), { transitionProperty: transitionProperty() }]}
        onPress={handlePress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onLongPress={handleLongPress}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onLayout={local.onLayout}
      >
        {content()}
      </View>
    </AutocompleteTriggerContext.Provider>
  );
}
