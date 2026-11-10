import type {
  Accessor,
  JSX,
  PasteEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, signal, split, untracked, View } from "nsh";

import { createControllableSignal } from "../../primitives";
import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { joinClassNames } from "./class-names";
import { renderChildren } from "./render-children";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./textfield-dom-props";
import {
  TextFieldContext,
  type TextFieldContextValue,
  type TextFieldEnterKeyHint,
  type TextFieldInputMode,
  type TextFieldVariant,
} from "./textfield-context";
import { textFieldVariants } from "./textfield.styles";
import type { TextFieldVariants } from "./textfield.styles";

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

/**
 * One error `validate` may return, as React Aria's `ValidationError`: a
 * message, or an object carrying one (and a list of either). Upstream imports
 * the type from `@react-types/shared`; NSH has no such package, so it is
 * declared here (port sheet §1.2).
 */
export type TextFieldValidationError =
  | string
  | { message?: string }
  | readonly (string | { message?: string })[];

/** React Aria's `validate` result: `true` (valid), or the errors. */
export type TextFieldValidate = (
  value: string,
) => true | string | TextFieldValidationError | null | undefined;

/** The HTML input types `useTextField` accepts. */
export type TextFieldType =
  | "text"
  | "search"
  | "email"
  | "password"
  | "tel"
  | "url"
  | "number"
  | (string & {});

/**
 * The values HeroUI's `TextField` hands to `children` and to the function forms
 * of `className` / `style` (React Aria `TextField.tsx`), as accessors per D17.
 */
export interface TextFieldRenderProps {
  /** The whole field is disabled. */
  isDisabled: Accessor<boolean>;

  /** Invalid from the prop or from the validation result. */
  isInvalid: Accessor<boolean>;

  /** The field cannot be edited. */
  isReadOnly: Accessor<boolean>;

  /** The field must be filled; the Label shows its asterisk. */
  isRequired: Accessor<boolean>;
}

/** What the root's `className` function receives. */
export interface TextFieldClassNameRenderProps extends TextFieldRenderProps {
  /** The `base` slot's class string, before the caller's `className`. */
  defaultClassName: string;
}

/** What the root's `style` function receives. */
export interface TextFieldStyleRenderProps extends TextFieldRenderProps {
  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/* -------------------------------------------------------------------------------------------------
 * Root props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `TextField.Root`: HeroUI 3.2.7's `TextFieldRootProps`, which is
 * React Aria Components' `TextField` (`AriaTextFieldProps`, `FocusableProps`,
 * `RenderProps`) plus the variant dimensions, expressed with NSH's view host
 * props.
 *
 * The DOM-only members upstream are accepted so code written against HeroUI
 * keeps compiling; port sheet §1.2 says what each can and cannot do here.
 */
export interface TextFieldRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The field's content: an element, or a render prop called once with the
   * field state (D17). Bare strings and numbers become `Text` at the
   * placement, or NSH would not draw them.
   */
  children?: JSX.Element | ((values: TextFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: TextFieldClassNameRenderProps) => string | undefined);

  /** Style of the field; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: TextFieldStyleRenderProps) => StyleProp<ViewStyle>);

  /** The value, controlled. */
  value?: string;

  /** The initial value, uncontrolled. */
  defaultValue?: string;

  /** The value changed; the payload is the string, not a DOM event. */
  onChange?: (value: string) => void;

  /** Validates the value once the field is committed (a blur) and then on every change. */
  validate?: TextFieldValidate;

  /** Accepted, no effect: NSH has no browser constraint validation. */
  validationBehavior?: "native" | "aria";

  /** Dims the whole field and disables its inputs. */
  isDisabled?: boolean;

  /** The inputs cannot be edited; they still focus and can be selected. */
  isReadOnly?: boolean;

  /** The field must be filled: only the Label's asterisk shows it. */
  isRequired?: boolean;

  /** Paints the field invalid and mounts the `FieldError` inside it. */
  isInvalid?: boolean;

  /** The HTML input type, handed to the inputs and mapped there (port sheet §1.2). */
  type?: TextFieldType;

  /** The field's inputs take the focus when they appear. */
  autoFocus?: boolean;

