import type { InputProps as NshInputProps } from "nsh/base";
import { Input } from "nsh/base";
import type {
  Accessor,
  InputRef,
  InputStyle,
  JSX,
  MouseEvent as NshMouseEvent,
  StyleProp,
} from "nsh";
import { cleanup, computed, signal, split } from "nsh";

import { joinClassNames } from "./class-names";
import { ColorInputGroupContext, ColorInputGroupFieldContext } from "./context";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./color-input-group-dom-props";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The values HeroUI's `Input` hands to its render props
 * (`react-aria-components/src/Input.tsx:28-54`), as accessors per D17.
 */
export interface ColorInputGroupInputRenderProps {
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
 * against HeroUI keeps compiling; §1.3 and §8 register that NSH has no form
 * submission or browser validation, and that DOM events beyond `onKeyPress` /
 * `onPaste` have no channel. `hostProps` drops them before the host spread.
 */
export interface ColorInputGroupInputDomProps {
  name?: string;
  form?: string;
  list?: string;
  pattern?: string;
  minLength?: number;
  spellCheck?: boolean;
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
 * ColorInputGroup Input
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorInputGroup.Input`: HeroUI 3.2.7's
 * `ColorInputGroupInputProps`, which is React Aria Components' `Input` (RAC
 * `InputProps`, i.e. the DOM input attributes plus `HoverEvents` and the render
 * props), expressed with NSH's `<Input>` host props.
 *
 * Inside a field the value, change, disabled, read-only and accessible name
 * come from `ColorInputGroupFieldContext`; explicit props win, as React Aria's
 * merge does. Standalone, the input is a plain controlled / uncontrolled text
 * field.
 */
export interface ColorInputGroupInputProps
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
      | "onMouseEnter"
      | "onMouseLeave"
      | "readonly"
      | "nativeID"
      | "masked"
      | "keyboardType"
    >,
    AriaProps,
    DataProps,
    GlobalDomProps,
    ColorInputGroupInputDomProps {
  /** The text, controlled. The field's value wins when there is a field root. */
  value?: string;

  /** The initial text, uncontrolled. */
  defaultValue?: string;

  /**
   * The user edited the text. NSH has no DOM `ChangeEvent`, so the payload is
   * `{ value }` (§8). When given, it is the only writer; otherwise the field
   * root's setter receives the value.
   */
  onChange?: (event: { value: string }) => void;

  /** The input cannot be edited but stays focusable and selectable. */
  readOnly?: boolean;

  /**
   * The HTML input type; drives the keyboard / masking only
   * (`password` → `masked`, `email` → `email-address`, `tel` → `phone-pad`,
   * `url` → `url`, `number` → `decimal-pad`, the rest `default`).
   */
  type?:
    | "text"
    | "search"
    | "email"
    | "password"
    | "tel"
    | "url"
    | "number"
    | (string & {});

  /** Wins over the mapping from `type`. */
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";

  /** Appended after the slot classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: ColorInputGroupInputRenderProps) => string | undefined);

  /** Style of the input; function form gets the same accessors. */
  style?:
    | StyleProp<InputStyle>
    | ((values: ColorInputGroupInputRenderProps) => StyleProp<InputStyle>);

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to (NSH's counterpart of a DOM id). */
  nativeID?: string;

  /** Hides the text (passwords); `type="password"` turns it on. */
  masked?: boolean;

  /** The keyboard layout; wins over the `type` / `inputMode` mapping. */
  keyboardType?: NshInputProps["keyboardType"];

  /** The input's ref; a callback, as NSH forwards refs. */
  ref?: (node: InputRef) => void;

  /** The input took focus; also writes the group's focus-within signal. */
  onFocus?: () => void;

  /** The input lost focus. */
  onBlur?: () => void;

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

  /** The accessible name; wins over the field root's registered Label text. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

export function ColorInputGroupInput(props: ColorInputGroupInputProps): JSX.Element {
  const [local, rest] = split(props, [
    "className",
    "style",
    "ref",
    "value",
    "defaultValue",
    "onChange",
    "disabled",
    "readOnly",
    "id",
    "nativeID",
    "type",
    "inputMode",
    "masked",
    "keyboardType",
    "onFocus",
    "onBlur",
    "placeholder",
    "autoFocus",
    "onSubmit",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "aria-label",
    "aria-invalid",
    "accessibilityLabel",
    "accessibilityHint",
  ] as const);

  // Both optional providers, read once in the body (research 4.6).
  const group = ColorInputGroupContext();
  const field = ColorInputGroupFieldContext();

  // --- Effective state ------------------------------------------------------
  const isDisabled = computed(() => local.disabled ?? field?.isDisabled?.() ?? false);

  const isInvalid = computed(() => {
    if (local["aria-invalid"] === true || local["aria-invalid"] === "true") {
      return true;
    }

    return field?.isInvalid?.() ?? false;
  });

  const isReadOnly = computed(() => local.readOnly ?? field?.isReadOnly?.() ?? false);

  // --- Value ----------------------------------------------------------------
  // The field value wins inside a field; otherwise the input is controlled by
  // `value` or uncontrolled from `defaultValue`. The uncontrolled value is kept
  // in a local signal and always written back into `value`: NSH's web input
  // takes a present `value` as the controlled text, so handing it `undefined`
  // for an uncontrolled input would pin it to the empty string there.
  const isControlled = () => field?.value !== undefined || local.value !== undefined;

  const localValue = signal(local.defaultValue ?? "");

  const value = computed(() => {
    if (isControlled()) {
      return field?.value?.() ?? local.value ?? "";
    }

    return localValue();
  });

  // --- Keyboard mapping -----------------------------------------------------
  const keyboardType = computed(() => {
    // An explicit NSH keyboard type wins, then an explicit inputMode, then the
    // mapping from `type`.
    if (local.keyboardType !== undefined) {
      return local.keyboardType;
    }

    const mode = local.inputMode;

    if (mode !== undefined) {
      switch (mode) {
        case "numeric":
          return "numeric" as const;
        case "decimal":
          return "decimal-pad" as const;
        case "email":
          return "email-address" as const;
        case "tel":
          return "phone-pad" as const;
        case "url":
          return "url" as const;
        default:
          return "default" as const;
      }
    }

    switch (local.type) {
      case "email":
        return "email-address" as const;
      case "tel":
        return "phone-pad" as const;
      case "url":
        return "url" as const;
      case "number":
        return "decimal-pad" as const;
      default:
        return "default" as const;
    }
  });

  const masked = computed(() => (local.type === "password" ? true : local.masked));

  // --- Local signals --------------------------------------------------------
  const hovered = signal(false);
  const focused = signal(false);

  // --- Focus handle ---------------------------------------------------------
  // A Label press focuses the field's control through `label for` upstream;
  // the handle is registered while the input is mounted (port sheet §5).
  let inputNode: InputRef | undefined;

  const handleRef = (node: InputRef) => {
    inputNode = node;
    local.ref?.(node);
  };

  const registerFocus = field?.registerInputFocus;

  if (registerFocus) {
    cleanup(registerFocus(() => inputNode?.focus()));
  }

  // --- Classes --------------------------------------------------------------
  const buildRenderProps = (): ColorInputGroupInputRenderProps => ({
    isHovered: hovered,
    isFocused: focused,
    isFocusVisible: focused,
    isDisabled,
    isInvalid,
    defaultClassName: group?.slots.input() ?? "",
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
    joinClassNames(group?.slots.input() ?? "", resolvedClassName()),
  );

  const hasPrefix = computed(() => group?.hasPrefix() ?? false);
  const hasSuffix = computed(() => group?.hasSuffix() ?? false);

  // --- Events ---------------------------------------------------------------
  const handleChange = (event: { value: string }) => {
    if (!isControlled()) {
      localValue.set(event.value);
    }

    // RAC's merge runs both handlers; the port sheet §1.3 says an explicit
    // caller callback is the only writer, and the field gets the value only
    // when the caller gave none.
    if (local.onChange !== undefined) {
      local.onChange(event);
      return;
    }

    field?.setValue?.(event.value);
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

  const handleFocus = () => {
    focused.set(true);
    // `:focus-within` on the group, written by its only focus stop (§2, R-010).
    group?.setFocusWithin(true);
    field?.onFocus?.();
    local.onFocus?.();
  };

  const handleBlur = () => {
    // The field commits before the focus flips, as React Aria's blur handler
    // does, so an announce still sees the field as focused.
    field?.onBlur?.();
    focused.set(false);
    group?.setFocusWithin(false);
    local.onBlur?.();
  };

  const handleSubmit = (event: { text: string }) => {
    field?.onSubmit?.(event);
    local.onSubmit?.(event);
  };

  // The input unmounting while focused must not leave the group lit.
  cleanup(() => {
    if (focused()) {
      group?.setFocusWithin(false);
    }
  });

  return (
    <Input
      {...hostProps(rest)}
      ref={handleRef}
      nativeID={local.id ?? local.nativeID}
      value={value()}
      placeholder={local.placeholder ?? field?.placeholder?.()}
      autoFocus={local.autoFocus ?? field?.autoFocus?.()}
      onChange={handleChange}
      onSubmit={handleSubmit}
      submitBehavior={field?.onSubmit !== undefined ? "submit" : undefined}
      disabled={isDisabled()}
      // A disabled text field accepts no edits upstream. NSH 0.4.0's `disabled`
      // host prop blocks presses and focus and sets the accessibility state but
      // leaves the native text field editable in the headless host, so `readonly`
      // carries the editing side of the same state; a read-only field is
      // non-editable and selectable, which is exactly the disabled editing
      // contract (the caret / focus half still comes from `disabled`).
      readonly={isReadOnly() || isDisabled()}
      keyboardType={keyboardType()}
      masked={masked()}
      accessibilityLabel={
        local["aria-label"] ?? local.accessibilityLabel ?? field?.accessibilityLabel?.()
      }
      accessibilityHint={local.accessibilityHint ?? field?.accessibilityHint?.()}
      class={classes()}
      classList={{
        // R-017: `:has([data-slot="color-input-group-prefix"]) &` → `ps-2
        // rounded-s-none`; the registration replaces the descendant selector.
        "ps-2 rounded-s-none": hasPrefix(),
        // R-018: the suffix twin → `pe-2 rounded-e-none`.
        "pe-2 rounded-e-none": hasSuffix(),
      }}
      style={resolvedStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
