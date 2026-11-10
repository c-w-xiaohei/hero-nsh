import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  PressEvent,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, signal, split, untracked, View } from "nsh";

import { isKeyboardPress } from "../../primitives";
import { renderChildren } from "../list-box/children";
import { ComboBoxContext } from "./combo-box-context";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a trigger `children` function receives (React Aria's `ButtonRenderProps`
 * as HeroUI's trigger exposes it). `isPressed` is React Aria's ComboBox
 * trigger, which puts `state.isOpen` there (`ComboBox.tsx:314`), not the
 * instantaneous press; a ComboBox has no pending concept.
 */
export interface ComboBoxTriggerRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isPending: Accessor<boolean>;
}

export interface ComboBoxTriggerProps {
  /** The indicator; empty means HeroUI's chevron. */
  children?: JSX.Element | ((values: ComboBoxTriggerRenderProps) => JSX.Element);

  /** Appended after the trigger's own classes. */
  className?: string | ((values: ComboBoxTriggerRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ComboBoxTriggerRenderProps) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  /** The trigger refuses presses (the field's own state still applies). */
  isDisabled?: boolean;

  /** Accepted, no effect: the trigger is never a Tab stop (R-018). */
  autoFocus?: boolean;
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: NSH has no form submission. */
  type?: "button" | "submit" | "reset";
  form?: string;
  name?: string;
  value?: string;

  /** The press started, ended or changed; `onPress` toggles the list. */
  onPress?: (event: PressEvent) => void;
  onPressStart?: (event: PressEvent) => void;
  onPressUp?: (event: PressEvent) => void;
  onPressEnd?: (event: PressEvent) => void;
  onPressChange?: (isPressed: boolean) => void;
  onHoverStart?: (event: unknown) => void;
  onHoverEnd?: (event: unknown) => void;
  onHoverChange?: (isHovered: boolean) => void;

  /** The trigger itself took or lost the keyboard focus. */
  onFocus?: () => void;
  onBlur?: () => void;
  onFocusChange?: (isFocused: boolean) => void;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;

  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * ComboBox.Trigger / ComboBoxTrigger: the list's open control, pinned to the
 * inline end of the input group. Upstream it is a React Aria `Button` with
 * `excludeFromTabOrder: true` (`useComboBox.ts:513`), so it is never a Tab
 * stop; NSH gives it `focusable={false}`. It registers itself with the root so
 * the input can reserve its room (R-005, port sheet §2).
 */
export function ComboBoxTrigger(props: ComboBoxTriggerProps): JSX.Element {
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
    "onPressStart",
    "onPressUp",
    "onPressEnd",
    "onPressChange",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const combo = ComboBoxContext();

  if (!combo) {
    return null;
  }

  // R-005: the trigger's presence gives the input its inline-end room; the
  // registration replaces upstream's `:has(+ .combo-box__trigger)`.
  cleanup(combo.registerTrigger());

  const focused = signal(false);
  const hovered = signal(false);
  const pressed = signal(false);

  // Upstream the trigger is disabled by the field's `isDisabled` *or* its
  // `isReadOnly` (`useComboBox.ts:517`): a read-only field cannot open.
  const isDisabled = computed(
    () => local.isDisabled === true || combo.isDisabled() || combo.isReadOnly(),
  );

  // R-017: `data-pressed` is React Aria's `isPressed: state.isOpen`, so the
  // trigger stays dimmed while the list is open, not while the pointer is down.
  const isPressed = () => combo.isOpen();

  const renderProps: ComboBoxTriggerRenderProps = {
    isHovered: hovered,
    isPressed,
    isFocused: focused,
    isFocusVisible: () => focused() && combo.isKeyboard(),
    isDisabled,
    isPending: () => false,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function" ? className(renderProps) : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  const classes = computed(() =>
    [combo.slots().trigger(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-016: the keyboard focus ring, drawn only for the keyboard modality.
  // R-017: the open dimming. R-018: the disabled state, last so its 0.5
  // opacity outranks R-017's 0.7, as upstream's rule order does.
  const classList = computed(() => ({
    "rounded ring-2 ring-focus ring-offset-2 ring-offset-background outline-none":
      focused() && combo.isKeyboard(),
    "opacity-70": isPressed(),
    "cursor-not-allowed opacity-50": isDisabled(),
  }));

  const handlePress = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    // A keyboard activation (Return / Space reported as a press with the page
    // origin at 0,0) keeps the modality so the ring follows it.
    if (isKeyboardPress(event)) {
      combo.noteKeyboard();
    } else {
      combo.notePointer();
    }

    // Before the caller's `onPress`, as the internal toggle is the trigger's
    // own press action (React Aria's ComboBox trigger toggles in its
    // `onPressStart`, `useComboBox.ts:344-352`).
    combo.toggle();
    local.onPress?.(event);
  };

  const handlePressDown = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    if (!isKeyboardPress(event)) {
      combo.notePointer();
    }

    pressed.set(true);
    // Button's press phases (`button-root.tsx`): the start and the pressed
    // state belong to the press going down.
    local.onPressStart?.(event);
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

    // NSH reports the release as the press's last phase, so Button ends the
    // press here (`onPressUp` then `onPressEnd`).
    local.onPressUp?.(event);
    local.onPressEnd?.(event);
  };

  const handleMouseEnter = (event: unknown) => {
    hovered.set(true);
    local.onHoverStart?.(event);
    local.onHoverChange?.(true);
  };

  const handleMouseLeave = (event: unknown) => {
    hovered.set(false);
    local.onHoverEnd?.(event);
    local.onHoverChange?.(false);
  };

  const handleFocus = () => {
    focused.set(true);
    combo.noteKeyboard();
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    local.onFocusChange?.(false);
    local.onBlur?.();
  };

  // R-019 / R-020: the built-in chevron's box carries the size and the
  // transform transition, and only that box rotates while the list is open; a
  // caller's indicator is placed as it is, without either (upstream's rule
  // matches `[data-slot="combo-box-trigger-default-icon"]` only). Two bordered
  // edges of a rotated square draw the mark; NSH has no SVG icon of its own
  // here.
  const defaultIcon = () => (
    <View
      class={[
        combo.slots().triggerIcon(),
        "flex items-center justify-center",
        combo.isOpen() ? "rotate-180" : undefined,
      ]
        .filter((part): part is string => typeof part === "string")
        .join(" ")}
    >
      <View class="size-2 -translate-y-[1px] rotate-45 border-b-2 border-r-2 border-current" />
    </View>
  );

  // One read of `children`, at the placement (the trigger provides no context);
  // a one-parameter function is the render prop (D17).
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return untracked(() =>
        (children as (values: ComboBoxTriggerRenderProps) => JSX.Element)(
          renderProps,
        ),
      ) as JSX.Element;
    }

    if (children == null) {
      return defaultIcon();
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      role="button"
      // R-018: not a Tab stop, as upstream's `excludeFromTabOrder`.
      focusable={false}
      disabled={isDisabled()}
      accessibilityLabel={local.accessibilityLabel ?? local["aria-label"]}
      accessibilityHint={local.accessibilityHint}
      accessibilityState={{
        ...local.accessibilityState,
        expanded: combo.isOpen(),
        disabled: isDisabled(),
      }}
      class={classes()}
      classList={classList()}
      style={resolvedStyle()}
      onPress={handlePress}
      onPressDown={handlePressDown}
      onPressUp={handlePressUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