  /** The autofill hint, handed to the input. */
  autoComplete?: string;

  /** Accepted, no effect: NSH has no browser constraint validation. */
  pattern?: string;

  /** Accepted, no effect: NSH has no browser constraint validation. */
  minLength?: number;

  /** The character limit, applied natively by the input. */
  maxLength?: number;

  /** The HTML `"on"` / `"off"` correction switch, mapped to the host boolean. */
  autoCorrect?: string;

  /** Accepted, no effect: NSH's input spelling is the platform's own. */
  spellCheck?: boolean;

  /** Wins over the mapping from `type` on the input. */
  inputMode?: TextFieldInputMode;

  /** Mapped to the soft keyboard's return key label. */
  enterKeyHint?: TextFieldEnterKeyHint;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form ownership. */
  form?: string;

  /** Accepted, no effect: NSH's input is always a Tab stop. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: NSH has no element-level key events; keys go through `keymap`. */
  onKeyDown?: unknown;

  /** Accepted, no effect, as `onKeyDown`. */
  onKeyUp?: unknown;

  /** Accepted, no effect: NSH has no DOM `beforeinput`. */
  onBeforeInput?: unknown;

  /** Accepted, no effect: the input's `onChange` covers it. */
  onInput?: unknown;

  /** Accepted, no effect: copy is not intercepted. */
  onCopy?: unknown;

  /** Accepted, no effect: cut is not intercepted. */
  onCut?: unknown;

  /** The user pasted; NSH reports the content, not a DOM `ClipboardEvent`. */
  onPaste?: (event: PasteEvent) => void;

  /** An input method's composition; NSH reports all three phases on one event. */
  onCompositionChange?: (event: { composing: boolean; text: string }) => void;

  /** The composition started; fanned out of NSH's single composition event. */
  onCompositionStart?: (event: { composing: boolean; text: string }) => void;

  /** The composition changed; fanned out of NSH's single composition event. */
  onCompositionUpdate?: (event: { composing: boolean; text: string }) => void;

  /** The composition ended; fanned out of NSH's single composition event. */
  onCompositionEnd?: (event: { composing: boolean; text: string }) => void;

  /** The caret / selection moved. */
  onSelect?: (event: { start: number; end: number }) => void;

  /** The field's focus moved in or out (synthesized by its input). */
  onFocusChange?: (isFocused: boolean) => void;

  /** The input took the focus. */
  onFocus?: () => void;

  /** The input lost the focus, after validation was committed. */
  onBlur?: () => void;

  /** The field's accessible name, placed on the input. */
  "aria-label"?: string;

  /** HeroUI's `accessibilityLabel` counterpart through NSH's own prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** A DOM id upstream; names the root view here. */
  id?: string;

  /** NSH's own name for the root; `id` wins. */
  nativeID?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The fill flavor of the inputs inside. @default "primary" */
  variant?: TextFieldVariant;

  /** Stretches the field, and every input inside it, across the parent. @default false */
  fullWidth?: boolean;

  /** The field's view, forwarded as a callback (an undefined ref store throws on the web). */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/** Joins the texts a field registered, in the order they were registered. */
function joinedText(readers: readonly (() => string | undefined)[]): string | undefined {
  const text = readers
    .map((read) => read())
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/** Flattens a `validate` result into the messages to show, as React Stately does. */
function normalizeValidation(
  result: true | string | TextFieldValidationError | null | undefined,
): readonly string[] {
  if (result === undefined || result === null || result === true) {
    return [];
  }

  const entries = Array.isArray(result) ? result : [result];

  return entries
    .map((entry) => (typeof entry === "string" ? entry : entry?.message))
    .filter((message): message is string => typeof message === "string" && message.length > 0);
}

/**
 * TextField.Root / TextFieldRoot: the field container, its value and validation
 * state, and the four contexts the inputs and the already-ported Label /
 * Description / FieldError read.
 *
 * It reads `props.children` exactly once, at the placement inside every
 * provider (the provider exception in the common rules): a `computed` built in
 * the body would evaluate outside them, and the text parts would lose the field
 * state. The root itself has no role, like upstream's plain `<div>`.
 */
export function TextFieldRoot(props: TextFieldRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "value",
    "defaultValue",
    "onChange",
    "validate",
    "validationBehavior",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "type",
    "autoFocus",
    "autoComplete",
    "pattern",
    "minLength",
    "maxLength",
    "autoCorrect",
    "spellCheck",
    "inputMode",
    "enterKeyHint",
    "name",
    "form",
    "excludeFromTabOrder",
    "onKeyDown",
    "onKeyUp",
    "onBeforeInput",
    "onInput",
    "onCopy",
    "onCut",
    "onPaste",
    "onCompositionChange",
    "onCompositionStart",
    "onCompositionUpdate",
    "onCompositionEnd",
    "onSelect",
    "onFocusChange",
    "onFocus",
    "onBlur",
    "aria-label",
    "accessibilityLabel",
    "aria-invalid",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "id",
    "nativeID",
    "slot",
    "render",
    "variant",
    "fullWidth",
    "ref",
  ] as const);

