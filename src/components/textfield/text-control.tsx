import type { InputProps as NshInputProps } from "nsh/base";
import { Input } from "nsh/base";
import type {
  Accessor,
  AccessibilityRole,
  AccessibilityState,
  InputRef,
  InputStyle,
  JSX,
  MouseEvent as NshMouseEvent,
  PasteEvent,
  PressEvent,
  StyleProp,
} from "nsh";
import {
  cleanup,
  computed,
  effect,
  reduceMotion,
  signal,
  split,
  untracked,
} from "nsh";

import { joinClassNames } from "./class-names";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./textfield-dom-props";
import {
  TextFieldContext,
  type TextFieldEnterKeyHint,
  type TextFieldInputMode,
  type TextFieldVariant,
} from "./textfield-context";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The values HeroUI's `Input` / `TextArea` hand to their render props (React
 * Aria `Input.tsx:28-54`), as accessors per D17.
 */
export interface TextControlRenderProps {
  /** A pointer rests on the field (off while disabled). */
  isHovered: Accessor<boolean>;

  /** The field has keyboard focus. */
  isFocused: Accessor<boolean>;

  /** A text input counts as focus-visible as soon as it is focused. */
  isFocusVisible: Accessor<boolean>;

  /** The effective disabled state. */
  isDisabled: Accessor<boolean>;

  /** The effective invalid state. */
  isInvalid: Accessor<boolean>;
}

/** What `className`'s function form receives. */
export interface TextControlClassNameRenderProps extends TextControlRenderProps {
  /** The class string the part carries without `className`. */
  defaultClassName: string;
}

/** What `style`'s function form receives. */
export interface TextControlStyleRenderProps extends TextControlRenderProps {
  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: InputStyle;
}

/* -------------------------------------------------------------------------------------------------
 * `<input>` / `<textarea>`-only attributes
 * -----------------------------------------------------------------------------------------------*/

/**
 * The members of `InputHTMLAttributes` / `TextareaHTMLAttributes` that exist
 * only because HeroUI renders a real DOM control. They are accepted so code
 * written against HeroUI keeps compiling; port sheet §1.3, §1.4 and §8
 * register that NSH has no form submission or browser validation, and that the
 * remaining DOM events have no channel.
 */
export interface TextControlDomProps {
  name?: string;
  form?: string;
  list?: string;
  pattern?: string;
  minLength?: number;
  spellCheck?: boolean;
  required?: boolean;
  size?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  multiple?: boolean;
  accept?: string;
  alt?: string;
  src?: string;
  width?: number | string;
  height?: number | string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;
  dirName?: string;
  popover?: string;
  accessKey?: string;
  title?: string;
  tabIndex?: number;
  draggable?: boolean;
  capture?: boolean | "user" | "environment";
  autoSave?: string;
  results?: number;
  enterKeyHint?: TextFieldEnterKeyHint;
  onKeyDown?: unknown;
  onKeyUp?: unknown;
  onBeforeInput?: unknown;
  onInput?: unknown;
  onCopy?: unknown;
  onCut?: unknown;
  onLoad?: unknown;
  onError?: unknown;
  /** The HTML `onSelect`, mapped to NSH's selection payload. */
  onSelect?: (event: { start: number; end: number }) => void;
  onClick?: unknown;
  onDoubleClick?: unknown;
  onMouseDown?: unknown;
}

/**
 * The props `Input` and `TextArea` share. They are HeroUI's
 * `ComponentPropsWithRef<typeof InputPrimitive>` / `TextAreaPrimitive` (React
 * Aria's `Input`, i.e. the DOM input attributes, `HoverEvents` and the render
 * props) expressed with NSH's `<Input>` host props.
 *
 * The shared control in this file reads one canonical shape; the two public
 * components narrow it with the members only they accept (`type` / `masked`
 * for `Input`, `rows` / `cols` / `wrap` and a `resize`-tolerant style for
 * `TextArea`).
 */
