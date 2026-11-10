import type {
  Bounds,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, signal, split, untracked, View } from "nsh";

import {
  createInteractionModality,
  isKeyboardPress,
} from "../../primitives/create-interaction-modality";
import { createToggleState } from "../../primitives/create-toggle-state";
import { DescriptionContext } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import { FieldsetContext } from "../fieldset/context";
import { FieldContext } from "../label/context";
import type {
  CheckboxFieldRenderProps,
  CheckboxPressHandlers,
  CheckboxToggleState,
} from "./checkbox-context";
import {
  CheckboxContext,
  type CheckboxContextValue,
  CheckboxGroupContext,
} from "./checkbox-context";
import { checkboxVariants, type CheckboxVariant } from "./checkbox.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * A validation error, as React Aria's `validate` returns it: a string is the
 * message, an object carries it in `message`. NSH has no DOM `ValidityState`.
 */
export interface CheckboxValidationError {
  key?: string;
  message?: string;
}

export type {
  CheckboxButtonRenderProps,
  CheckboxFieldRenderProps,
} from "./checkbox-context";

/** @deprecated Use {@link CheckboxFieldRenderProps} for the root render prop, or {@link CheckboxButtonRenderProps} for the content. */
export type CheckboxRenderProps = CheckboxFieldRenderProps;

/* -------------------------------------------------------------------------------------------------
 * Checkbox Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Checkbox.Root` / `Checkbox`: HeroUI 3.2.7's `CheckboxRootProps`,
 * which is React Aria Components' `CheckboxField` (a `div` that owns the value,
 * the validation and the help-text contexts) plus the `variant` dimension.
 *
 * Every DOM-only member upstream is accepted so code written against HeroUI
 * keeps compiling; the port sheet §1 says what each can and cannot do here.
 */
export interface CheckboxRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  /**
   * The field's content: an element, or a render prop called once with the
   * field state (D17). Bare strings inside it become `Text` at the placement.
   */
  children?: JSX.Element | ((values: CheckboxFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: CheckboxFieldRenderProps) => string | undefined);

  /** Style of the field root; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: CheckboxFieldRenderProps) => StyleProp<ViewStyle>);

  /** The variant dimension; inherits the group's when the item sets none. */
  variant?: CheckboxVariant;

  /** The selected state, controlled. */
  isSelected?: boolean;

  /** The initial selected state, uncontrolled. */
  defaultSelected?: boolean;

  /** Called with the next selected state whenever the user changes it. */
  onChange?: (isSelected: boolean) => void;

  /**
   * Paints the indeterminate state (`accessibilityState.checked = "mixed"`).
   * Presentation only: pressing a mixed checkbox makes it checked, and the prop
   * stays as the caller wrote it (port sheet §2).
   */
  isIndeterminate?: boolean;

  /**
   * A user press on the checkbox, pointer or keyboard. React Aria hands the
   * field root these `PressEvents`; NSH fires them from the Content (the
   * pressable face) and from a `Label` inside it.
   */
  onPress?: (e: PressEvent) => void;

  /** The press began. */
  onPressStart?: (e: PressEvent) => void;

  /** The press ended; `onPress` follows only when it ended on the checkbox. */
  onPressEnd?: (e: PressEvent) => void;

  /** Every press-start / press-end transition, as `usePress` reports it. */
  onPressChange?: (isPressed: boolean) => void;

  /** The press was released over the checkbox. */
  onPressUp?: (e: PressEvent) => void;

  /** A completed activation. NSH has no DOM `click`, so this follows `onPress`. */
  onClick?: (e: PressEvent) => void;

  /** The clickable face took the focus. */
  onFocus?: () => void;

  /** The clickable face lost the focus; validation does not commit here. */
  onBlur?: () => void;

  /** Both focus transitions of the clickable face. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Blocks interaction and dims the field. */
  isDisabled?: boolean;

  /** Keeps the field focusable and blocks the value change. */
  isReadOnly?: boolean;

  /** Marks the field required; the render props and the item's context report it, but no Label inside a checkbox shows the asterisk (the item's Label sits inside the Content, `label.css:12-16`). */
  isRequired?: boolean;

  /** Marks the field invalid; a `FieldError` inside it shows its message. */
  isInvalid?: boolean;

  /**
   * Runs on commit (the first change, then every change) in the `"native"`
   * mode, and live from the first render in the `"aria"` mode. `true` means
   * valid; a string or a `{ message }` object is the error. Ignored inside a
   * group, where the group owns validation.
   */
  validate?: (
    isSelected: boolean,
  ) => true | string | CheckboxValidationError | null | undefined;

  /**
   * When the validation message appears: `"native"` waits for the first
   * change, `"aria"` shows the live `validate` result from the first render
   * and follows controlled value changes. Defaults to `"native"`, as RAC
   * does (`Checkbox.tsx:280-284`). Ignored inside a group, where the group
   * validates.
   */
  validationBehavior?: "native" | "aria";

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** The item's value inside a group; `"on"` by default, as the native input. */
  value?: string;

  /** Accepted, no effect: NSH has no DOM form ownership. */
  form?: string;

  /** Focuses the clickable face after it mounts. */
  autoFocus?: boolean;

  /** Leaves the clickable face out of the Tab order. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: there is no hidden `<input>` to point at. */
  inputRef?: unknown;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

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
}

