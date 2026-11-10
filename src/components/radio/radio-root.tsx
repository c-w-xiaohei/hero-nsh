import type {
  Bounds,
  JSX,
  PressEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, effect, signal, split, untracked, View } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { DescriptionContext } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import { FieldContext } from "../label/context";
import type { RadioGroupVariant } from "../radio-group/radio-group.styles";
import type { RadioFieldRenderProps, RadioPressHandlers } from "./radio-context";
import {
  FALLBACK_RADIO_ITEM_CONTEXT,
  RadioGroupContext,
  RadioItemContext,
  type RadioItemContextValue,
} from "./radio-context";
import { radioVariants } from "./radio.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

export type { RadioButtonRenderProps, RadioFieldRenderProps } from "./radio-context";

/* -------------------------------------------------------------------------------------------------
 * Radio Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Radio.Root` / `Radio`: HeroUI 3.2.7's `RadioRootProps`, which is
 * React Aria Components' `RadioField` (a role-less field root that owns the
 * item's Label / Description / FieldError contexts) plus every DOM member HeroUI
 * accepts there.
 *
 * The field contexts are provided at this level because HeroUI keeps
 * `Description` / `FieldError` as siblings of `Radio.Content`; the value itself
 * belongs to the group (port sheet §2).
 */
export interface RadioRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  /**
   * The field's content: an element, or a render prop called once with the
   * field state (D17). Bare strings inside it become `Text` at the placement.
   */
  children?: JSX.Element | ((values: RadioFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: RadioFieldRenderProps) => string | undefined);

  /** Style of the field root; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: RadioFieldRenderProps) => StyleProp<ViewStyle>);

  /** The item's value inside its group; the group compares it with its selection. */
  value: string;

  /** Blocks this item's interaction and dims its field. */
  isDisabled?: boolean;

  /** Focuses the clickable face after it mounts (macOS / web only). */
  autoFocus?: boolean;

  /**
   * A user press on the radio, pointer or keyboard. React Aria hands the field
   * root these `PressEvents`; NSH fires them from the Content (the pressable
   * face) and from a `Label` inside it.
   */
  onPress?: (e: PressEvent) => void;

  /** The press began. */
  onPressStart?: (e: PressEvent) => void;

  /** The press ended. */
  onPressEnd?: (e: PressEvent) => void;

  /** Every press-start / press-end transition, as `usePress` reports it. */
  onPressChange?: (isPressed: boolean) => void;

  /** The press was released over the radio. */
  onPressUp?: (e: PressEvent) => void;

  /** A completed activation. NSH has no DOM `click`, so this follows `onPress`. */
  onClick?: (e: PressEvent) => void;

  /** The clickable face took the focus. */
  onFocus?: () => void;

  /** The clickable face lost the focus; validation does not commit here. */
  onBlur?: () => void;

  /** Both focus transitions of the clickable face. */
  onFocusChange?: (isFocused: boolean) => void;

  /**
   * Accepted, no effect. `RadioRootProps` does not carry these upstream either:
   * the item takes both from its group (`radio.tsx:8`, RAC's `RadioField`).
   */
  isInvalid?: boolean;

  /** Accepted, no effect; the item takes `required` from its group. */
  isRequired?: boolean;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no DOM form ownership. */
  form?: string;

  /** Accepted, no effect: there is no hidden `<input>` to point at. */
  inputRef?: unknown;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has one kind of host element. */
  elementType?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Names the clickable face; it wins over the text a `Label` inside registers. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-errormessage"?: string;

  /** An identifier for UI tests, on the field root. */
  testID?: string;

  /** The name other elements refer to; also set by `id`. */
  nativeID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** A hint shown while the pointer rests on the field root. */
  tooltip?: JSX.Element;

  /** The field root was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** The field root's view. */
  ref?: (node: ViewRef) => void;

  /** NSH's accessible name for the field root; `aria-label` names the control instead. */
  accessibilityLabel?: string;

  /** Hides the field root and its subtree from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no keydown on a view; the group handles the arrows. */
  onKeyDown?: unknown;

  /** Accepted, no effect: NSH has no keyup on a view. */
  onKeyUp?: unknown;
}

