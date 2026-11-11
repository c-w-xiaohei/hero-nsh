import type {
  Accessor,
  JSX,
  PasteEvent,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import {
  cleanup,
  computed,
  effect,
  keymap,
  signal,
  split,
  untracked,
  View,
} from "nsh";

import { createControllableSignal } from "../../primitives";
import { joinClassNames } from "./class-names";
import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldsetContext } from "../fieldset/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { renderChildren } from "./render-children";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./search-field-dom-props";
import {
  SearchFieldContext,
  type SearchFieldContextValue,
  type SearchFieldEnterKeyHint,
  type SearchFieldInputBindings,
  type SearchFieldInputMode,
  SearchFieldOwnerContext,
  type SearchFieldSlots,
} from "./search-field-context";
import { searchFieldVariants } from "./search-field.styles";

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

/**
 * One error `validate` may return, as React Aria's `ValidationError`: a
 * message, or an object carrying one. Upstream imports the type from
 * `@react-types/shared`; NSH has no such package, so it is declared here (port
 * sheet §1.2).
 */
export type SearchFieldValidationError =
  | string
  | { message?: string }
  | readonly (string | { message?: string })[];

/** React Aria's `validate` result: `true` (valid), or the errors. */
export type SearchFieldValidate = (
  value: string,
) => true | string | SearchFieldValidationError | null | undefined;

/** The HTML input types `useSearchField` accepts; `"search"` is the default. */
export type SearchFieldInputType =
  | "text"
  | "search"
  | "email"
  | "password"
  | "tel"
  | "url"
  | "number"
  | (string & {});

/**
 * Upstream's `SearchFieldState` (`react-stately/useSearchFieldState`) with the
 * value as an accessor: D17's rule, so a render prop built once follows the
 * value instead of freezing its first string.
 */
export interface SearchFieldState {
  /** The field's text, live. */
  value: Accessor<string>;

  /** Writes the field's text; a controlled field reports through `onChange`. */
  setValue: (value: string) => void;
}

/**
 * The values HeroUI's `SearchField` hands to a render prop (React Aria
 * `SearchField.tsx:143-153`), as accessors per D17.
 */
export interface SearchFieldRenderProps {
  /** The field's text is empty. */
  isEmpty: Accessor<boolean>;

  /** The field is disabled. */
  isDisabled: Accessor<boolean>;

  /** The field is invalid: the prop, or committed validation errors. */
  isInvalid: Accessor<boolean>;

  /** The field is read-only. */
  isReadOnly: Accessor<boolean>;

  /** The field is required. */
  isRequired: Accessor<boolean>;

  /** The field's value state, with the value as an accessor. */
  state: SearchFieldState;
}

/**
 * What the root's `className` function receives: the render props plus the
 * class string the root carries without `className` (React Aria's
 * `useRenderProps` default pair).
 */
export interface SearchFieldClassNameRenderProps extends SearchFieldRenderProps {
  /** The `base` slot's class string, before the caller's `className`. */
  defaultClassName: string;
}

/** What the root's `style` function receives. */
export interface SearchFieldStyleRenderProps extends SearchFieldRenderProps {
  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/* -------------------------------------------------------------------------------------------------
 * SearchField Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `SearchField.Root` (= `SearchField`): HeroUI 3.2.7's
 * `SearchFieldRootProps`, which is React Aria Components' `SearchField` with
 * this component's variant dimensions.
 *
 * The DOM-only members upstream (form submission, browser constraint
 * validation, DOM keyboard / clipboard events, `render`, `slot`, the global DOM
 * attributes) are accepted so code written against HeroUI keeps compiling; the
 * port sheet §1.2 and §8 say what each can and cannot do here. The members with
 * a real NSH counterpart are mapped onto the field's input.
 */
export interface SearchFieldRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The field: a `Label`, a `Group` and optionally a `Description` and a
   * `FieldError`. A one-parameter function is HeroUI's render prop, called once
   * with the accessors (D17).
   */
  children?: JSX.Element | ((values: SearchFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: SearchFieldClassNameRenderProps) => string | undefined);