  // --- Variant table --------------------------------------------------------
  const fullWidth = computed(() => local.fullWidth === true);

  const defaultClassName = computed(() => textFieldVariants({ fullWidth: fullWidth() }));

  const variant = computed<TextFieldVariant>(() =>
    local.variant === "secondary" ? "secondary" : "primary",
  );

  // --- Value ----------------------------------------------------------------
  // React Stately's `useTextFieldState`: `useControlledState(value, defaultValue
  // ?? "", onChange)`. Every edit writes through here, so a controlled field has
  // exactly one source of truth (port sheet §2).
  const [value, setValue] = createControllableSignal<string>({
    value: () => local.value,
    defaultValue: () => local.defaultValue ?? "",
    onChange: (next) => local.onChange?.(next),
  });

  const text = () => value() ?? "";

  // --- Effective state ------------------------------------------------------
  const isDisabled = computed(() => local.isDisabled ?? false);
  const isReadOnly = computed(() => local.isReadOnly ?? false);
  const isRequired = computed(() => local.isRequired ?? false);

  // --- Validation -----------------------------------------------------------
  // React Stately's `useFormValidationState`: `validate` runs once the field has
  // been committed (a blur) and then follows the value. NSH has no browser
  // validation, so this is the only path (port sheet §2).
  const committed = signal(false);

  const validationErrors = computed<readonly string[]>(() => {
    if (!committed()) {
      return [];
    }

    return normalizeValidation(local.validate?.(text()));
  });

  const isInvalid = computed(
    () =>
      local.isInvalid === true ||
      local["aria-invalid"] === true ||
      local["aria-invalid"] === "true" ||
      validationErrors().length > 0,
  );

  const commitValidation = () => {
    committed.set(true);
  };

  // --- Focus ----------------------------------------------------------------
  // The field has no focus stop of its own; its inputs report theirs (port
  // sheet §2, the `onFocusChange` row).
  const handleFocus = () => {
    local.onFocus?.();
    local.onFocusChange?.(true);
  };

  const handleBlur = () => {
    commitValidation();
    local.onBlur?.();
    local.onFocusChange?.(false);
  };

  // --- Text-part registrations ---------------------------------------------
  // Label, Description and FieldError report themselves through the field
  // contexts (their own port sheets); the field joins the texts into the
  // input's accessible name and description, standing in for `<label for>` and
  // `aria-describedby` (port sheet §2).
  const labelSources = signal<readonly (() => string | undefined)[]>([]);
  const descriptionSources = signal<readonly (() => string | undefined)[]>([]);
  const errorSources = signal<readonly (() => string | undefined)[]>([]);

  const registerInto = (
    target: typeof labelSources,
    read: () => string | undefined,
  ) => {
    target.update((current) => [...current, read]);

    return () => {
      target.update((current) => current.filter((entry) => entry !== read));
    };
  };

  const labelText = computed(() => joinedText(labelSources()));
  const descriptionText = computed(() => joinedText(descriptionSources()));
  const errorText = computed(() => joinedText(errorSources()));

  const accessibilityLabel = computed(
    () => local["aria-label"] ?? local.accessibilityLabel ?? labelText(),
  );

