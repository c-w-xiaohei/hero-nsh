import type { InputProps as NshInputProps } from "nsh/base";
import { Input } from "nsh/base";
import type {
  Accessor,
  InputRef,
  InputStyle,
  JSX,
  MouseEvent as NshMouseEvent,
  PressEvent,
  StyleProp,
} from "nsh";
import { cleanup, computed, effect, keymap, signal, split } from "nsh";

import { joinClassNames } from "./class-names";
import { NumberFieldContext } from "./context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./number-field-dom-props";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The values HeroUI's `Input` hands to its render props
 * (`react-aria-components/src/Input.tsx:28-54`), as accessors per D17.
 */
export interface NumberFieldInputRenderProps {
  /** A pointer rests on the input. */
  isHovered: Accessor<boolean>;

  /** The input has keyboard focus. */
  isFocused: Accessor<boolean>;

  /** A text input counts as focus-visible as soon as it is focused. */
  isFocusVisible: Accessor<boolean>;

  /** The effective disabled state. */
  isDisabled: Accessor<boolean>;

  /** The effective invalid state. */
  isInvalid: Accessor<boolean>;

  /** The `input` slot's class string, before the caller's `className`. */
  defaultClassName: string;

  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: InputStyle;
}

/* -------------------------------------------------------------------------------------------------
 * `<input>`-only attributes
 * -----------------------------------------------------------------------------------------------*/

/**
 * The members of `InputHTMLAttributes<HTMLInputElement>` that exist only
 * because HeroUI renders a real `<input>`. They are accepted so code written
 * against HeroUI keeps compiling; §1.4 and §8 register that NSH has no form
 * submission or browser validation, and that the remaining DOM events either
 * map to an NSH input event or have no channel.
 */
export interface NumberFieldInputDomProps {
  name?: string;
  form?: string;
  list?: string;
  pattern?: string;
  minLength?: number;
  spellCheck?: boolean;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  size?: number;
  multiple?: boolean;
  accept?: string;
  capture?: boolean | "user" | "environment";
  autoSave?: string;
  results?: number;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  onKeyDown?: unknown;
  onKeyUp?: unknown;
  onBeforeInput?: unknown;
  onInput?: unknown;
  onCopy?: unknown;
  onCut?: unknown;
  onSelect?: unknown;
  onClick?: unknown;
  onDoubleClick?: unknown;
  onMouseDown?: unknown;
}

/* -------------------------------------------------------------------------------------------------
 * Input props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `NumberField.Input`: HeroUI 3.2.7's `NumberFieldInputProps`,
 * which is React Aria Components' `Input` (`InputHTMLAttributes<HTMLInputElement>`,
 * `HoverEvents`, `StyleRenderProps<InputRenderProps, "input">` and
 * `placeholder`), expressed with NSH's `<Input>` host props.
 *
 * Inside a field, the value, disabled, read-only, invalid and accessible names
 * come from `NumberFieldContext`; explicit props win, as React Aria's merge
 * does. Standalone, the input is a plain controlled / uncontrolled text field,
 * as RAC's empty input context leaves it.
 */