  /** Style of the root; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: SearchFieldStyleRenderProps) => StyleProp<ViewStyle>);

  /** The text, controlled. Wins over `defaultValue`, as React Stately's state does. */
  value?: string;

  /** The initial text, uncontrolled. @default "" */
  defaultValue?: string;

  /** The text changed: typing, the clear button and the escape key all report here. */
  onChange?: (value: string) => void;

  /** Return was pressed in the input. The submit keeps the focus (`submitBehavior="submit"`). */
  onSubmit?: (value: string) => void;

  /** The field was cleared, by the clear button or the escape key. */
  onClear?: () => void;

  /** Blocks edits, focus and the escape key; dims the group and disables the clear button. @default false */
  isDisabled?: boolean;

  /** Keeps focus and selection but blocks edits; disables the clear button and the escape key. @default false */
  isReadOnly?: boolean;

  /** Shows the Label's asterisk; NSH has no browser constraint to enforce. @default false */
  isRequired?: boolean;

  /** Paints the invalid outline / ring, hides the Description and mounts the FieldError (R-002, R-013). @default false */
  isInvalid?: boolean;

  /**
   * React Aria's field validation: `true` when valid, else the message(s).
   * Committed on blur and on submit, then re-run whenever the value changes —
   * React Stately's `useFormValidationState` timing (port sheet §2).
   */
  validate?: SearchFieldValidate;

  /** Accepted, no effect: NSH has no native form validation. @default "native" */
  validationBehavior?: "native" | "aria";

  /** Focuses the input when it mounts. */
  autoFocus?: boolean;

  /** Mapped to the host's `autoComplete` when NSH knows the value. */
  autoComplete?: string;

  /** The HTML `"on"` / `"off"`, mapped to the host boolean (`"off"` is false). */
  autoCorrect?: string;

  /** Mapped to the host's `autoCapitalize` when NSH knows the value. */
  autoCapitalize?: string;

  /** The HTML input type; drives the keyboard layout only. @default "search" */
  type?: SearchFieldInputType;

  /** Wins over the mapping from `type`. */
  inputMode?: SearchFieldInputMode;

  /** Mapped to the soft keyboard's return key label. */
  enterKeyHint?: SearchFieldEnterKeyHint;

  /** The most characters the input accepts. */
  maxLength?: number;

  /** Accepted, no effect: NSH has no browser constraint validation. */
  minLength?: number;

  /** Accepted, no effect: NSH has no browser constraint validation. */
  pattern?: string;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form submission. */
  form?: string;

  /** Accepted, no effect: NSH inputs have no spell checker. */
  spellCheck?: boolean | "true" | "false";

  /** Accepted, no effect: NSH inputs are always in the Tab order (port sheet §8). */
  excludeFromTabOrder?: boolean;

  /** The input took focus. */
  onFocus?: () => void;

  /** The input lost focus; validation commits here. */
  onBlur?: () => void;

  /** Both focus transitions, as React Aria's `FocusEvents` report them. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Accepted, no effect: views have no key events, and Escape / Return are handled by the field. */
  onKeyDown?: unknown;

  /** Accepted, no effect, as `onKeyDown`. */
  onKeyUp?: unknown;

  /** Accepted, no effect: NSH has no copy event. */
  onCopy?: unknown;

  /** Accepted, no effect: NSH has no cut event. */
  onCut?: unknown;

  /** The user pasted; NSH reports the content instead of a DOM `ClipboardEvent`. */
  onPaste?: (event: PasteEvent) => void;

  /** An input method's composition started; NSH reports all phases on `onCompositionChange`. */
  onCompositionStart?: (event: { composing: boolean; text: string }) => void;

  /** The composition changed, as `onCompositionStart` reports it. */
  onCompositionUpdate?: (event: { composing: boolean; text: string }) => void;

  /** The composition ended, as `onCompositionStart` reports it. */
  onCompositionEnd?: (event: { composing: boolean; text: string }) => void;

