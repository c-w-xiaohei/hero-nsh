import type { InputProps as NshInputProps } from "nsh/base";
import { Input } from "nsh/base";
import type {
  Accessor,
  InputRef,
  InputStyle,
  JSX,
  MouseEvent as NshMouseEvent,
  PasteEvent,
  PressEvent,
  StyleProp,
} from "nsh";
import { cleanup, computed, effect, signal, split, untracked } from "nsh";

import { joinClassNames } from "./class-names";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./search-field-dom-props";
import {
  type SearchFieldEnterKeyHint,
  type SearchFieldInputMode,
  SearchFieldContext,
  SearchFieldGroupContext,
} from "./search-field-context";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The values HeroUI's `Input` hands to its render props (React Aria
 * `Input.tsx:28-54`), as accessors per D17.
 */
export interface SearchFieldInputRenderProps {
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
}

/** What the input's `className` function receives. */
export interface SearchFieldInputClassNameRenderProps extends SearchFieldInputRenderProps {
  /** The `input` slot's class string, before the caller's `className`. */
  defaultClassName: string;
}

/** What the input's `style` function receives. */
export interface SearchFieldInputStyleRenderProps extends SearchFieldInputRenderProps {
  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: InputStyle;
}

/* -------------------------------------------------------------------------------------------------
 * `<input>`-only attributes
 * -----------------------------------------------------------------------------------------------*/

/**
 * The members of `InputHTMLAttributes<HTMLInputElement>` that exist only
 * because HeroUI renders a real `<input>`. They are accepted so code written
 * against HeroUI keeps compiling; port sheet §1.4 and §8 register that NSH has
 * no form submission or browser validation, and that DOM events beyond
 * `onKeyPress` / `onPaste` have no channel. `hostProps` drops them before the
 * host spread.
 */
export interface SearchFieldInputDomProps {
  name?: string;
  form?: string;
  list?: string;
  pattern?: string;
  minLength?: number;
  spellCheck?: boolean;
  required?: boolean;
  size?: number;
  multiple?: boolean;
  step?: number | string;
  enterKeyHint?: SearchFieldEnterKeyHint;
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
 * SearchField Input
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `SearchField.Input`: HeroUI 3.2.7's `SearchFieldInputProps`,
 * which is React Aria Components' `Input` (the DOM input attributes plus
 * `HoverEvents` and the render props), expressed with NSH's `<Input>` host
 * props.
 *
 * Inside a field the value, setter, disabled, read-only, invalid and accessible
 * name / description come from the root's context; explicit props win, as
 * React Aria's merge does. Standalone, the input is a plain controlled /
 * uncontrolled text field (port sheet §1.4).
 */
