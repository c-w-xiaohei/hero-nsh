import type {
  Accessor,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, signal, split, untracked, View } from "nsh";

import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { joinClassNames } from "./class-names";
import {
  NumberFieldContext,
  type NumberFieldContextValue,
} from "./context";
import {
  createNumberFieldState,
  type NumberFieldState,
} from "./create-number-field-state";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./number-field-dom-props";
import { numberFieldVariants } from "./number-field.styles";
import type { NumberFieldVariants } from "./number-field.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What HeroUI's `NumberFieldRenderProps` hands to `children`, `className` and
 * `style` (`react-aria-components/src/NumberField.tsx:73-93`), accessorized per
 * D17. `defaultClassName` / `defaultStyle` are the pair React Aria's
 * `useRenderProps` adds, so a caller can append to or replace them.
 */
export interface NumberFieldRenderProps {
  /** The whole field is disabled. */
  isDisabled: Accessor<boolean>;

  /** Invalid from the prop or from the validation result. */
  isInvalid: Accessor<boolean>;

  /** The field's text cannot be edited and its steps are off. */
  isReadOnly: Accessor<boolean>;

  /** The field must be filled; the Label shows its asterisk. */
  isRequired: Accessor<boolean>;

  /** The field's value state, with accessor members (D17). */
  state: NumberFieldState;

  /** The `base` slot's class string, before the caller's `className`. */
  defaultClassName: string;

  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/**
 * The props of `NumberField.Root`: HeroUI 3.2.7's `NumberFieldRootProps`, which
 * is React Aria Components' `NumberField` (its `NumberFieldProps` plus the
 * `AriaNumberFieldProps` validation members) and the two variant dimensions,
 * expressed with NSH's view host props.
 *
 * The DOM-only members upstream are accepted so code written against HeroUI
 * keeps compiling; port sheet §1.2 says what each can and cannot do here.
 */
export interface NumberFieldRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The field's content: an element, or a render prop called once with the
   * field state (D17). Bare strings and numbers become `Text` at the placement,
   * or NSH would not draw them.
   */
  children?: JSX.Element | ((values: NumberFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: NumberFieldRenderProps) => string | undefined);

  /** Style of the field; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: NumberFieldRenderProps) => StyleProp<ViewStyle>);

  /** The value, controlled. `undefined` makes the field uncontrolled. */
  value?: number;

  /** The initial value, uncontrolled. Absent means empty (`NaN`). */
  defaultValue?: number;

  /** The value changed: on blur, on Enter, and on every step. Never while typing. */
  onChange?: (value: number) => void;

  /** The lower bound; commits and steps are clamped to it. */
  minValue?: number;

  /** The upper bound; commits and steps are clamped to it. */
  maxValue?: number;

  /** One arrow / button step. `@default 1`, or `0.01` for the percent style. */
  step?: number;

  /** Decides the display text and which characters the parser accepts. */
  formatOptions?: Intl.NumberFormatOptions;

  /** `"snap"` clamps and snaps a commit; `"validate"` keeps it and reports errors. @default "snap" */
  commitBehavior?: "snap" | "validate";

  /** Runs on every commit; `true` when valid, otherwise a message. */
  validate?: (value: number) => true | string | null | undefined | { message?: string | null };

  /** Accepted, no effect: NSH has no form submission or native constraint validation. */
  validationBehavior?: "native" | "aria";

  /** Dims the field, disables the input and makes the steps inert. */
  isDisabled?: boolean;

  /** The text cannot be edited and the steps are off; the value stays readable. */
  isReadOnly?: boolean;

  /** The field must be filled: only the Label's asterisk shows it. */
  isRequired?: boolean;

  /** Paints the field invalid and mounts the `FieldError` inside it. */
  isInvalid?: boolean;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form ownership. */
  form?: string;

  /** The input takes the focus when it appears. */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH's input is always a Tab stop. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: NSH has no wheel events. */
  isWheelDisabled?: boolean;

  /** The decrement button's accessible name; `Decrease <label>` by default. */
  decrementAriaLabel?: string;

  /** The increment button's accessible name; `Increase <label>` by default. */
  incrementAriaLabel?: string;

  /** The input took the focus. */
  onFocus?: () => void;

  /** The input lost the focus, after the text was committed. */
  onBlur?: () => void;