function joinRegistered(values: readonly (() => string | undefined)[]): string | undefined {
  const text = values
    .map((value) => value())
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/**
 * `Radio.Root` / `RadioRoot`: the item's field root. It reads its value and
 * flags from the group, registers itself in the group's collection (for the
 * arrow keys and the single tab stop), owns the item's interaction signals and
 * provides the three field contexts plus the item context (port sheet §2).
 *
 * It is built on the core `View`, not on nsh/base `Radio`: that component is a
 * tab stop outside its own group and carries no read-only or invalid state, so
 * the group's roving tab stop and the Control's invalid look cannot be built on
 * it (port sheet §3, criteria B3 / B4).
 */
export function RadioRoot(props: RadioRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "value",
    "isDisabled",
    "isInvalid",
    "isRequired",
    "autoFocus",
    "onPress",
    "onPressStart",
    "onPressEnd",
    "onPressChange",
    "onPressUp",
    "onClick",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "name",
    "form",
    "inputRef",
    "render",
    "elementType",
    "slot",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "testID",
    "nativeID",
    "id",
    "tooltip",
    "onLayout",
    "ref",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "onKeyDown",
    "onKeyUp",
  ] as const);

  // Read once, in the body: the group this item lives in (port sheet §2). There
  // is no context in NSH's event handlers, so every closure below keeps this
  // one value; membership is fixed for the instance's life.
  const group = RadioGroupContext();

  // --- State derived from the group ------------------------------------------
  const value = computed(() => local.value);

  const variant = computed<RadioGroupVariant>(() => group?.variant() ?? "primary");

  const isDisabled = computed(() => group?.isDisabled() === true || local.isDisabled === true);
  const isReadOnly = computed(() => group?.isReadOnly() === true);
  const isRequired = computed(() => group?.isRequired() === true);
  // The item's own `isInvalid` / `isRequired` are accepted for source
  // compatibility only: upstream RAC reads both from the group state.
  const isInvalid = computed(() => group?.isInvalid() === true);

  const isSelected = computed(() => group?.state.selectedValue() === value());

  // RAC gives the item `tabIndex=0` only while it is the group's tab stop, and
  // `-1` when disabled.
  const focusable = computed(
    () => isDisabled() === false && (group ? group.isTabStop(value()) : true),
  );

  // --- Interaction state (R-013, R-014, R-016, R-023, R-024) -----------------
  const hovered = signal(false);
  const pressed = signal(false);
  const focused = signal(false);
  const modality = createInteractionModality();

  // R-013: the ring shows only for a keyboard focus, as `:focus-visible` does
  // upstream; a pointer press does not focus a view in NSH, and the Label's
  // `focusField` records the pointer before it focuses.
  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  // The render props' `isPressed` keeps a read-only press (upstream's
  // `usePress` is disabled only by `isDisabled`); the Control reads it for
  // R-016 / R-018 / R-024, which also stay true on a read-only radio.
  const isPressed = computed(() => pressed() && !isDisabled());

  let contentNode: ViewRef | undefined;
  let focusFromPointer = false;
  let contentFocused = false;

  const setContentRef = (node: ViewRef | undefined) => {
    contentNode = node;
  };

  const labelPressEvent = (): PressEvent => ({
    position: { x: 0, y: 0 },
    pagePosition: { x: 0, y: 0 },
    modifiers: { control: false, alt: false, shift: false, platform: false },
    clickCount: 1,
  });

  // --- Press reporting --------------------------------------------------------
  // Upstream's press handlers, reported by whichever part saw the press. The
  // pressed signal changes with the start and the end, so the Content, a Label
  // and the Control all read one source. A caller may have put the callbacks on
  // the field root (the HeroUI place) or on the pressable Content; the root's
  // own props win when both exist, and exactly one handler runs either way.
  let contentPressHandlers: RadioPressHandlers | undefined;

  const setContentPressHandlers = (handlers: RadioPressHandlers | undefined) => {
    contentPressHandlers = handlers;
  };

  const pressHandler = <K extends keyof RadioPressHandlers>(
    key: K,
  ): RadioPressHandlers[K] => local[key] ?? contentPressHandlers?.[key];

  // A disabled radio dispatches no press callback upstream. A read-only one
  // still does (it simply cannot change the value), so the gate is `isDisabled`
  // alone here; `select()` is the second gate.
  const pressStart = (event: PressEvent) => {
    pressed.set(true);

    if (isDisabled()) {
      return;
    }

    pressHandler("onPressStart")?.(event);
    pressHandler("onPressChange")?.(true);
  };

  const pressUp = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    pressHandler("onPressUp")?.(event);
  };

  const pressEnd = (event: PressEvent) => {
    // NSH reports the end twice when a release triggers `onPress` too; upstream
    // fires `onPressEnd` once, from its one press state machine.
    if (!pressed()) {
      return;
    }

    pressed.set(false);

    if (isDisabled()) {
      return;
    }

    pressHandler("onPressEnd")?.(event);
    pressHandler("onPressChange")?.(false);
  };

  const press = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    pressHandler("onPress")?.(event);
  };

  const click = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    pressHandler("onClick")?.(event);
  };

  // A Label inside the field reports its real press-down/up through
  // `FieldContext`; a held press must paint the Control and keep its real
  // pointer position (a `{0,0}` position would read as a keyboard press).
  const pressFieldStart = (event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    if (isKeyboardPress(event)) {
      modality.setKeyboardModality();
    } else {
      modality.setPointerModality();
    }

    pressStart(event);
  };

  const pressFieldUp = (event: PressEvent) => {
    pressUp(event);
  };

  // The focus a `<label for>` gives its control is a pointer interaction: mark
  // the modality, then let `onFocus` consume the marker instead of turning it
  // into a keyboard focus (R-013).
  const focusContentAsPointer = () => {
    modality.setPointerModality();

    if (focused()) {
      return;
    }

    focusFromPointer = true;
    contentNode?.focus();
  };

  const consumeFocusFromPointer = () => {
    const value = focusFromPointer;

    focusFromPointer = false;

    return value;
  };

  // The one place this item asks its group to change the value. The group's
  // `select()` writes the value of a non-read-only, non-disabled group and
  // commits validation; the item adds no second gate that could drift.
  const select = () => {
    if (isDisabled() || isReadOnly()) {
      return;
    }

    group?.select(value());
  };

  // Pressing the item's `<label>` (a Label inside the Content) focuses the
  // clickable face and selects the item. NSH's Label reports the real
  // press-down/up and then the completed press through `FieldContext`, so the
  // activation happens here in upstream's order: end, press, select, focus,
  // click.
  const focusField = (event?: PressEvent) => {
    const pressEvent = event ?? labelPressEvent();

    pressEnd(pressEvent);

    if (isDisabled()) {
      return;
    }

    press(pressEvent);
    select();
    focusContentAsPointer();
    click(pressEvent);
  };

  // --- Focus reporting --------------------------------------------------------
  // The Content is the item's one focus stop. Its focus is both the item's
  // `FocusEvents` (HeroUI puts them on the field root) and the group's
  // `useFocusWithin`; the token identifies this item in the group's set.
  const focusIn = (token: object) => {
    focused.set(true);
    group?.setItemFocused(token, value(), true);
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const focusOut = (token: object) => {
    focused.set(false);
    group?.setItemFocused(token, value(), false);
    // Validation commits on selection, never on blur: React Aria attaches only
    // `invalid` / `change` listeners (`useFormValidation.ts:123-127`).
    local.onFocusChange?.(false);
    local.onBlur?.();
  };

  // --- The group collection ---------------------------------------------------
  const registration = {
    value,
    isDisabled,
    focus: (fromPointer = false) => {
      if (fromPointer) {
        modality.setPointerModality();
        focusFromPointer = true;
      }

      contentNode?.focus();
    },
  };

  if (group) {
    cleanup(group.registerItem(registration));
  }

  // --- Registered text (the stand-in for label for / aria-describedby) -------
  const labelTexts = signal<readonly (() => string | undefined)[]>([]);
  const descriptionTexts = signal<readonly (() => string | undefined)[]>([]);
  const errorTexts = signal<readonly (() => string | undefined)[]>([]);

  const registerLabel = (text: () => string | undefined) => {
    labelTexts.update((current) => [...current, text]);

    return () => {
      labelTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const registerDescription = (text: () => string | undefined) => {
    descriptionTexts.update((current) => [...current, text]);

    return () => {
      descriptionTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const registerErrorMessage = (text: () => string | undefined) => {
    errorTexts.update((current) => [...current, text]);

    return () => {
      errorTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const labelText = computed(() => joinRegistered(labelTexts()));
  const descriptionText = computed(() => joinRegistered(descriptionTexts()));
  const errorText = computed(() => joinRegistered(errorTexts()));

  // --- Descendant classes (R-006, R-008) --------------------------------------
  // NSH has no `.radio > [data-slot="description"]`; the field root hands the
  // Description and FieldError the classes its stylesheet would give them,
  // including the doubled dimming of a disabled field.
  const partClass = computed(() => {
    const disabledClass = isDisabled() ? "opacity-50" : "";

    // R-006: the same declaration string upstream gives both slots.
    // `wrap-break-word` is dropped: NSH treats it as an unknown class and has
    // no `overflowWrap` style key (§8).
    return [
      "w-full min-w-0 cursor-default ps-7 text-xs text-wrap text-muted select-none",
      disabledClass,
    ]
      .filter((part) => part.length > 0)
      .join(" ");
  });

  // --- Contexts ---------------------------------------------------------------
  const renderProps: RadioFieldRenderProps = {
    isSelected,
    isDisabled,
    isReadOnly,
    isInvalid,
    isRequired,
  };

  const contextValue: RadioItemContextValue = {
    variant,
    value,
    isSelected,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    isHovered: hovered,
    isPressed,
    isFocused: focused,
    isFocusVisible,
    focusable,
    // `aria-label` is the HeroUI name; `accessibilityLabel` is its NSH alias,
    // and both name the clickable face rather than the role-less field root.
    ariaLabel: () => local["aria-label"] ?? local.accessibilityLabel,
    labelText,
    descriptionText,
    errorText,
    select,
    setContentRef,
    focusContentFromPointer: focusContentAsPointer,
    setContentPressHandlers,
    pressStart,
    pressUp,
    pressEnd,
    pressFieldStart,
    pressFieldUp,
    press,
    click,
    setHovered: (value) => hovered.set(value),
    setPressed: (value) => pressed.set(value),
    focusIn,
    focusOut,
    setKeyboardModality: () => modality.setKeyboardModality(),
    setPointerModality: () => modality.setPointerModality(),
    consumeFocusFromPointer,
  };

  // `isRequired` is deliberately absent from the item's label context:
  // `label.css:12-16` excludes an item's root from the asterisk rule, because
  // an item's Label sits inside the clickable face, not beside the field.
  const fieldState = {
    isDisabled,
    isInvalid,
    registerLabel,
    focusField,
    pressFieldStart,
    pressFieldUp,
  };

  const descriptionState = {
    registerDescription,
    partClass,
  };

  const fieldErrorState = {
    isInvalid,
    validationErrors: () => group?.validationErrors() ?? ([] as readonly string[]),
    isToggleField: () => true,
    registerErrorMessage,
    partClass,
  };

  // --- Classes ----------------------------------------------------------------
  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    [
      radioVariants().base(),
      // R-026: the group's vertical `mt-4`, handed down through its context;
      // the first item gets it too.
      group?.itemClass() ?? "",
      resolvedClassName() ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // `autoFocus` focuses the clickable face once the child has mounted. The ref
  // callback below runs during the mount, before this effect does.
  effect(() => {
    if (local.autoFocus) {
      contentNode?.focus();
      modality.setKeyboardModality();
    }
  });

  const resolveChildren = (
    children: JSX.Element | ((values: RadioFieldRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() =>
          (children as (values: RadioFieldRenderProps) => JSX.Element)(renderProps),
        ),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  // The Root provides four contexts, so `props.children` is read once, at the
  // placement inside them (common rules' provider exception).
  return (
    <RadioItemContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <DescriptionContext.Provider value={descriptionState}>
          <FieldErrorContext.Provider value={fieldErrorState}>
            <View
              {...rest}
              ref={(node) => local.ref?.(node)}
              testID={local.testID}
              nativeID={local.id ?? local.nativeID}
              tooltip={local.tooltip}
              accessibilityElementsHidden={local.accessibilityElementsHidden}
              class={classes()}
              // R-007: `.radio[data-disabled="true"]` → `@apply
              // status-disabled` (opacity 0.5, cursor not-allowed,
              // pointer-events none); the values are literals because the
              // theme has no such variables.
              classList={{
                "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
              }}
              style={resolvedStyle()}
              onLayout={local.onLayout}
            >
              {resolveChildren(local.children)}
            </View>
          </FieldErrorContext.Provider>
        </DescriptionContext.Provider>
      </FieldContext.Provider>
    </RadioItemContext.Provider>
  );
}

/**
 * The fallback used by the parts when they are rendered outside a `Radio`.
 * Re-exported here so the parts import one module for context and fallback.
 */
export { FALLBACK_RADIO_ITEM_CONTEXT };