export interface SearchFieldInputProps
  extends Omit<
      NshInputProps,
      | "children"
      | "class"
      | "style"
      | "ref"
      | "value"
      | "defaultValue"
      | "onChange"
      | "onSubmit"
      | "onFocus"
      | "onBlur"
      | "onMouseEnter"
      | "onMouseLeave"
      | "readonly"
      | "nativeID"
      | "masked"
      | "keyboardType"
      | "returnKeyType"
      | "autoComplete"
      | "autoCorrect"
      | "autoCapitalize"
      | "maxLength"
      | "autoFocus"
      | "onPaste"
      | "onCompositionChange"
      | "onSelectionChange"
      | "accessibilityLabel"
      | "accessibilityHint"
      | "testID"
    >,
    AriaProps,
    DataProps,
    GlobalDomProps,
    SearchFieldInputDomProps {
  /** The text, controlled. Inside a field an explicit `value` wins over the root's. */
  value?: string;

  /** The initial text, uncontrolled. Inside a field the root's value wins over it. */
  defaultValue?: string;

  /**
   * The user edited the text. NSH has no DOM `ChangeEvent`, so the payload is
   * `{ value }` (§8). Inside a field the root's setter runs first and this
   * callback after it.
   */
  onChange?: (event: { value: string }) => void;

  /** The input cannot be edited but stays focusable and selectable. Explicit wins over the root's. */
  readOnly?: boolean;

  /**
   * The HTML input type; drives the keyboard layout and masking only
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
  inputMode?: SearchFieldInputMode;

  /** Hides the text (passwords); `type="password"` turns it on. */
  masked?: boolean;

  /** The keyboard layout; wins over the `type` / `inputMode` mapping. */
  keyboardType?: NshInputProps["keyboardType"];

  /** The soft keyboard's return key label; wins over the field's `enterKeyHint`. */
  returnKeyType?: NshInputProps["returnKeyType"];

  /** The HTML attribute; only the values NSH knows reach the host. */
  autoComplete?: string;

  /** The HTML `"on"` / `"off"` string, mapped to the host boolean. */
  autoCorrect?: string;

  /** The HTML attribute; only the values NSH knows reach the host. */
  autoCapitalize?: string;

  /** The most characters the input accepts. */
  maxLength?: number;

  /** Focuses the input when it mounts. */
  autoFocus?: boolean;

  /** The user pasted; NSH reports the content, not a DOM `ClipboardEvent`. */
  onPaste?: (event: PasteEvent) => void;

  /** An input method's composition; NSH reports all three phases on one event. */
  onCompositionChange?: (event: { composing: boolean; text: string }) => void;

  /** The caret / selection moved. */
  onSelectionChange?: (event: { start: number; end: number }) => void;

  /** Appended after the slot classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: SearchFieldInputClassNameRenderProps) => string | undefined);

  /** Style of the input; function form gets the same accessors. */
  style?:
    | StyleProp<InputStyle>
    | ((values: SearchFieldInputStyleRenderProps) => StyleProp<InputStyle>);

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to (NSH's counterpart of a DOM id). */
  nativeID?: string;

  /** The input's ref; a callback, as NSH forwards refs. */
  ref?: (node: InputRef) => void;

  /** The input took focus; also writes the field's focus signal. */
  onFocus?: () => void;

  /** The input lost focus; the field commits its validation here. */
  onBlur?: () => void;

  /** The pointer entered the input (off while disabled). */
  onMouseEnter?: (event: NshMouseEvent) => void;

  /** The pointer left the input. */
  onMouseLeave?: (event: NshMouseEvent) => void;

  /** The pointer entered the input (off while disabled). */
  onHoverStart?: (event: NshMouseEvent) => void;

  /** The pointer left the input. */
  onHoverEnd?: (event: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /**
   * A press on the input. The input takes presses so that a pointer press
   * focuses it, as a browser's click does; the caller's callback runs after
   * that focus.
   */
  onPress?: (event: PressEvent) => void;

  /** The accessible name; wins over the field root's registered Label text. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references, the field registers the name instead. */
  "aria-labelledby"?: string;

  /** Accepted, no effect, as `aria-labelledby`. */
  "aria-describedby"?: string;

  /** The accessible name through NSH's own prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** The accessible description through NSH's own prop, above the field's registered description. */
  accessibilityHint?: string;

  /** A test identity; not part of HeroUI's API, useful to the harness. */
  testID?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * `SearchField.Input` / `SearchFieldInput`: the native single-line text input
 * (nsh/base `Input`, port sheet §3 B1 … B4). It holds no value of its own
 * inside a field; it writes the root's and follows it, so a controlled field
 * has exactly one source of truth.
 */
export function SearchFieldInput(props: SearchFieldInputProps): JSX.Element {
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
    "returnKeyType",
    "autoComplete",
    "autoCorrect",
    "autoCapitalize",
    "maxLength",
    "autoFocus",
    "onPaste",
    "onCompositionChange",
    "onSelectionChange",
    "onFocus",
    "onBlur",
    "onMouseEnter",
    "onMouseLeave",
    "onHoverStart",
    "onHoverEnd",
    "onHoverChange",
    "onPress",
    "aria-label",
    "aria-invalid",
    "accessibilityLabel",
    "accessibilityHint",
    "testID",
    "name",
    "form",
    "list",
    "pattern",
    "minLength",
    "spellCheck",
    "required",
    "size",
    "multiple",
    "step",
    "enterKeyHint",
    "onKeyDown",
    "onKeyUp",
    "onBeforeInput",
    "onInput",
    "onCopy",
    "onCut",
    "onSelect",
    "onClick",
    "onDoubleClick",
    "onMouseDown",
    "render",
    "slot",
  ] as const);

  // Both optional providers, read once in the body (research 4.6).
  const field = SearchFieldContext();
  const group = SearchFieldGroupContext();
  const bindings = field?.input;

  // --- Effective state ------------------------------------------------------
  const isDisabled = computed(() => local.disabled ?? bindings?.isDisabled() ?? false);

  const isReadOnly = computed(() => local.readOnly ?? bindings?.isReadOnly() ?? false);

  const isInvalid = computed(() => {
    if (local["aria-invalid"] === true || local["aria-invalid"] === "true") {
      return true;
    }

    return bindings?.isInvalid() ?? false;
  });

  // --- Value ----------------------------------------------------------------
  // Inside a field the caller's own `value` wins and the root's follows it;
  // otherwise `value` / `defaultValue` behave as an uncontrolled / controlled
  // input. The uncontrolled value is always written back into `value`: NSH's
  // web input takes a present `value` as the controlled text, so handing it
  // `undefined` would pin it to the empty string there.
  const localValue = signal(local.defaultValue ?? "");

  const acceptedValue = computed(() => {
    if (local.value !== undefined) {
      return local.value;
    }

    if (bindings) {
      return bindings.value();
    }

    return localValue();
  });

  // What the host input shows. It follows the accepted value, and it is also
  // what a rejected controlled edit is corrected through: NSH's input applies a
  // `value` prop when the prop changes, so a controlled field whose owner keeps
  // its value would otherwise keep the characters the user just typed (React
  // restores the owner's value on every input event). Writing a distinct value
  // and then the owner's one makes the correction land; both writes are in the
  // same turn, so no frame shows the intermediate text (measured).
  const display = signal(acceptedValue());

  effect(() => {
    const next = acceptedValue();

    if (untracked(() => display()) !== next) {
      display.set(next);
    }
  });

  // --- Attribute mappings ---------------------------------------------------
  const keyboardType = computed(() => {
    // An explicit NSH keyboard type wins, then an explicit inputMode, then the
    // mapping from `type`.
    if (local.keyboardType !== undefined) {
      return local.keyboardType;
    }

    const mode = local.inputMode ?? bindings?.inputMode();

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

    switch (local.type ?? bindings?.type()) {
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

  const masked = computed(() =>
    (local.type ?? bindings?.type()) === "password" ? true : local.masked,
  );

  const autoComplete = computed(() =>
    toAutoComplete(local.autoComplete ?? bindings?.autoComplete()),
  );

  const autoCorrect = computed(() => {
    const read = local.autoCorrect ?? bindings?.autoCorrect();

    // Upstream's `autoCorrect` is the HTML string `"on"` / `"off"`; NSH's is a
    // boolean. Only `"off"` turns it off.
    return read === undefined ? undefined : read !== "off";
  });

  const autoCapitalize = computed(() =>
    toAutoCapitalize(local.autoCapitalize ?? bindings?.autoCapitalize()),
  );

  const returnKeyType = computed<NshInputProps["returnKeyType"]>(() => {
    if (local.returnKeyType !== undefined) {
      return local.returnKeyType;
    }

    switch (bindings?.enterKeyHint()) {
      case "enter":
      case "previous":
        // NSH has no "previous" key label; the platform default stands in.
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

  const maxLength = computed(() => local.maxLength ?? bindings?.maxLength());

  const autoFocus = computed(() => local.autoFocus ?? bindings?.autoFocus());

  // --- Local signals --------------------------------------------------------
  const hovered = signal(false);
  const focused = signal(false);

  // --- Classes --------------------------------------------------------------
  const renderProps: SearchFieldInputRenderProps = {
    isHovered: hovered,
    isFocused: focused,
    isFocusVisible: focused,
    isDisabled,
    isInvalid,
  };

  const classNameRenderProps: SearchFieldInputClassNameRenderProps = {
    ...renderProps,
    defaultClassName: field?.slots.input() ?? "",
  };

  const styleRenderProps: SearchFieldInputStyleRenderProps = {
    ...renderProps,
    defaultStyle: {},
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(classNameRenderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(styleRenderProps) : value;
  };

  const classes = computed(() =>
    joinClassNames(field?.slots.input() ?? "", resolvedClassName()),
  );

  const hasSearchIcon = computed(() => group?.hasSearchIcon() ?? false);
  const hasClearButton = computed(() => group?.hasClearButton() ?? false);

  // --- Focus handle ---------------------------------------------------------
  // The input's `focus()` is what a `<label for>` and the clear button's
  // `onPressStart` call (port sheet §2). It reads the node lazily, so a focus
  // request before the ref lands is simply a no-op.
  let node: InputRef | undefined;

  const registerInputFocus = field?.registerInputFocus;

  if (registerInputFocus) {
    cleanup(registerInputFocus(() => node?.focus()));
  }

  // --- Events ---------------------------------------------------------------
  const handleChange = (event: { value: string }) => {
    if (bindings) {
      // Inside a field: the root's value first, then the caller's callback —
      // React Aria's merge runs both, and the field owns the text (§1.4).
      bindings.setValue(event.value);
      local.onChange?.(event);
    } else {
      if (local.value === undefined) {
        localValue.set(event.value);
      }

      local.onChange?.(event);
    }

    // The owner (or the uncontrolled local signal) may have answered this edit
    // synchronously. When it did not, the host text is the user's characters
    // while the field's value is the owner's, and React's controlled input
    // would restore the owner's text here. Two writes make NSH apply the
    // correction: the host ignores a `value` it already carries.
    const expected = acceptedValue();

    if (event.value !== expected) {
      display.set(`${expected}\u200B`);
      display.set(expected);
    }
  };

  const handleSubmit = () => {
    bindings?.submit();
  };

  const handlePaste = (event: PasteEvent) => {
    bindings?.onPaste?.(event);
    local.onPaste?.(event);
  };

  const handleCompositionChange = (event: { composing: boolean; text: string }) => {
    bindings?.onCompositionChange?.(event);
    local.onCompositionChange?.(event);
  };

  const handleSelectionChange = (event: { start: number; end: number }) => {
    bindings?.onSelectionChange?.(event);
    local.onSelectionChange?.(event);
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

  // A press on the input focuses it, as a browser's click does. NSH does not
  // move the focus with a pointer press and a view hears presses only while it
  // has an `onPress` handler, so the input takes presses and moves its own
  // focus — the same shape DateInputGroup's slot input uses for its segments.
  // Return / Space on the focused input also arrive as a press; focusing again
  // is a no-op, so the keyboard path stays with the host.
  const handlePress = (event: PressEvent) => {
    local.onPress?.(event);

    if (!isDisabled()) {
      node?.focus();
    }
  };

  const handleFocus = () => {
    focused.set(true);
    // The field's focus state, its `onFocus` and `onFocusChange`, then the
    // group's `:focus-within`.
    bindings?.focus();
    group?.setFocusWithin(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    // The field commits its validation here (React Stately's
    // `useFormValidationState`) and reports `onBlur` / `onFocusChange`.
    bindings?.blur();
    group?.setFocusWithin(false);
    local.onBlur?.();
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
      ref={(next) => {
        node = next;
        local.ref?.(next);
      }}
      nativeID={local.id ?? local.nativeID}
      // A test identity, not HeroUI API; the host prop, beside the layout ones
      // that stay in `rest`.
      testID={local.testID}
      value={display()}
      onChange={handleChange}
      onSubmit={handleSubmit}
      // `submitBehavior="submit"` keeps the focus on Return, as upstream's
      // search field does (port sheet §2).
      submitBehavior="submit"
      disabled={isDisabled()}
      // NSH 0.4.0's `disabled` host prop blocks presses and focus and sets the
      // accessibility state but leaves the native text field editable in the
      // headless host, so `readonly` carries the editing side of the same
      // state; a read-only field is non-editable and selectable, which is the
      // disabled editing contract.
      readonly={isReadOnly() || isDisabled()}
      keyboardType={keyboardType()}
      masked={masked()}
      autoComplete={autoComplete()}
      autoCorrect={autoCorrect()}
      autoCapitalize={autoCapitalize()}
      returnKeyType={returnKeyType()}
      maxLength={maxLength()}
      autoFocus={autoFocus()}
      accessibilityLabel={
        local["aria-label"] ?? local.accessibilityLabel ?? bindings?.accessibilityLabel()
      }
      accessibilityHint={local.accessibilityHint ?? bindings?.accessibilityHint()}
      onPaste={handlePaste}
      onCompositionChange={handleCompositionChange}
      onSelectionChange={handleSelectionChange}
      class={classes()}
      classList={{
        // R-017: `:has([data-slot="search-field-search-icon"]) &` → `ps-2
        // rounded-s-none`; the registration replaces the descendant selector.
        "ps-2 rounded-s-none": hasSearchIcon(),
        // R-018: the clear-button twin → `pe-2 rounded-e-none`.
        "pe-2 rounded-e-none": hasClearButton(),
      }}
      style={resolvedStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPress={handlePress}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/** NSH's `AutoComplete` values, as the host understands them. */
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
];

/** Passes an HTML `autoComplete` through when NSH knows it; drops the rest (`"on"`). */
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