  // Upstream's `aria-describedby` lists the description and then the error
  // message; the same order here (port sheet §2).
  const accessibilityHint = computed(() => joinedText([descriptionText, errorText]));

  // --- Input focus handle ---------------------------------------------------
  // Stands in for `<label for>`: the input registers its own `focus()`, and a
  // Label press calls it (port sheet §2).
  let inputFocus: (() => void) | undefined;

  const registerInputFocus = (focus: () => void) => {
    inputFocus = focus;

    return () => {
      if (inputFocus === focus) {
        inputFocus = undefined;
      }
    };
  };

  const focusInput = () => inputFocus?.();

  // --- Render props ---------------------------------------------------------
  const renderProps: TextFieldRenderProps = {
    isDisabled,
    isInvalid,
    isReadOnly,
    isRequired,
  };

  const classNameRenderProps: TextFieldClassNameRenderProps = {
    ...renderProps,
    defaultClassName: defaultClassName(),
  };

  const styleRenderProps: TextFieldStyleRenderProps = {
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

  const classes = computed(() => joinClassNames(defaultClassName(), resolvedClassName()));

  // --- Contexts -------------------------------------------------------------
  const contextValue: TextFieldContextValue = {
    variant,
    fullWidth,
    value: text,
    setValue: (next) => setValue(next),
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    accessibilityLabel,
    accessibilityHint,
    type: () => local.type,
    inputMode: () => local.inputMode,
    enterKeyHint: () => local.enterKeyHint,
    autoComplete: () => local.autoComplete,
    autoCorrect: () => local.autoCorrect,
    maxLength: () => local.maxLength,
    autoFocus: () => local.autoFocus,
    handleFocus,
    handleBlur,
    registerInputFocus,
    focusInput,
    onPaste: (event) => local.onPaste?.(event),
    // NSH reports the three DOM composition events on one; the field fans it
    // back out to the event HeroUI's caller asked for (§8).
    onCompositionChange: (event) => {
      if (!event.composing) {
        local.onCompositionEnd?.(event);
        return;
      }

      if (event.text.length === 0) {
        local.onCompositionStart?.(event);
        return;
      }

      local.onCompositionUpdate?.(event);
    },
    onSelectionChange: (event) => local.onSelect?.(event),
  };

  const fieldState: FieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel: (read) => registerInto(labelSources, read),
    // A press on a `<label for>` focuses the control; here the input is the
    // control, and its own `focus()` stands in (port sheet §2).
    focusField: () => focusInput(),
  };

  const descriptionState: DescriptionContextValue = {
    registerDescription: (read) => registerInto(descriptionSources, read),
    // R-002: `.textfield[data-invalid] [data-slot="description"] { display: none }`.
    // The Description appends this after its own classes; the scoping is wider
    // than upstream's descendant selector (§8).
    partClass: () => (isInvalid() ? "hidden" : undefined),
  };

  const fieldErrorState: FieldErrorState = {
    isInvalid,
    validationErrors,
    registerErrorMessage: (read) => registerInto(errorSources, read),
  };

  // The single read of `props.children`, at the placement inside every provider
  // (research 4.1 / 4.6, and the provider exception in the common rules): a
  // computed made in the body would evaluate outside the providers and the
  // text parts would lose their field.
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() =>
          (children as (values: TextFieldRenderProps) => JSX.Element)(renderProps),
        ),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <FieldContext.Provider value={fieldState}>
      <DescriptionContext.Provider value={descriptionState}>
        <FieldErrorContext.Provider value={fieldErrorState}>
          <TextFieldContext.Provider value={contextValue}>
            <View
              {...hostProps(rest)}
              ref={(node) => local.ref?.(node)}
              nativeID={local.id ?? local.nativeID}
              // R-001 / R-003: the column and, with `fullWidth`, the stretched
              // width — all from the variant table.
              class={classes()}
              style={resolvedStyle()}
            >
              {content()}
            </View>
          </TextFieldContext.Provider>
        </FieldErrorContext.Provider>
      </DescriptionContext.Provider>
    </FieldContext.Provider>
  );
}