  /** The focus moved in or out of the field. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Accepted, no effect: NSH has no element-level key events; keys go through `keymap`. */
  onKeyDown?: (event: unknown) => void;

  /** Accepted, no effect, as `onKeyDown`. */
  onKeyUp?: (event: unknown) => void;

  /** The accessible name of the input; wins over the Label's registered text. */
  "aria-label"?: string;

  /** The accessible name through the host prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** A DOM id upstream; names the input, as React Aria's `useId(id)` does. */
  id?: string;

  /** NSH's own name for the input; `id` wins. */
  nativeID?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The fill flavor. @default "primary" */
  variant?: NumberFieldVariants["variant"];

  /** Stretches the field across its parent. @default false */
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

/**
 * NumberField.Root / NumberFieldRoot: the field container, the committed value,
 * its display text, the validation result and the four contexts the parts and
 * the already-ported Label / Description / FieldError read.
 *
 * It reads `props.children` exactly once, at the placement inside every
 * provider (the provider exception in the common rules): a `computed` built in
 * the body would evaluate outside them, and the text parts would lose the field
 * state. The root itself has no role, like upstream's plain `<div>`.
 */
export function NumberFieldRoot(props: NumberFieldRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "value",
    "defaultValue",
    "onChange",
    "minValue",
    "maxValue",
    "step",
    "formatOptions",
    "commitBehavior",
    "validate",
    "validationBehavior",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "name",
    "form",
    "autoFocus",
    "excludeFromTabOrder",
    "isWheelDisabled",
    "decrementAriaLabel",
    "incrementAriaLabel",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "onKeyDown",
    "onKeyUp",
    "aria-label",
    "accessibilityLabel",
    "aria-disabled",
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
  const variant = computed<"primary" | "secondary">(() =>
    local.variant === "secondary" ? "secondary" : "primary",
  );

  const resolvedSlots = computed(() =>
    numberFieldVariants({ fullWidth: local.fullWidth, variant: local.variant }),
  );

  // Re-wrapped so each slot call goes through the computed: the context shape is
  // HeroUI's `slots.input()` call, and a runtime dimension change re-resolves it.
  const slots: NumberFieldContextValue["slots"] = {
    base: () => resolvedSlots().base(),
    group: () => resolvedSlots().group(),
    input: () => resolvedSlots().input(),
    incrementButton: () => resolvedSlots().incrementButton(),
    decrementButton: () => resolvedSlots().decrementButton(),
  } as NumberFieldContextValue["slots"];

  // --- Effective state ------------------------------------------------------
  const isDisabled = computed(() => local.isDisabled ?? false);
  const isReadOnly = computed(() => local.isReadOnly ?? false);
  const isRequired = computed(() => local.isRequired ?? false);

  const focusWithin = signal(false);

  const state = createNumberFieldState(local, focusWithin);

  const isInvalid = computed(
    () =>
      local.isInvalid === true ||
      local["aria-invalid"] === true ||
      local["aria-invalid"] === "true" ||
      state.validationErrors().length > 0,
  );

  // --- Focus ----------------------------------------------------------------
  const handleFocus = () => {
    focusWithin.set(true);
    local.onFocusChange?.(true);
    local.onFocus?.();
  };

  const handleBlur = () => {
    // Upstream commits when the focus leaves the field; the text is the edit's
    // only home until then. Committing before the focus flips lets an announce
    // see the field as focused, as React Aria's does.
    state.commit();
    focusWithin.set(false);
    local.onFocusChange?.(false);
    local.onBlur?.();
  };

  const inputFocus = signal<(() => void) | undefined>(undefined);

  const registerInputFocus = (focus: () => void) => {
    inputFocus.set(focus);

    return () => {
      if (inputFocus() === focus) {
        inputFocus.set(undefined);
      }
    };
  };

  const focusInput = () => {
    inputFocus()?.();
  };

  // --- Button registrations (R-009 … R-011) --------------------------------
  // Stands in for `:has([slot="decrement"])` / `:has([slot="increment"])`: the
  // parts register on creation and unregister on cleanup; the group reads the
  // two counts. Like `:has()`, only presence matters, not DOM order.
  const decrementCount = signal(0);
  const incrementCount = signal(0);

  const registerDecrement = () => {
    decrementCount.update((count) => count + 1);

    return () => decrementCount.update((count) => Math.max(0, count - 1));
  };

  const registerIncrement = () => {
    incrementCount.update((count) => count + 1);

    return () => incrementCount.update((count) => Math.max(0, count - 1));
  };

  const hasDecrement = computed(() => decrementCount() > 0);
  const hasIncrement = computed(() => incrementCount() > 0);

  // --- Registered field texts ----------------------------------------------
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

  // Description first, error second, as `aria-describedby` lists them upstream.
  const accessibilityHint = computed(() => joinedText([descriptionText, errorText]));

  const incrementAriaLabel = computed(() => {
    if (local.incrementAriaLabel !== undefined) {
      return local.incrementAriaLabel;
    }

    const name = local["aria-label"] ?? labelText();

    return name ? `Increase ${name}` : "Increase";
  });

  const decrementAriaLabel = computed(() => {
    if (local.decrementAriaLabel !== undefined) {
      return local.decrementAriaLabel;
    }

    const name = local["aria-label"] ?? labelText();

    return name ? `Decrease ${name}` : "Decrease";
  });

  // --- Contexts -------------------------------------------------------------
  // R-003: `.number-field [data-slot="label"] { @apply w-fit }` has no channel
  // here. The shipped `FieldState` carries only state and the label / focus
  // registry, not a `partClass`, and Label appends just its own variant classes
  // and the caller's `className`, so a field root cannot make the label shrink
  // to its text. Registered in §8; an additive, optional `FieldState.partClass`
  // (the channel `DescriptionContext` already has) would close it in the batch
  // that owns Label.
  const fieldState: FieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel: (read) => registerInto(labelSources, read),
    focusField: () => focusInput(),
  };

