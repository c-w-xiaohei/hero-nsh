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

import { createInput } from "../../primitives/environment";
import { joinClassNames } from "./class-names";
import {
  ColorInputGroupContext,
  type ColorInputGroupEnterKeyHint,
  ColorInputGroupFieldContext,
} from "./context";
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
 * submission or browser validation, and that DOM events beyond `onKeyDown`,
 * `onKeyUp`, `onKeyPress` / `onPaste` have no channel. `hostProps` drops them
 * before the host spread.
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
  /**
   * The HTML `enterKeyHint`; mapped to the soft keyboard's return-key label
   * (`"enter"` / `"previous"` → `"default"`). `returnKeyType` wins over it
   * (A-005).
   */
  enterKeyHint?: ColorInputGroupEnterKeyHint;
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
      | "onSubmit"
      | "submitBehavior"
      | "returnKeyType"
      | "autoComplete"
      | "autoCorrect"
      | "autoCapitalize"
      | "maxLength"
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

  /** Return in the input reports the text; the field's commit runs first. */
  onSubmit?: (event: { text: string }) => void;

  /**
   * What Return does: `"submit"` reports `onSubmit` and keeps the focus,
   * `"blurAndSubmit"` also unfocuses. Inside a field with a commit the
   * default is `"submit"` (RAC's keep-focus); standalone the host's
   * single-line default `"blurAndSubmit"` applies.
   */
  submitBehavior?: NshInputProps["submitBehavior"];

  /** The soft keyboard's return key label; wins over `enterKeyHint`. */
  returnKeyType?: NshInputProps["returnKeyType"];

  /** The HTML attribute; only the values NSH knows reach the host. */
  autoComplete?: string;

  /** The HTML `"on"` / `"off"` string (an NSH boolean stays); `"off"` turns it off. */
  autoCorrect?: string | boolean;

  /**
   * The HTML attribute; only the values NSH knows reach the host. Defaults
   * to `"none"`: a color value is lowercase hex digits or format keywords,
   * and the soft keyboard's sentence capitalization (NSH's host default
   * since 0.7 types through it on iOS) corrupts it, while upstream never
   * declares one because a desktop browser input does not autoshift
   * (platform-driven deviation, port sheet §8).
   */
  autoCapitalize?: string;

  /** The most characters the input accepts. */
  maxLength?: number;

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
    "submitBehavior",
    "returnKeyType",
    "enterKeyHint",
    "autoComplete",
    "autoCorrect",
    "autoCapitalize",
    "maxLength",
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

  // A-004: the same environment axis the Root gates its hover on.
  const input = createInput();

  // --- Keyboard / submit chain (A-005) --------------------------------------
  // An explicit `submitBehavior` wins — it used to be a host prop `rest`
  // could carry until the line below overwrote it with `undefined`. With a
  // field commit the RAC default keeps the focus (`"submit"`); standalone the
  // host's single-line default (`"blurAndSubmit"`) applies.
  const submitBehavior = computed<NshInputProps["submitBehavior"]>(
    () => local.submitBehavior ?? (field?.onSubmit !== undefined ? "submit" : undefined),
  );

  const returnKeyType = computed<NshInputProps["returnKeyType"]>(() => {
    if (local.returnKeyType !== undefined) {
      return local.returnKeyType;
    }

    // A direct `enterKeyHint` wins over the field's, as upstream's input prop
    // does. NSH has no "previous" key label; the platform default stands in
    // (text-control's mapping, A-005).
    switch (local.enterKeyHint ?? field?.enterKeyHint?.()) {
      case "enter":
      case "previous":
        return "default";
      case "done":
        return "done";
      case "go":
        return "go";
      case "next":
        return "next";
      case "search":
        return "search";
      case "send":
        return "send";
      default:
        return undefined;
    }
  });

  const autoComplete = computed(() => toAutoComplete(local.autoComplete));

  const autoCorrect = computed(() => {
    // Upstream's `autoCorrect` is the HTML string `"on"` / `"off"`; NSH's is a
    // boolean. Only `"off"` / `false` turns it off.
    const read = local.autoCorrect;

    return read === undefined ? undefined : read !== "off" && read !== false;
  });

  // The caller's explicit value wins (the whitelist passes it through); an
  // unknown string still drops to the host default, as before. Without one
  // the color channel's own default applies: hex letters and format
  // keywords are lowercase, so the soft keyboard's sentence capitalization
  // has nothing to offer here and everything to corrupt.
  const autoCapitalize = computed(() => toAutoCapitalize(local.autoCapitalize) ?? "none");

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

    // A-004: the input's hover face is touch-gated the same way the Root's
    // is — under touch the signal, `isHovered` render-prop value and the
    // `onHover*` callbacks stay off; the host `onMouseEnter` still reports.
    if (input() === "touch" || isDisabled() || hovered()) {
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
      // A-005 / A-006: the caller's explicit value wins; a field with a
      // commit keeps Return in place (`"submit"`), and standalone keeps the
      // host's single-line default.
      submitBehavior={submitBehavior()}
      // A-005: the keyboard-props chain of the G action — `returnKeyType`,
      // the `enterKeyHint` mapping, and the HTML autofill attributes with
      // NSH's own values still passing through unchanged.
      returnKeyType={returnKeyType()}
      autoComplete={autoComplete()}
      autoCorrect={autoCorrect()}
      autoCapitalize={autoCapitalize()}
      maxLength={local.maxLength}
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

/* -------------------------------------------------------------------------------------------------
 * Helpers (text-control.tsx's same mapping, A-005)
 * -----------------------------------------------------------------------------------------------*/

/**
 * The `autoComplete` values the host understands: React Native's names plus
 * iOS's `TextContentType` spellings. The prop takes HTML's attribute values,
 * so anything outside both lists is dropped instead of reaching the host.
 */
const AUTO_COMPLETE_VALUES: readonly string[] = [
  "off",
  "username",
  "password",
  "current-password",
  "new-password",
  "one-time-code",
  "sms-otp",
  "email",
  "tel",
  "name",
  "given-name",
  "family-name",
  "additional-name",
  "nickname",
  "organization",
  "street-address",
  "address-line1",
  "address-line2",
  "address-level1",
  "address-level2",
  "postal-code",
  "country",
  "cc-number",
  "cc-exp",
  "cc-csc",
  "cc-name",
  "url",
  "birthdate-full",
  // iOS's `TextContentType` spellings, which `NshInputProps["autoComplete"]`
  // already accepted when the prop reached the host through `rest`.
  "none",
  "newPassword",
  "oneTimeCode",
  "emailAddress",
  "telephoneNumber",
  "givenName",
  "middleName",
  "familyName",
  "organizationName",
  "fullStreetAddress",
  "streetAddressLine1",
  "streetAddressLine2",
  "addressCity",
  "addressState",
  "postalCode",
  "countryName",
  "creditCardNumber",
  "creditCardExpiration",
  "creditCardSecurityCode",
  "creditCardName",
  "URL",
  "birthdate",
];

/** Passes an autofill value through when NSH knows it; drops the rest (`"on"`). */
function toAutoComplete(value: string | undefined): NshInputProps["autoComplete"] {
  if (value === undefined || !AUTO_COMPLETE_VALUES.includes(value)) {
    return undefined;
  }

  return value as NshInputProps["autoComplete"];
}

/** Passes an HTML `autoCapitalize` through when NSH knows it. */
function toAutoCapitalize(value: string | undefined): NshInputProps["autoCapitalize"] {
  switch (value) {
    case "none":
    case "sentences":
    case "words":
    case "characters":
      return value;
    default:
      return undefined;
  }
}