export interface NumberFieldInputProps
  extends Omit<
      NshInputProps,
      | "children"
      | "class"
      | "style"
      | "ref"
      | "value"
      | "defaultValue"
      | "onChange"
      | "onFocus"
      | "onBlur"
      | "onSubmit"
      | "nativeID"
      | "readonly"
      | "disabled"
      | "keyboardType"
      | "autoComplete"
      | "autoCorrect"
      | "submitBehavior"
    >,
    AriaProps,
    DataProps,
    GlobalDomProps,
    NumberFieldInputDomProps {
  /** The text, controlled. Inside a field the field's text wins unless this is given. */
  value?: string;

  /** The initial text when rendered without a field root. */
  defaultValue?: string;

  /** The user edited the text; the field filters it before writing. */
  onChange?: (event: { value: string }) => void;

  /** The input cannot be edited; overrides the field's read-only state. */
  readOnly?: boolean;

  /** The input is disabled; overrides the field's state. */
  disabled?: boolean;

  /** The browser's autofill hint; upstream forces `"off"`. */
  autoComplete?: NshInputProps["autoComplete"];

  /** The system's corrections; upstream forces `false`. */
  autoCorrect?: boolean;

  /** The HTML input type; drives the keyboard layout only. Upstream forces `"text"`. */
  type?:
    | "text"
    | "search"
    | "email"
    | "password"
    | "tel"
    | "url"
    | "number"
    | (string & {});

  /** The keyboard layout request; the field's computed layout wins inside a field. */
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";

  /** Appended after the slot classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: NumberFieldInputRenderProps) => string | undefined);

  /** Style of the input; function form gets the same accessors. */
  style?:
    | StyleProp<InputStyle>
    | ((values: NumberFieldInputRenderProps) => StyleProp<InputStyle>);

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to; below `id`. */
  nativeID?: string;

  /** The keyboard layout; wins over the computed mapping. */
  keyboardType?: NshInputProps["keyboardType"];

  /** The input's ref; a callback, as NSH forwards refs. */
  ref?: (node: InputRef) => void;

  /** The input took the focus; also writes the field's focus-within state. */
  onFocus?: () => void;

  /** The input lost the focus; the field commits before this runs. */
  onBlur?: () => void;

  /** Return was pressed in the input; the field commits, then this runs. */
  onSubmit?: (event: { text: string }) => void;

  /** The pointer entered the input (off while disabled). */
  onMouseEnter?: (e: NshMouseEvent) => void;

  /** The pointer left the input. */
  onMouseLeave?: (e: NshMouseEvent) => void;

  /** The pointer entered the input (off while disabled). */
  onHoverStart?: (e: NshMouseEvent) => void;

  /** The pointer left the input. */
  onHoverEnd?: (e: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /** The accessible name; wins over the root's `aria-label` and the Label text. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH's accessibility state has no invalid field. */
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
  "aria-readonly"?: boolean | "true" | "false";

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/

/**
 * NumberField.Input / NumberFieldInput: the field's only editable element, a
 * native text field through nsh/base's `Input`.
 *
 * It shows the field's text, applies each edit to the field (which may bounce
 * it), commits on blur and Enter, and binds the six spin-button keys through
 * `keymap` while it has the focus. Those bindings need `when: "always"`: the
 * keymap otherwise skips every key a focused text input uses, arrows and Home /
 * End included (port sheet §5).
 */
export function NumberFieldInput(props: NumberFieldInputProps): JSX.Element {
  const [local, rest] = split(props, [
    "className",
    "style",
    "ref",
    "value",
    "defaultValue",
    "onChange",
    "disabled",
    "readOnly",
    "required",
    "id",
    "nativeID",
    "type",
    "inputMode",
    "keyboardType",
    "autoFocus",
    "autoComplete",
    "autoCorrect",
    "placeholder",
    "maxLength",
    "onFocus",
    "onBlur",
    "onSubmit",
    "onPress",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "aria-label",
    "accessibilityLabel",
    "accessibilityHint",
    "aria-invalid",
    "aria-required",
    "aria-readonly",
    "accessibilityValue",
    "accessibilityActions",
    "onAccessibilityAction",
    "render",
    "slot",
  ] as const);

  // Read once in the body (research 4.6); every closure below keeps this value.
  const field = NumberFieldContext();

  // --- Effective state ------------------------------------------------------
  const isDisabled = computed(() => local.disabled ?? field?.isDisabled() ?? false);

  const isInvalid = computed(() => {
    if (local["aria-invalid"] === true || local["aria-invalid"] === "true") {
      return true;
    }

    return field?.isInvalid() ?? false;
  });

  const isReadOnly = computed(() => local.readOnly ?? field?.isReadOnly() ?? false);

  // --- Text -----------------------------------------------------------------
  // Standalone, the input keeps its own uncontrolled text; inside a field the
  // field's text is the single source (a caller's `value` still wins, as
  // React Aria's merge does).
  const localText = signal(local.defaultValue ?? "");

  const displayValue = computed(() => {
    if (field !== null) {
      return local.value ?? field.text();
    }

    return local.value ?? localText();
  });

  // --- Keyboard layout ------------------------------------------------------
  const keyboardType = computed<NshInputProps["keyboardType"]>(() => {
    if (local.keyboardType !== undefined) {
      return local.keyboardType;
    }

    if (field !== null) {
      // RAC: a field whose lower bound may be negative needs the minus sign;
      // everything else is a decimal pad (port sheet §1.4).
      const min = field.minValue();

      return min === undefined || min < 0
        ? ("numbers-and-punctuation" as const)
        : ("decimal-pad" as const);
    }

    switch (local.inputMode) {
      case "numeric":
        return "numeric";
      case "decimal":
        return "decimal-pad";
      case "email":
        return "email-address";
      case "tel":
        return "phone-pad";
      case "url":
        return "url";
      default:
        return "default";
    }
  });

  // --- Local signals --------------------------------------------------------
  const hovered = signal(false);
  const focused = signal(false);

  // --- Focus handle ---------------------------------------------------------
  // The root focuses the input on a Label press and on a step-button press
  // (RAC's `onButtonPressStart`). The handle is registered while mounted.
  let inputNode: InputRef | undefined;

  const handleRef = (node: InputRef) => {
    inputNode = node;
    local.ref?.(node);
  };

  const registerFocus = field?.registerInputFocus;

  if (registerFocus) {
    cleanup(registerFocus(() => inputNode?.focus()));
  }

  // --- Spin-button keys (port sheet §5) ------------------------------------
  // Bound only while the input has the focus, and with `when: "always"` so the
  // focused text input does not swallow arrows, Home and End. `repeat` is
  // RAC's `allowRepeats`. Return and Space are left unbound: they arrive as a
  // native press, and Enter is the input's `onSubmit`.
  effect(() => {
    if (!focused()) {
      return;
    }

    const owner = field;

    if (owner === null) {
      return;
    }

    return keymap.bind(
      {
        up: () => owner.increment(),
        down: () => owner.decrement(),
        pageup: () => owner.increment(),
        pagedown: () => owner.decrement(),
        home: () => owner.decrementToMin(),
        end: () => owner.incrementToMax(),
      },
      { when: "always", repeat: true },
    );
  });

  // --- Events ---------------------------------------------------------------
  const handleChange = (event: { value: string }) => {
    if (field !== null) {
      field.setInputValue(event.value);
    } else {
      localText.set(event.value);
    }

    local.onChange?.(event);
  };

  // A text input hears a press natively, but NSH's test and assistive layers
  // only treat a host as pressable when it has a press listener. The focus is
  // the only thing a press into the box does before the native caret handling.
  const handlePress = (event: PressEvent) => {
    inputNode?.focus();
    local.onPress?.(event);
  };

  const handleFocus = () => {
    focused.set(true);
    field?.handleFocus();
    local.onFocus?.();
  };

  const handleBlur = () => {
    // Commit first: the field announces only while it still counts as focused.
    field?.handleBlur();
    focused.set(false);
    local.onBlur?.();
  };

  const handleSubmit = (event: { text: string }) => {
    field?.commit();
    local.onSubmit?.(event);
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

  // --- Accessibility --------------------------------------------------------
  const accessibilityValue = () => {
    if (field === null) {
      return local.accessibilityValue;
    }

    const current = field.numberValue();
    const min = field.minValue();
    const max = field.maxValue();

    // RAC clears `aria-valuenow` / `aria-valuetext` (the input stays a
    // textbox there); NSH's spinbutton reports the value instead, with no
    // `now` while the field is empty (port sheet §2).
    if (Number.isNaN(current)) {
      return { min, max };
    }

    return { min, max, now: current, text: field.text() || undefined };
  };

  const handleAccessibilityAction = (event: { actionName: string }) => {
    local.onAccessibilityAction?.(event);

    if (field === null) {
      return;
    }

    if (event.actionName === "increment") {
      field.increment();
    } else if (event.actionName === "decrement") {
      field.decrement();
    }
  };

  // --- Classes --------------------------------------------------------------
  const buildRenderProps = (): NumberFieldInputRenderProps => ({
    isHovered: hovered,
    isFocused: focused,
    isFocusVisible: focused,
    isDisabled,
    isInvalid,
    defaultClassName: field?.slots.input() ?? "",
    defaultStyle: {},
  });

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(buildRenderProps()) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(buildRenderProps()) : value;
  };

  const classes = computed(() =>
    joinClassNames(field?.slots.input() ?? "", resolvedClassName()),
  );

  return (
    <Input
      {...hostProps(rest)}
      ref={handleRef}
      nativeID={local.id ?? local.nativeID ?? field?.inputId()}
      value={displayValue()}
      placeholder={local.placeholder}
      maxLength={local.maxLength}
      onChange={handleChange}
      onSubmit={handleSubmit}
      // A disabled text field accepts no edits upstream. NSH 0.4.0's `disabled`
      // host prop blocks presses, focus and the accessibility state but leaves
      // the native field editable in the headless host, so `readonly` carries
      // the editing side of both states (color-input-group does the same).
      disabled={isDisabled()}
      readonly={isReadOnly() || isDisabled()}
      // RAC keeps the focus on Enter; NSH's default `blurAndSubmit` would move
      // it away, so return submits in place (port sheet §5).
      submitBehavior="submit"
      autoFocus={local.autoFocus ?? field?.autoFocus() ?? false}
      autoComplete={local.autoComplete ?? "off"}
      autoCorrect={local.autoCorrect ?? false}
      // R-018's `type` is fixed to "text" upstream; NSH's host has no type, so
      // the keyboard layout is the only mapping that remains.
      keyboardType={keyboardType()}
      accessibilityLabel={
        local["aria-label"] ??
        local.accessibilityLabel ??
        field?.ariaLabel() ??
        field?.labelText()
      }
      accessibilityHint={local.accessibilityHint ?? field?.accessibilityHint()}
      // Inside a field the input is NSH's spinbutton; standalone it stays a
      // plain text field, as RAC's empty input context leaves it.
      role={field !== null ? "spinbutton" : undefined}
      accessibilityValue={accessibilityValue()}
      accessibilityActions={
        field !== null ? [{ name: "increment" }, { name: "decrement" }] : undefined
      }
      onAccessibilityAction={field !== null ? handleAccessibilityAction : undefined}
      class={classes()}
      style={resolvedStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