  /** The caret / selection moved; NSH reports the UTF-16 range. */
  onSelect?: (event: { start: number; end: number }) => void;

  /** Accepted, no effect: `onChange` already reports every edit. */
  onInput?: unknown;

  /** Accepted, no effect: NSH has no beforeinput event. */
  onBeforeInput?: unknown;

  /** The accessible name of the input; wins over the registered Label text. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references; Label / Description / FieldError register themselves. */
  "aria-labelledby"?: string;

  /** Accepted, no effect, as `aria-labelledby`. */
  "aria-describedby"?: string;

  /** Accepted, no effect, as `aria-labelledby`. */
  "aria-details"?: string;

  /** Accepted, no effect, as `aria-labelledby`. */
  "aria-errormessage"?: string;

  /** The accessible name through NSH's own prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** The name other elements refer to (NSH's counterpart of a DOM id). */
  nativeID?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Stretches the root and the group across their parent. @default false */
  fullWidth?: boolean;

  /** The fill flavor. @default "primary" */
  variant?: "primary" | "secondary";

  /** Reaches the root `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/**
 * `SearchField.Root` / `SearchFieldRoot`: HeroUI's field root, a `<div>` with
 * no role that owns the value, the validation state and the focus signal. It
 * provides the three text-part contexts (Label, Description, FieldError) and
 * this unit's own context for the field wiring, so every part can be placed
 * freely inside it (port sheet §3).
 */
export function SearchFieldRoot(props: SearchFieldRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "value",
    "defaultValue",
    "onChange",
    "onSubmit",
    "onClear",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "validate",
    "validationBehavior",
    "autoFocus",
    "autoComplete",
    "autoCorrect",
    "autoCapitalize",
    "type",
    "inputMode",
    "enterKeyHint",
    "maxLength",
    "minLength",
    "pattern",
    "name",
    "form",
    "spellCheck",
    "excludeFromTabOrder",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onKeyDown",
    "onKeyUp",
    "onCopy",
    "onCut",
    "onPaste",
    "onCompositionStart",
    "onCompositionUpdate",
    "onCompositionEnd",
    "onSelect",
    "onInput",
    "onBeforeInput",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "accessibilityLabel",
    "id",
    "nativeID",
    "slot",
    "render",
    "fullWidth",
    "variant",
  ] as const);

  // --- Variant table --------------------------------------------------------
  // Re-resolved against the current props; the context contract is HeroUI's
  // `slots.group()` call shape, so each slot is an accessor over the fresh
  // table and a runtime `variant` / `fullWidth` change re-resolves every part.
  const resolvedSlots = computed(() =>
    searchFieldVariants({
      fullWidth: local.fullWidth,
      variant: local.variant,
    }),
  );

  const slots: SearchFieldSlots = {
    base: () => resolvedSlots().base(),
    group: () => resolvedSlots().group(),
    input: () => resolvedSlots().input(),
    searchIcon: () => resolvedSlots().searchIcon(),
    clearButton: () => resolvedSlots().clearButton(),
  };

  const variant = computed<"primary" | "secondary">(() => local.variant ?? "primary");

  // The composite field above this one, if any (Autocomplete.Filter): it owns
  // the text, the focus notifications and a class of its own (port sheet §5).
  const owner = SearchFieldOwnerContext();

  // --- Value ----------------------------------------------------------------
  // React Stately's `useSearchFieldState`: `useControlledState(toString(value),
  // toString(defaultValue) ?? "", onChange)`. `toString` keeps `undefined` as
  // `undefined` so the controllable signal sees a controlled / uncontrolled
  // prop, and every other value becomes the text (`null` → `"null"`, as
  // React Stately does).
  const [value, setValue] = createControllableSignal<string>({
    // The composite field above the search field (Autocomplete's Filter) owns
    // the text while it is mounted: upstream React Aria's Autocomplete passes
    // its `inputValue` down through `FieldInputContext` (Autocomplete port
    // sheet §5, the SearchField change). Without one the field is its own.
    value: () => owner?.value?.() ?? toStringValue(local.value),
    defaultValue: () => toStringValue(local.defaultValue) ?? "",
    onChange: (next) => {
      owner?.setValue?.(next);
      local.onChange?.(next);
    },
  });

  const text = () => value() ?? "";

  const isEmpty = computed(() => text() === "");

  // --- Effective state ------------------------------------------------------
  // Fieldset sheet §5.2: a disabled `Fieldset` disables the whole field.
  const fieldset = FieldsetContext();
  const isDisabled = computed(
    () => fieldset?.isDisabled() === true || (local.isDisabled ?? false),
  );
  const isReadOnly = computed(() => local.isReadOnly ?? false);
  const isRequired = computed(() => local.isRequired ?? false);

  // --- Validation -----------------------------------------------------------
  // React Stately's `useFormValidationState`: `validate` runs once the field has
  // been committed (a blur or a submit) and then follows the value. NSH has no
  // browser validation, so this is the only path (port sheet §2).
  const committed = signal(false);

  const validationErrors = computed<readonly string[]>(() => {
    if (!committed()) {
      return [];
    }

    return normalizeValidation(local.validate?.(text()));
  });

  const isInvalid = computed(
    () => local.isInvalid === true || validationErrors().length > 0,
  );

  const commitValidation = () => {
    committed.set(true);
  };

  const clear = () => {
    setValue("");
    local.onClear?.();
  };

  // --- Focus ----------------------------------------------------------------
  // The field's only focus stop is the input. Root holds the signal; `Group`
  // reads it as its focus-within state (port sheet §2) and the escape scope
  // binds only while it is true.
  const focused = signal(false);

  const handleInputFocus = () => {
    focused.set(true);
    owner?.onFocus?.();
    local.onFocus?.();
    local.onFocusChange?.(true);
  };

  const handleInputBlur = () => {
    focused.set(false);
    owner?.onBlur?.();
    // `useFormValidationState` commits on blur: from here on the errors follow
    // the value, so typing after a failed blur clears the error again.
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
  const accessibilityHint = computed(() =>
    [descriptionText(), errorText()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ") || undefined,
  );

  // --- Input focus handle ---------------------------------------------------
  // Stands in for `<label for>` and for the clear button's `onPressStart`
  // focus: the input registers its own `focus()` here (port sheet §2).
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

  // The owner (Autocomplete.Filter) moves the focus into the input when it
  // opens; React Aria's popover does the same through its focus scope.
  if (owner?.registerFocus) {
    cleanup(owner.registerFocus(focusInput));
  }

  // --- Submit and the input binding ----------------------------------------
  const submit = () => {
    // React Aria commits validation on submit as well as on blur.
    commitValidation();
    // The owner's submit runs first: in an Autocomplete the Return key picks
    // the highlighted option instead of submitting a form (§5).
    owner?.onSubmit?.(text());
    local.onSubmit?.(text());
  };

  const input: SearchFieldInputBindings = {
    value: text,
    setValue: (next) => setValue(next),
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    accessibilityLabel,
    accessibilityHint,
    type: () => local.type ?? "search",
    inputMode: () => local.inputMode,
    enterKeyHint: () => local.enterKeyHint,
    autoComplete: () => local.autoComplete,
    autoCorrect: () => local.autoCorrect,
    autoCapitalize: () => local.autoCapitalize,
    maxLength: () => local.maxLength,
    autoFocus: () => local.autoFocus,
    submit,
    focus: handleInputFocus,
    blur: handleInputBlur,
    // The input unmounted while focused: `:focus-within` ends with no blur
    // event, so the focus state drops without `onBlur` / `onFocusChange`
    // (which also unbinds the Escape scope).
    releaseFocus: () => focused.set(false),
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

  // --- Escape ---------------------------------------------------------------
  // React Aria binds `Escape` on the input: it clears a non-empty field and
  // calls `onClear`. The scope is live only while the input is focused, the
  // field is editable and something is there to clear — an empty field lets the
  // key through instead of consuming it (port sheet §2).
  //
  // `when: "always"` is required, not a shortcut: NSH's keymap skips a binding
  // whose keystroke the focused text input uses, and Escape never reached a
  // default binding while the input had the focus (measured while porting this
  // unit). The scope's own condition is what keeps the key from being taken
  // anywhere else — it exists only around a focused, editable field.
  // `createKeymapScope` deliberately refuses `"always"`, so the bind lives in
  // this effect, which is the primitive's pattern with this one option.
  //
  // A composite field above this one (Autocomplete.Filter) takes Escape for
  // itself: it closes the field and resets the text, and the field must not
  // also empty only its own half of the filter (port sheet §5).
  effect(() => {
    if (!focused() || isDisabled() || isReadOnly()) {
      return;
    }

    if (owner?.onEscape) {
      return keymap.bind({ escape: () => owner.onEscape?.() }, { when: "always" });
    }

    if (isEmpty()) {
      return;
    }

    return keymap.bind({ escape: () => clear() }, { when: "always" });
  });

  // --- Render props ---------------------------------------------------------
  const state: SearchFieldState = {
    value: text,
    setValue: (next) => setValue(next),
  };

  const renderProps: SearchFieldRenderProps = {
    isEmpty,
    isDisabled,
    isInvalid,
    isReadOnly,
    isRequired,
    state,
  };

  const classNameRenderProps: SearchFieldClassNameRenderProps = {
    ...renderProps,
    defaultClassName: slots.base(),
  };

  const styleRenderProps: SearchFieldStyleRenderProps = {
    ...renderProps,
    defaultStyle: {},
  };

  // --- Classes --------------------------------------------------------------
  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(classNameRenderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(styleRenderProps) : value;
  };

  const classes = computed(() =>
    joinClassNames(slots.base(), owner?.partClass?.() ?? "", resolvedClassName()),
  );

  // --- Contexts -------------------------------------------------------------
  const contextValue: SearchFieldContextValue = {
    slots,
    variant,
    value: text,
    setValue: (next) => setValue(next),
    clear,
    isEmpty,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    focused,
    registerInputFocus,
    focusInput,
    input,
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
    // R-002: `.search-field[data-invalid] [data-slot="description"] { hidden }`.
    // The Description appends this after its own classes; the scoping is wider
    // than upstream's direct child (§8).
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
        untracked(() => (children as (values: SearchFieldRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <FieldContext.Provider value={fieldState}>
      <DescriptionContext.Provider value={descriptionState}>
        <FieldErrorContext.Provider value={fieldErrorState}>
          <SearchFieldContext.Provider value={contextValue}>
            <View
              {...hostProps(rest)}
              ref={(node) => local.ref?.(node)}
              nativeID={local.id ?? local.nativeID}
              // R-001 / R-033: the column and, with `fullWidth`, the stretched
              // width — all from the variant table.
              class={classes()}
              style={resolvedStyle()}
            >
              {content()}
            </View>
          </SearchFieldContext.Provider>
        </FieldErrorContext.Provider>
      </DescriptionContext.Provider>
    </FieldContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/** React Stately's `toString`: `null` / `undefined` stay `undefined`. */
function toStringValue(value: string | undefined): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

/** Joins registered texts in registration order, as the field's name / hint. */
function joinedText(readers: readonly (() => string | undefined)[]): string | undefined {
  const text = readers
    .map((read) => read())
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/** Flattens a `validate` result into the messages to show, as React Stately does. */
function normalizeValidation(
  result: true | string | SearchFieldValidationError | null | undefined,
): readonly string[] {
  if (result === undefined || result === null || result === true) {
    return [];
  }

  const entries = Array.isArray(result) ? result : [result];

  return entries
    .map((entry) => (typeof entry === "string" ? entry : entry?.message))
    .filter((message): message is string => typeof message === "string" && message.length > 0);
}