function toValidationErrors(
  result: true | string | CheckboxValidationError | null | undefined,
): readonly string[] {
  if (result === true || result === null || result === undefined) {
    return [];
  }

  const message = typeof result === "string" ? result : result.message;

  return typeof message === "string" && message.length > 0 ? [message] : [];
}

function joinRegistered(values: readonly (() => string | undefined)[]): string | undefined {
  const text = values
    .map((value) => value())
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/**
 * `Checkbox.Root` / `CheckboxRoot`: the field — a `flex-col` field root that
 * owns the selection, validation, description and error state and provides the
 * three field contexts plus the checkbox's own one (port sheet §2).
 *
 * It is built on the core `View`, not on nsh/base `Checkbox`: that component
 * fixes the "indicator slot + children" structure with its own square as the
 * indicator, and exposes only a controlled `checked`, so it cannot host
 * HeroUI's four parts, its two-level Control / Indicator nesting, its
 * uncontrolled, read-only, required and invalid semantics, or the group
 * (port sheet §3, criteria B1, B3, B4).
 */
export function CheckboxRoot(props: CheckboxRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "variant",
    "isSelected",
    "defaultSelected",
    "onChange",
    "isIndeterminate",
    "onPress",
    "onPressStart",
    "onPressEnd",
    "onPressChange",
    "onPressUp",
    "onClick",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "validate",
    "validationBehavior",
    "name",
    "value",
    "form",
    "autoFocus",
    "excludeFromTabOrder",
    "inputRef",
    "render",
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
    "onMouseEnter",
    "onMouseLeave",
  ] as const);

  // Read once, in the body: the group this item lives in, when any (port sheet
  // §2). There is no context in NSH's event handlers, so every closure below
  // keeps this one value; membership is fixed for the instance's life.
  const group = CheckboxGroupContext();

  // --- The value / variant ---------------------------------------------------
  // The item's identity inside a group (React Aria's `value`, `"on"` by
  // default, `react-aria/src/checkbox/useCheckbox.ts`). Inside a group it also
  // keys the selected state.
  const value = computed(() => local.value ?? "on");

  // The variant: the item's own, else the group's, else `primary`
  // (`checkbox.tsx:41-47` upstream).
  const variant = computed<CheckboxVariant>(
    () => local.variant ?? group?.variant() ?? "primary",
  );

  // --- Disabled / read-only / required --------------------------------------
  // The group's flag reaches every item (`useCheckboxGroupItem` merges it with
  // the item's own); `isRequired` deliberately does not, matching the Label
  // unit's ruling that a group never hands its `required` down (§2).
  // Fieldset sheet §5.2: a disabled `Fieldset` is ORed in ahead of the group; a
  // fieldset cannot be undone by the item's own `isDisabled`.
  const fieldset = FieldsetContext();
  const isDisabled = computed(
    () =>
      fieldset?.isDisabled() === true ||
      group?.isDisabled() === true ||
      local.isDisabled === true,
  );
  const isReadOnly = computed(() => group?.isReadOnly() === true || local.isReadOnly === true);
  const isRequired = computed(() => local.isRequired === true);
  const isIndeterminate = computed(() => local.isIndeterminate === true);

  const focusable = computed(() => local.excludeFromTabOrder !== true);

  // --- Selection state -------------------------------------------------------
  // Standalone, the item owns a toggle state. Inside a group the group's value
  // is the only source (§2), so the local state below is created but never
  // written and never read.
  const toggleState = createToggleState({
    isSelected: () => local.isSelected,
    defaultIsSelected: () => local.defaultSelected,
    isDisabled,
    isReadOnly,
    // `useCheckboxGroupItem`'s ToggleState reports every change through the
    // item's `onChange` too, after it writes the group
    // (`react-aria/src/checkbox/useCheckboxGroupItem.ts:45-58`).
    onSelectedChange: (next) => local.onChange?.(next),
  });

  const isSelected = computed(() =>
    group ? group.state.isSelected(value()) : toggleState.isSelected(),
  );

  // --- Validation ------------------------------------------------------------
  // React Aria commits validation on the input's change event, so the message
  // appears on the first press, and re-checks after that; a controlled parent
  // changing the value does not re-run it in the native mode (port sheet §2,
  // same as Switch). RAC defaults to `"native"` (`Checkbox.tsx:280-284`).
  const validationErrors = signal<readonly string[]>([]);
  let hasCommitted = false;

  const validationBehavior = computed(() => local.validationBehavior ?? "native");

  const runValidation = () => {
    const validate = local.validate;

    if (!validate) {
      validationErrors.set([]);

      return;
    }

    validationErrors.set(toValidationErrors(validate(isSelected())));
  };

  // React Aria's `"aria"` mode exposes the live `validate` result from the
  // first render and re-runs it whenever the value changes;
  // `@react-stately/form`'s `useFormValidationState.ts:184-193` is the only
  // mode that reads the client error before a commit.
  const shownValidationErrors = computed<readonly string[]>(() => {
    if (validationBehavior() !== "aria") {
      return validationErrors();
    }

    const validate = local.validate;

    return validate ? toValidationErrors(validate(isSelected())) : [];
  });

  const commitValidation = () => {
    hasCommitted = true;

    if (group) {
      group.state.commitValidation();

      return;
    }

    runValidation();
  };

  const setSelected = (next: boolean) => {
    if (group) {
      const current = group.state.isSelected(value());

      if (current === next) {
        return;
      }

      if (next) {
        group.state.addValue(value());
      } else {
        group.state.removeValue(value());
      }

      local.onChange?.(next);

      return;
    }

    toggleState.setIsSelected(next);

    if (hasCommitted) {
      runValidation();
    }
  };

  // The one place the value changes (the Content's press and a Label's
  // `focusField` both arrive here). `createToggleState` blocks disabled and
  // read-only; the guard keeps the group path the same. In a group the value
  // goes to the group and the item still reports it through `onChange`, as
  // `useCheckboxGroupItem.ts:45-58` does.
  const toggle = () => {
    if (isDisabled() || isReadOnly()) {
      return;
    }

    if (group) {
      const next = !group.state.isSelected(value());

      group.state.toggleValue(value());
      local.onChange?.(next);
      commitValidation();

      return;
    }

    toggleState.toggle();
    hasCommitted = true;
    runValidation();
  };

  const state: CheckboxToggleState = {
    isSelected,
    setSelected,
    toggle,
  };

  // Inside a group the group's validation is the only source; the item's own
  // `isInvalid` is ignored, as `useCheckboxGroupItem` does upstream.
  const isInvalid = computed(() =>
    group ? group.isInvalid() : local.isInvalid === true || shownValidationErrors().length > 0,
  );

  // --- Interaction state (R-010, R-014, R-016, R-023 … R-031) ----------------
  const hovered = signal(false);
  const rootHovered = signal(false);
  const pressed = signal(false);
  const focused = signal(false);
  const modality = createInteractionModality();

  // R-023: the ring shows only for a keyboard focus, as `:focus-visible` does
  // upstream; a pointer press does not focus a view in NSH, and the Label's
  // `focusField` records the pointer before it focuses.
  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  // The render prop's `isPressed` is React Aria's: the label's press is
  // disabled for `isDisabled || isReadOnly`, so it stays off on a read-only
  // checkbox. The Control still paints the held state through `isActive`,
  // which stands in for the stylesheet's `.checkbox:active &` (R-028).
  const isPressed = computed(() => pressed() && !isDisabled() && !isReadOnly());

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

  // Upstream's press handlers, reported by whichever part saw the press. The
  // pressed signal changes with the start and the end, so the Content, a Label
  // and the Control all read one source. A caller may have put the callbacks on
  // the field root (the HeroUI place) or on the pressable Content; the root's
  // own props win when both exist, and exactly one handler runs either way.
  let contentPressHandlers: CheckboxPressHandlers | undefined;

  const setContentPressHandlers = (handlers: CheckboxPressHandlers | undefined) => {
    contentPressHandlers = handlers;
  };

  const pressHandler = <K extends keyof CheckboxPressHandlers>(
    key: K,
  ): CheckboxPressHandlers[K] => local[key] ?? contentPressHandlers?.[key];

  // React Aria's `usePress({ isDisabled: isDisabled || isReadOnly })` dispatches
  // no press callback on a read-only or disabled checkbox, so the callbacks are
  // gated here, at their one owner. The raw `pressed` signal still tracks the
  // held pointer, because `.checkbox:active &` paints on any pointer press.
  const pressLocked = () => isDisabled() || isReadOnly();

  const pressStart = (event: PressEvent) => {
    pressed.set(true);

    if (pressLocked()) {
      return;
    }

    pressHandler("onPressStart")?.(event);
    pressHandler("onPressChange")?.(true);
  };

  const pressUp = (event: PressEvent) => {
    if (pressLocked()) {
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

    if (pressLocked()) {
      return;
    }

    pressHandler("onPressEnd")?.(event);
    pressHandler("onPressChange")?.(false);
  };

  const press = (event: PressEvent) => {
    if (pressLocked()) {
      return;
    }

    pressHandler("onPress")?.(event);
  };

  const click = (event: PressEvent) => {
    if (pressLocked()) {
      return;
    }

    pressHandler("onClick")?.(event);
  };

  // A Label inside the field reports its real press-down/up through
  // `FieldContext`; the checkbox hears the label's press the way the `<label>`
  // hears it upstream, so a held label press paints and the event keeps its
  // real pointer position (a `{0,0}` position would read as a keyboard press).
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
  // into a keyboard focus (R-023).
  const focusContentAsPointer = () => {
    modality.setPointerModality();

    if (focused()) {
      return;
    }

    focusFromPointer = true;
    contentNode?.focus();
  };

  // Pressing a `<label for>` focuses the control and toggles it. NSH's Label
  // reports its real press-down/up through `FieldContext` and the completed
  // press through `focusField`; the press does not reach the Content (a press
  // on a pressable Text stays there, measured), so the activation happens here.
  // The order follows the label's press handler in
  // `react-aria/src/toggle/useToggle.ts`: `onPressEnd`, `onPress`, the toggle,
  // the focus, then the click callback. A read-only press ends the held paint
  // but dispatches none of them.
  const focusField = (event?: PressEvent) => {
    const pressEvent = event ?? labelPressEvent();

    pressEnd(pressEvent);

    if (isDisabled() || isReadOnly()) {
      return;
    }

    press(pressEvent);
    toggle();
    focusContentAsPointer();
    click(pressEvent);
  };

  const consumeFocusFromPointer = () => {
    const value = focusFromPointer;

    focusFromPointer = false;

    return value;
  };

  // --- Focus reporting -------------------------------------------------------
  // The Content is the one focus stop. Its focus is both the field's
  // `FocusEvents` (HeroUI puts them on the field root) and the group's
  // `useFocusWithin`. The token identifies this item in the group's set.
  const focusIn = (token: object) => {
    focused.set(true);
    group?.setItemFocused(token, true);
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const focusOut = (token: object) => {
    focused.set(false);
    group?.setItemFocused(token, false);
    // Validation commits on the change, never on blur: React Aria attaches
    // only `invalid` / `change` listeners (`react-aria/src/form/
    // useFormValidation.ts:123-127`), and the project ruling keeps a group
    // from committing on focus loss (`tmp/port-sheets/radio.md:71`).
    local.onFocusChange?.(false);
    local.onBlur?.();
  };

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

  // --- Descendant classes (R-004, R-005, R-009) ------------------------------
  // NSH has no `.checkbox > [data-slot="description"]`; the field root hands the
  // Description and FieldError the classes its stylesheet would give them,
  // including the doubled dimming of a disabled field.
  const partClass = computed(() => {
    const disabledClass = isDisabled() ? "opacity-50" : "";

    // R-004 / R-005: the same declaration string upstream gives both slots.
    // `wrap-break-word` is dropped: NSH treats it as an unknown class and has no
    // `overflowWrap` style key (§8).
    return [
      "w-full min-w-0 cursor-default ps-7 text-xs text-wrap text-muted select-none",
      disabledClass,
    ]
      .filter((part) => part.length > 0)
      .join(" ");
  });

  // --- Contexts --------------------------------------------------------------
  const renderProps: CheckboxFieldRenderProps = {
    isSelected,
    isIndeterminate,
    isDisabled,
    isReadOnly,
    isInvalid,
    isRequired,
  };

  const contextValue: CheckboxContextValue = {
    variant,
    isSelected,
    isIndeterminate,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    isHovered: hovered,
    rootHovered,
    isPressed,
    isActive: pressed,
    isFocused: focused,
    isFocusVisible,
    state,
    focusable,
    // `aria-label` is the HeroUI name; `accessibilityLabel` is its NSH alias,
    // and both name the clickable face rather than the role-less field root.
    ariaLabel: () => local["aria-label"] ?? local.accessibilityLabel,
    labelText,
    descriptionText,
    errorText,
    itemClass: () => group?.itemClass(),
    setContentRef,
    setContentPressHandlers,
    focusContentFromPointer: focusContentAsPointer,
    pressStart,
    pressUp,
    pressEnd,
    pressFieldStart,
    pressFieldUp,
    press,
    click,
    setHovered: (value) => hovered.set(value),
    setRootHovered: (value) => rootHovered.set(value),
    setPressed: (value) => pressed.set(value),
    focusIn,
    focusOut,
    setKeyboardModality: () => modality.setKeyboardModality(),
    setPointerModality: () => modality.setPointerModality(),
    consumeFocusFromPointer,
    commitValidation,
  };

  // Only a standalone field owns validation; inside a group the group does, and
  // upstream hands the items a null FieldError context so a FieldError placed
  // inside one shows nothing (`react-aria-components/src/Checkbox.tsx:421-423`).
  //
  // `isRequired` is deliberately absent: `label.css:12-16` excludes
  // `[data-slot="checkbox"]` from the asterisk rule and only a direct child
  // Label of the field root could match it, while a checkbox item's Label sits
  // inside the Content (`tmp/port-sheets/label.md:107`). The render props and
  // the checkbox context still report it.
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

  const fieldErrorState = group
    ? {
        isInvalid: () => false,
        validationErrors: () => [] as readonly string[],
      }
    : {
        isInvalid,
        validationErrors: shownValidationErrors,
        isToggleField: () => true,
        registerErrorMessage,
        partClass,
      };

  // --- Classes ---------------------------------------------------------------
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
      checkboxVariants({ variant: variant() }).base(),
      // R-042: the group's `.checkbox [data-slot="checkbox"] { mt-4 }`, handed
      // down through the group context; the first item gets it too.
      contextValue.itemClass() ?? "",
      resolvedClassName() ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const handleRootMouseEnter = (event: NshMouseEvent) => {
    local.onMouseEnter?.(event);
    rootHovered.set(true);
  };

  const handleRootMouseLeave = (event: NshMouseEvent) => {
    local.onMouseLeave?.(event);
    rootHovered.set(false);
  };

  // `autoFocus` focuses the clickable face once the child has mounted. The ref
  // callback above runs during the mount, before this effect does.
  effect(() => {
    if (local.autoFocus) {
      contentNode?.focus();
    }
  });

  const resolveChildren = (
    children: JSX.Element | ((values: CheckboxFieldRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() =>
          (children as (values: CheckboxFieldRenderProps) => JSX.Element)(renderProps),
        ),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  // The Root provides four contexts, so `props.children` is read once, at the
  // placement inside them (common rules' provider exception).
  return (
    <CheckboxContext.Provider value={contextValue}>
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
              // R-008: `.checkbox[data-disabled="true"]` → `@apply
              // status-disabled` (opacity 0.5, cursor not-allowed,
              // pointer-events none); the values are literals because the theme
              // has no such variables.
              classList={{
                "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
              }}
              style={resolvedStyle()}
              onLayout={local.onLayout}
              // R-024: `.checkbox:hover &` on the Control, which upstream also
              // matches while the pointer is over the description or the error
              // (they are siblings of the button). A pointer over a child may
              // or may not re-report `mouseenter` in NSH; the Content's own
              // hover is OR-ed in at the Control, so the appearance is the same
              // either way.
              onMouseEnter={handleRootMouseEnter}
              onMouseLeave={handleRootMouseLeave}
            >
              {resolveChildren(local.children)}
            </View>
          </FieldErrorContext.Provider>
        </DescriptionContext.Provider>
      </FieldContext.Provider>
    </CheckboxContext.Provider>
  );
}