  const descriptionState: DescriptionContextValue = {
    registerDescription: (read) => registerInto(descriptionSources, read),
    // R-002: `.number-field[data-invalid] [data-slot="description"] { display:
    // none }`. The Description appends this after its own classes; it keeps its
    // accessibility hint, which `display: none` would take away upstream.
    partClass: () => (isInvalid() ? "hidden" : undefined),
  };

  const fieldErrorState: FieldErrorState = {
    isInvalid,
    validationErrors: () => state.validationErrors(),
    registerErrorMessage: (read) => registerInto(errorSources, read),
  };

  const contextValue: NumberFieldContextValue = {
    slots,
    variant,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    validationErrors: state.validationErrors,
    text: state.text,
    setInputValue: state.setInputValue,
    commit: state.commit,
    numberValue: state.numberValue,
    minValue: state.minValue,
    maxValue: state.maxValue,
    canIncrement: state.canIncrement,
    canDecrement: state.canDecrement,
    increment: state.increment,
    decrement: state.decrement,
    incrementToMax: state.incrementToMax,
    decrementToMin: state.decrementToMin,
    isFocusWithin: focusWithin,
    setFocusWithin: (value) => focusWithin.set(value),
    focusInput,
    registerInputFocus,
    registerDecrement,
    registerIncrement,
    hasDecrement,
    hasIncrement,
    labelText,
    ariaLabel: () => local["aria-label"],
    accessibilityHint,
    inputId: () => local.id ?? local.nativeID,
    autoFocus: () => local.autoFocus ?? false,
    incrementAriaLabel,
    decrementAriaLabel,
    handleFocus,
    handleBlur,
    state: state.state,
  };

  // --- Render props and classes ---------------------------------------------
  const renderProps: NumberFieldRenderProps = {
    isDisabled,
    isInvalid,
    isReadOnly,
    isRequired,
    state: state.state,
    defaultClassName: slots.base(),
    defaultStyle: {},
  };

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() => joinClassNames(slots.base(), resolvedClassName()));

  // One read of `props.children`, at the placement inside every provider.
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() => (children as (values: NumberFieldRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <NumberFieldContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <DescriptionContext.Provider value={descriptionState}>
          <FieldErrorContext.Provider value={fieldErrorState}>
            <View
              {...hostProps(rest)}
              ref={(node) => local.ref?.(node)}
              class={classes()}
              style={resolvedStyle()}
            >
              {content()}
            </View>
          </FieldErrorContext.Provider>
        </DescriptionContext.Provider>
      </FieldContext.Provider>
    </NumberFieldContext.Provider>
  );
}