export interface TextControlCommonProps
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
      | "onKeyPress"
      | "accessibilityLabel"
      | "accessibilityHint"
      | "testID"
      | "multiline"
      | "type"
      | "rows"
      | "cols"
      | "wrap"
    >,
    AriaProps,
    DataProps,
    GlobalDomProps,
    TextControlDomProps {
  /** The text, controlled. Inside a field an explicit `value` wins over the root's. */
  value?: string;

  /** The initial text, uncontrolled. Inside a field the root's value wins. */
  defaultValue?: string;

  /**
   * The user edited the text. NSH has no DOM `ChangeEvent`, so the payload is
   * `{ value }` (§8). Inside a field the root's setter runs first and this
   * callback after it.
   */
  onChange?: (event: { value: string }) => void;

  /** The control cannot be edited but stays focusable and selectable. */
  readOnly?: boolean;

  /** The control is disabled; wins over the field's state. */
  disabled?: boolean;

  /** The keyboard layout; wins over the `type` / `inputMode` mapping. */
  keyboardType?: NshInputProps["keyboardType"];

  /** The HTML `inputMode`; mapped to the keyboard layout when `keyboardType` is absent. */
  inputMode?: TextFieldInputMode;

  /** The soft keyboard's return key label; wins over `enterKeyHint`. */
  returnKeyType?: NshInputProps["returnKeyType"];

  /** The HTML attribute; only the values NSH knows reach the host. */
  autoComplete?: string;

  /** The HTML `"on"` / `"off"` string, mapped to the host boolean. */
  autoCorrect?: string;

  /** The HTML attribute; only the values NSH knows reach the host. */
  autoCapitalize?: string;

  /** The most characters the control accepts. */
  maxLength?: number;

  /** Focuses the control when it mounts. */
  autoFocus?: boolean;

  /** The fill flavor; the field's wins only when this is absent. */
  variant?: TextFieldVariant;

  /** Stretches the control; the field's `true` is OR-ed in (R-004 / R-022). */
  fullWidth?: boolean;

  /** The user pasted; NSH reports the content, not a DOM `ClipboardEvent`. */
  onPaste?: (event: PasteEvent) => void;

  /** An input method's composition; NSH reports all three phases on one event. */
  onCompositionChange?: (event: { composing: boolean; text: string }) => void;

  /** The caret / selection moved. */
  onSelectionChange?: (event: { start: number; end: number }) => void;

  /** Appended after the slot classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: TextControlClassNameRenderProps) => string | undefined);

  /** Style of the control; function form gets the same accessors. */
  style?: StyleProp<InputStyle> | ((values: TextControlStyleRenderProps) => StyleProp<InputStyle>);

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to (NSH's counterpart of a DOM id). */
  nativeID?: string;

  /** The control's ref; a callback, as NSH forwards refs. */
  ref?: (node: InputRef) => void;

  /** The control took focus; the field's focus state follows. */
  onFocus?: () => void;

  /** The control lost focus; the field commits its validation here. */
  onBlur?: () => void;

  /** The pointer entered the control (off while disabled). */
  onMouseEnter?: (event: NshMouseEvent) => void;

  /** The pointer left the control. */
  onMouseLeave?: (event: NshMouseEvent) => void;

  /** The pointer entered the control (off while disabled). */
  onHoverStart?: (event: NshMouseEvent) => void;

  /** The pointer left the control. */
  onHoverEnd?: (event: NshMouseEvent) => void;

  /** Both hover transitions, as React Aria's `useHover` reports them. */
  onHoverChange?: (isHovered: boolean) => void;

  /**
   * A press on the control. It takes presses so a pointer press focuses it, as
   * a browser's click does; the caller's callback runs after that focus.
   */
  onPress?: (event: PressEvent) => void;

  /** Characters, Backspace and Enter reach an NSH input; other keys do not (§8). */
  onKeyPress?: (event: { key: string }) => void;

  /** The accessible name; wins over the field root's registered Label text. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references, the field registers the name instead. */
  "aria-labelledby"?: string;

  /** Accepted, no effect, as `aria-labelledby`. */
  "aria-describedby"?: string;

  /** The accessible name through NSH's own prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** The accessible description through NSH's own prop, above the field's registered one. */
  accessibilityHint?: string;

  /**
   * The input's role. A field that owns the input (ComboBox) supplies it
   * through the context; a caller's own `role` wins when both are present.
   */
  role?: AccessibilityRole;

  /** The accessibility state; the field's derived entries win over the caller's. */
  accessibilityState?: AccessibilityState;

  /** A test identity; not part of HeroUI's API, useful to the harness. */
  testID?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/** `TextArea`'s style accepts CSS's `resize`, which NSH cannot apply (port sheet §1.4). */
export type TextControlStyle = InputStyle & {
  resize?: "none" | "both" | "horizontal" | "vertical";
};

/** What the shared control reads besides `TextControlCommonProps`. */
export interface TextControlProps extends TextControlCommonProps {
  /** The HTML input type; `Input` only. */
  type?: string;

  /** Hides the text (passwords); `type="password"` turns it on. `Input` only. */
  masked?: boolean;

  /** The initial number of lines; `TextArea` only. */
  rows?: number;

  /** Accepted, no effect: NSH wraps by its layout width. `TextArea` only. */
  cols?: number;

  /** Accepted, no effect: NSH wraps by its layout width. `TextArea` only. */
  wrap?: "hard" | "soft" | "off";

  /** Style of the control; the `TextArea` form may carry `resize`. */
  style?:
    | StyleProp<TextControlStyle>
    | ((values: TextControlStyleRenderProps) => StyleProp<TextControlStyle>);
}

/** What differs between the two public components. */
export interface TextControlConfig {
  /** Several lines (`TextArea`). */
  multiline: boolean;

  /** The part's variant table resolved for the effective dimensions. */
  baseClass: (dimensions: { fullWidth: boolean; variant: TextFieldVariant }) => string;

  /** `rows` maps to a height (`TextArea` only). */
  usesRows: boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Shared control
 * -----------------------------------------------------------------------------------------------*/

/**
 * The body `Input` and `TextArea` share: HeroUI's `InputPrimitive` /
 * `TextAreaPrimitive` on nsh/base's native `Input`, reading the field wiring
 * from `TextFieldContext` and applying each part's own variant table.
 *
 * It is called from each public component's body (not a component of its own),
 * so the signals, the context read and the cleanup belong to that instance.
 * The sheet keeps `Input` and `TextArea` as two independent components; this
 * helper exists only so their identical host wiring is written once.
 */
export function renderTextControl(
  props: TextControlProps,
  config: TextControlConfig,
): JSX.Element {
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
    "testID",
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
    "rows",
    "cols",
    "wrap",
    "placeholder",
    "variant",
    "fullWidth",
    "onPaste",
    "onCompositionChange",
    "onSelectionChange",
    "onKeyPress",
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
    "aria-required",
    "aria-readonly",
    "accessibilityLabel",
    "accessibilityHint",
    "role",
    "accessibilityState",
    "name",
    "form",
    "list",
    "pattern",
    "minLength",
    "spellCheck",
    "size",
    "min",
    "max",
    "step",
    "multiple",
    "accept",
    "capture",
    "autoSave",
    "results",
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

  // Read once in the body (research 4.6); every closure below keeps this value.
  const field = TextFieldContext();

  // --- Effective state ------------------------------------------------------
  const isDisabled = computed(() => local.disabled ?? field?.isDisabled() ?? false);

  const isReadOnly = computed(() => local.readOnly ?? field?.isReadOnly() ?? false);

  const isInvalid = computed(() => {
    if (local["aria-invalid"] === true || local["aria-invalid"] === "true") {
      return true;
    }

    return field?.isInvalid() ?? false;
  });

  // --- Variant --------------------------------------------------------------
  // R-004 / R-022: the field's `fullWidth` and the part's are OR-ed; an explicit
  // `false` on the part cannot turn the field's stretch off, as upstream's
  // descendant selector is unconditional.
  const variant = computed<TextFieldVariant>(() =>
    local.variant ?? field?.variant() ?? "primary",
  );

  const fullWidth = computed(() => local.fullWidth === true || field?.fullWidth() === true);

  const baseClass = computed(() =>
    config.baseClass({ fullWidth: fullWidth(), variant: variant() }),
  );

  // --- Value ----------------------------------------------------------------
  // Inside a field the caller's own `value` wins and the root's follows it;
  // otherwise `value` / `defaultValue` behave as a controlled / uncontrolled
  // input. The uncontrolled value is always written back into `value`: NSH's
  // web input takes a present `value` as the controlled text, so handing it
  // `undefined` would pin it to the empty string there.
  const localValue = signal(local.defaultValue ?? "");

  const acceptedValue = computed(() => {
    if (local.value !== undefined) {
      return local.value;
    }

    if (field) {
      return field.value();
    }

    return localValue();
  });

  // What the host input shows. It follows the accepted value, and it is also
  // what a rejected controlled edit is corrected through: NSH's input applies a
  // `value` prop when the prop changes, so a controlled field whose owner keeps
  // its value would otherwise keep the characters the user just typed (React
  // restores the owner's value on every input event). Writing a distinct value
  // and then the owner's one makes the correction land; both writes are in the
  // same turn, so no frame shows the intermediate text (measured while porting
  // SearchField).
  const display = signal(acceptedValue());

  effect(() => {
    const next = acceptedValue();

    if (untracked(() => display()) !== next) {
      display.set(next);
    }
  });

  // --- Attribute mappings ---------------------------------------------------
  const keyboardType = computed<NshInputProps["keyboardType"]>(() => {
    // An explicit NSH keyboard type wins, then an explicit inputMode, then the
    // mapping from `type` (port sheet §1.3).
    if (local.keyboardType !== undefined) {
      return local.keyboardType;
    }

    const mode = local.inputMode ?? field?.inputMode();

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

    switch (local.type ?? field?.type()) {
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

  // `masked` belongs to a single-line input; a textarea has no password mode,
  // as upstream's `<textarea>` ignores `type`.
  const masked = computed(() =>
    config.multiline
      ? undefined
      : (local.masked ?? (local.type ?? field?.type()) === "password"),
  );

  const autoComplete = computed(() =>
    toAutoComplete(local.autoComplete ?? field?.autoComplete()),
  );

  const autoCorrect = computed(() => {
    const read = local.autoCorrect ?? field?.autoCorrect();

    // Upstream's `autoCorrect` is the HTML string `"on"` / `"off"`; NSH's is a
    // boolean. Only `"off"` turns it off.
    return read === undefined ? undefined : read !== "off";
  });

  const autoCapitalize = computed(() => toAutoCapitalize(local.autoCapitalize));

  const returnKeyType = computed<NshInputProps["returnKeyType"]>(() => {
    if (local.returnKeyType !== undefined) {
      return local.returnKeyType;
    }

    // A direct `enterKeyHint` wins over the field's, as upstream's input prop
    // does (port sheet §1.3).
    switch (local.enterKeyHint ?? field?.enterKeyHint()) {
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

  const maxLength = computed(() => local.maxLength ?? field?.maxLength());

  const autoFocus = computed(() => local.autoFocus ?? field?.autoFocus() ?? false);

  // --- Local signals --------------------------------------------------------
  const hovered = signal(false);
  const focused = signal(false);

  // --- Focus handle ---------------------------------------------------------
  // The field focuses the input on a Label press, standing in for
  // `<label for>` (port sheet §2). The handle is registered while mounted.
  let node: InputRef | undefined;

  const handleRef = (next: InputRef) => {
    node = next;
    local.ref?.(next);
  };

  const registerInputFocus = field?.registerInputFocus;

  if (registerInputFocus) {
    cleanup(registerInputFocus(() => node?.focus()));
  }

  // --- Events ---------------------------------------------------------------
  const handleChange = (event: { value: string }) => {
    if (field) {
      // Inside a field: the root's value first, then the caller's callback —
      // React Aria's merge runs both, and the field owns the text (§1.3).
      field.setValue(event.value);
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

  const handlePaste = (event: PasteEvent) => {
    field?.onPaste?.(event);
    local.onPaste?.(event);
  };

  const handleCompositionChange = (event: { composing: boolean; text: string }) => {
    field?.onCompositionChange?.(event);
    local.onCompositionChange?.(event);
  };

  const handleSelectionChange = (event: { start: number; end: number }) => {
    field?.onSelectionChange?.(event);
    local.onSelectionChange?.(event);
    // The port sheet maps the HTML `onSelect` to `onSelectionChange`; the field
    // fans it out the same way (textfield.tsx, `onSelectionChange`).
    local.onSelect?.(event);
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

  // A press on the control focuses it, as a browser's click does. NSH does not
  // move the focus with a pointer press and a view hears presses only while it
  // has an `onPress` handler, so the control takes presses and moves its own
  // focus. Return / Space on the focused input also arrive as a press;
  // focusing again is a no-op, so the keyboard path stays with the host.
  const handlePress = (event: PressEvent) => {
    local.onPress?.(event);

    if (!isDisabled()) {
      node?.focus();
    }
  };

  const handleFocus = () => {
    focused.set(true);
    // The field's focus state and its `onFocus` / `onFocusChange`, then the
    // caller's handler.
    field?.handleFocus();
    local.onFocus?.();
  };

  const handleBlur = () => {
    focused.set(false);
    // The field commits its validation here (React Stately's
    // `useFormValidationState`) and reports `onBlur` / `onFocusChange`.
    field?.handleBlur();
    local.onBlur?.();
  };

  // The caller's handler first, then the field's: a ComboBox commits the
  // highlighted option on Enter while the input still reports the keystroke
  // (port sheet §5, second change).
  const handleKeyPress = (event: { key: string }) => {
    local.onKeyPress?.(event);
    field?.onKeyPress?.(event);
  };

  // --- Render props and classes --------------------------------------------
  const renderProps: TextControlRenderProps = {
    isHovered: hovered,
    isFocused: focused,
    isFocusVisible: focused,
    isDisabled,
    isInvalid,
  };

  const classNameRenderProps: TextControlClassNameRenderProps = {
    ...renderProps,
    defaultClassName: baseClass(),
  };

  const styleRenderProps: TextControlStyleRenderProps = {
    ...renderProps,
    defaultStyle: {},
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(classNameRenderProps) : value;
  };

  const resolvedStyle = (): StyleProp<InputStyle> | undefined => {
    const value = local.style;

    return withoutResize(typeof value === "function" ? value(styleRenderProps) : value);
  };

  const classes = computed(() => {
    const secondary = variant() === "secondary";
    const isFocused = focused();
    const invalid = isInvalid();
    const disabled = isDisabled();
    // R-012 / R-031 and R-019 / R-038: `:hover:not(:focus)` applies to an
    // unfocused control only. Upstream's hover rule
    // (`.input:hover:not(:focus):not(:focus-visible)`, 0,4,0) outranks
    // `[data-invalid="true"]` (0,2,0) in input.css:28-32 against :44-48
    // (textarea.css:27-31 against :47-51 repeats it), so an invalid hovered
    // control keeps the hover fill. NSH resolves later classes as winners, so
    // the invalid fill below is skipped while this holds and the hover fill is
    // emitted last.
    const hoverFill = hovered() && !isFocused && !disabled;

    return joinClassNames(
      baseClass(),
      // R-013 / R-032: `status-focused-field` → `ring-2 ring-focus ring-offset-0
      // outline-none` plus the focus fill. Invalid controls use the danger pair
      // below instead of the focus ring.
      isFocused && !invalid
        ? "ring-2 ring-focus ring-offset-0 outline-none bg-field-focus"
        : undefined,
      // R-020 / R-039: secondary keeps `--default` while focused; restated after
      // a hover fill could have applied.
      isFocused && secondary ? "bg-default" : undefined,
      // R-014 / R-033: `status-invalid-field`'s unfocused half → `outline-1
      // outline-danger outline-solid`, with the invalid focus fill.
      invalid ? "outline-1 outline-danger outline-solid" : undefined,
      // R-014 / R-033: its focused half → `ring-2 ring-danger ring-offset-0`.
      invalid && isFocused ? "ring-2 ring-danger ring-offset-0" : undefined,
      invalid && !hoverFill ? "bg-field-focus" : undefined,
      // R-021 / R-040: secondary invalid keeps the `--default` fill; the ring /
      // outline is R-014's. The hover fill wins over it like the primary pair.
      invalid && secondary && !hoverFill ? "bg-default" : undefined,
      // R-012 / R-031: `:hover:not(:focus)` → `bg-field-hover`, last so it
      // outranks the invalid fill as it does upstream.
      hoverFill && !secondary ? "bg-field-hover" : undefined,
      // R-019 / R-038: the secondary twin → `bg-default-hover`.
      hoverFill && secondary ? "bg-default-hover" : undefined,
      // R-015 / R-034: `status-disabled` → `opacity: .5`, `cursor: not-allowed`,
      // `pointer-events: none`, as literals (the theme has no such tokens).
      disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : undefined,
      // Port sheet §5, second change: the owning composite field's own classes
      // (`min-w-0 flex-1`, plus `pe-7` while a ComboBox trigger is mounted) sit
      // after the control's state classes and before the caller's.
      field?.inputPartClass?.(),
      resolvedClassName(),
    );
  });

  // R-010 / R-029: the transitioned properties upstream. NSH animates through a
  // class and a property list; the class carries duration / curve, and reduced
  // motion turns the list off. The textarea's `rows` height is set before the
  // caller's style, so a caller's `style.height` wins (port sheet §5).
  const style = computed<StyleProp<InputStyle>>(() => {
    const rows = config.usesRows ? (local.rows ?? 2) * 20 + 16 : undefined;

    return [
      rows === undefined ? undefined : { height: rows },
      {
        transitionProperty: reduceMotion()
          ? "none"
          : "background-color, border-color, box-shadow",
      },
      resolvedStyle(),
    ] as StyleProp<InputStyle>;
  });

  return (
    <Input
      {...hostProps(rest)}
      ref={handleRef}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      value={display()}
      placeholder={local.placeholder}
      multiline={config.multiline}
      onChange={handleChange}
      // Return submits in place, as RAC keeps the focus; a multiline control
      // still inserts a line break (port sheet §1.3 / §1.4).
      submitBehavior={config.multiline ? "newline" : "submit"}
      disabled={isDisabled()}
      // NSH 0.4.0's `disabled` host prop blocks presses and focus and sets the
      // accessibility state but leaves the native field editable in the
      // headless host (measured: `app.type` succeeds without this), so
      // `readonly` carries the editing side of both states.
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
        (local["aria-label"] as string | undefined) ??
        local.accessibilityLabel ??
        field?.accessibilityLabel()
      }
      accessibilityHint={local.accessibilityHint ?? field?.accessibilityHint()}
      // The field may make its input a `combobox` and report the open state
      // (port sheet §5, second change); a plain field leaves both absent.
      role={local.role ?? field?.role?.()}
      accessibilityState={{
        ...local.accessibilityState,
        ...field?.accessibilityState?.(),
      }}
      onPaste={handlePaste}
      onCompositionChange={handleCompositionChange}
      onSelectionChange={handleSelectionChange}
      onKeyPress={handleKeyPress}
      class={classes()}
      style={style()}
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

/**
 * Drops CSS's `resize` from a style object. NSH has no resize handle (port
 * sheet §1.4, §8), so the key is accepted by the type and removed before the
 * host sees it. Arrays are passed through unchanged; a `resize` inside one is
 * an unknown style key the host ignores, and rewriting them would break the
 * animated / conditional forms.
 */
function withoutResize(
  style: StyleProp<TextControlStyle> | undefined,
): StyleProp<InputStyle> | undefined {
  if (style === undefined || style === null || typeof style !== "object" || Array.isArray(style)) {
    return style as StyleProp<InputStyle>;
  }

  const { resize: _resize, ...rest } = style as TextControlStyle;

  return rest;
}
