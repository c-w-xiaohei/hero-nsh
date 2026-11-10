import type {
  Accessor,
  JSX,
  StyleProp,
  ViewProps,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, signal, split, untracked, View } from "nsh";

import { DescriptionContext } from "../description/context";
import type { DescriptionContextValue } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import type { FieldErrorState } from "../field-error/context";
import { FieldContext } from "../label/context";
import type { FieldState } from "../label/context";
import { DateInputGroupFieldContext } from "../date-input-group/date-input-group-context";
import type { DateFieldValidationError } from "../date-input-group/create-date-field-state";
import {
  createTimeFieldState,
  type TimeFieldGranularity,
  type TimeFieldState,
  type TimeValue,
} from "./create-time-field-state";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./time-field-dom-props";
import { timeFieldVariants } from "./time-field.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What HeroUI's `DateFieldRenderProps` hands to `children`, `className` and
 * `style` (`react-aria-components/src/DateField.tsx:65-94`), accessorized per
 * D17. `defaultClassName` / `defaultStyle` are the pair React Aria's
 * `useRenderProps` adds, so a caller can append to or replace them.
 */
export interface TimeFieldRenderProps {
  /** The whole field is disabled. */
  isDisabled: Accessor<boolean>;

  /** Invalid from the prop, from the caller's errors, or from validation. */
  isInvalid: Accessor<boolean>;

  /** The segments can be focused but not edited. */
  isReadOnly: Accessor<boolean>;

  /** The field must be filled; the Label shows its asterisk. */
  isRequired: Accessor<boolean>;

  /** The field's value state, with accessor members and `timeValue` (D17). */
  state: TimeFieldState;

  /** The `base` slot's class string, before the caller's `className`. */
  defaultClassName: string;

  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/**
 * The props of `TimeField.Root`: HeroUI 3.2.7's `TimeFieldRootProps`, which is
 * React Aria Components' `TimeField` (`AriaTimeFieldProps` + `RACValidation` +
 * `DateFieldRenderProps` + `SlotProps` + `GlobalDOMAttributes`) plus the
 * `fullWidth` variant, expressed with NSH's view host props.
 *
 * The DOM-only members upstream are accepted so code written against HeroUI
 * keeps compiling; port sheet §1.2 says what each can and cannot do here.
 */
export interface TimeFieldRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The field's content: an element, or a render prop called once with the
   * field state (D17). Bare strings and numbers become `Text` at the placement,
   * or NSH would not draw them.
   */
  children?: JSX.Element | ((values: TimeFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: TimeFieldRenderProps) => string | undefined);

  /** Style of the field; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: TimeFieldRenderProps) => StyleProp<ViewStyle>);

  /** Stretches the field across its parent. @default false */
  fullWidth?: boolean;

  /** The value, controlled. `undefined` makes the field uncontrolled. */
  value?: TimeValue | null;

  /** The initial value, uncontrolled. Absent means empty. */
  defaultValue?: TimeValue | null;

  /** The value changed; the payload is a `Time`, or the `ZonedDateTime` the field was given. */
  onChange?: (value: TimeValue | null) => void;

  /** The time the empty segments show. */
  placeholderValue?: TimeValue | null;

  /** The smallest displayed unit. @default "minute" */
  granularity?: TimeFieldGranularity;

  /** 12 or 24 hour display; the locale decides when absent. */
  hourCycle?: 12 | 24;

  /** Hides the time zone abbreviation of a zoned value. @default false */
  hideTimeZone?: boolean;

  /** Forces leading zeros in the hour segment. @default false */
  shouldForceLeadingZeros?: boolean;

  /** The locale the segments are formatted and edited in (default: the host's). */
  locale?: string;

  /** The earliest allowed time; commits below it report "Date out of range". */
  minValue?: TimeValue | null;

  /** The latest allowed time; commits above it report "Date out of range". */
  maxValue?: TimeValue | null;

  /** Runs on every commit; `true` when valid, otherwise a message or `{ message }`. */
  validate?: (value: TimeValue) => true | string | DateFieldValidationError | null | undefined;

  /** The caller's errors; their messages come before the field's own. */
  validationErrors?: readonly DateFieldValidationError[];

  /** Accepted, no effect: NSH has no `ValidityState`. */
  validationDetails?: unknown;

  /** Accepted, no effect: NSH has no native form validation; the field validates on commit. */
  validationBehavior?: "native" | "aria";

  /** Dims the field and makes its segments inert. */
  isDisabled?: boolean;

  /** The segments stay focusable and the value cannot change. */
  isReadOnly?: boolean;

  /** The field must be filled: only the Label's asterisk shows it. */
  isRequired?: boolean;

  /** Paints the field invalid and mounts the `FieldError` inside it. */
  isInvalid?: boolean;

  /** The first editable segment takes the focus when the field appears. */
  autoFocus?: boolean;

  /** Accepted, no effect: NSH has no form submission, so there is no hidden input. */
  name?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; becomes the view's `nativeID`. */
  id?: string;

  /** NSH's own id; `id` wins. */
  nativeID?: string;

  /** The accessible name of the field, put on the root view. */
  "aria-label"?: string;

  /** The visible text of a Label, kept for the optional name channel in §5. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;

  /** The field's view, forwarded as a callback (an undefined ref store throws on the web). */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * TimeField.Root / TimeFieldRoot: the field's value bridge, validation result and
 * the four contexts the parts and the already-ported Label / Description /
 * FieldError read (port sheet §5). Upstream it is a near-empty shell around RAC's
 * `TimeField`, so nothing here draws a segment: `Group` / `Input` /
 * `InputContainer` / `Segment` / `Prefix` / `Suffix` are the `date-input-group`
 * parts, bound by identity in `index.ts`.
 *
 * It reads `props.children` exactly once, at the placement inside every provider
 * (the provider exception in the common rules): a `computed` built in the body
 * would evaluate outside them, and the parts would lose the field state. The root
 * itself has no role, like upstream's plain `<div>`.
 */
export function TimeFieldRoot(props: TimeFieldRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "fullWidth",
    "value",
    "defaultValue",
    "onChange",
    "placeholderValue",
    "granularity",
    "hourCycle",
    "hideTimeZone",
    "shouldForceLeadingZeros",
    "locale",
    "minValue",
    "maxValue",
    "validate",
    "validationErrors",
    "validationDetails",
    "validationBehavior",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "autoFocus",
    "name",
    "slot",
    "id",
    "nativeID",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "accessibilityLabel",
    "ref",
  ] as const);

  // --- Variant table (R-001, R-004) ----------------------------------------
  // The table has a single `base` slot and no slots object, exactly like
  // `timeFieldVariants` upstream, so it resolves to the class string itself.
  const fullWidth = computed(() => local.fullWidth ?? false);
  const baseClass = computed(() => timeFieldVariants({ fullWidth: fullWidth() }));

  // --- Field state and effective flags -------------------------------------
  const isDisabled = computed(() => local.isDisabled ?? false);
  const isReadOnly = computed(() => local.isReadOnly ?? false);
  const isRequired = computed(() => local.isRequired ?? false);

  const state = createTimeFieldState({
    value: () => local.value,
    defaultValue: () => local.defaultValue,
    onChange: (value) => local.onChange?.(value),
    placeholderValue: () => local.placeholderValue,
    granularity: () => local.granularity,
    hourCycle: () => local.hourCycle,
    hideTimeZone: () => local.hideTimeZone,
    shouldForceLeadingZeros: () => local.shouldForceLeadingZeros,
    locale: () => local.locale,
    minValue: () => local.minValue,
    maxValue: () => local.maxValue,
    validate: () => local.validate,
    isDisabled: () => local.isDisabled,
    isReadOnly: () => local.isReadOnly,
    isRequired: () => local.isRequired,
    isInvalid: () => local.isInvalid,
  });

  // The caller's errors come first, the field's own validation after them, as
  // an `aria-describedby` list would order them (port sheet §8, item 8).
  const externalErrors = computed(() =>
    (local.validationErrors ?? [])
      .map((error) => error.message)
      .filter((message): message is string => typeof message === "string" && message.length > 0),
  );

  const validationErrors = computed(() => [...externalErrors(), ...state.validationErrors()]);

  const isInvalid = computed(
    () =>
      local.isInvalid === true || externalErrors().length > 0 || state.validationErrors().length > 0,
  );

  const focusField = () => {
    // A segment that already holds the focus keeps it (a `<label for>` press on
    // a field whose control is focused changes nothing); otherwise the first
    // editable segment takes it, which is what `focusAdjacent(1)` does with no
    // focused segment.
    if (state.focusedSegment() == null) {
      state.focusAdjacent(1);
    }
  };

  // `autoFocus` runs once after the subtree mounted, so the segment elements are
  // registered by then (the same shape as Switch's root). Untracked, so a later
  // value change does not pull the focus back into the field.
  effect(() => {
    if (local.autoFocus) {
      untracked(() => state.focusAdjacent(1));
    }
  });

  // --- Registered field texts ----------------------------------------------
  // Label / Description / FieldError register their text here, as they do with
  // every field root. A TimeField has no focusable control of its own (the
  // segments carry their own names), and the Group has no name channel yet, so
  // the texts are kept for the optional `DateInputGroupFieldContext` extension
  // in §5 and consumed by nothing today (§8, item 2).
  const labelSources = signal<readonly (() => string | undefined)[]>([]);
  const descriptionSources = signal<readonly (() => string | undefined)[]>([]);
  const errorSources = signal<readonly (() => string | undefined)[]>([]);

  const registerInto = (target: typeof labelSources, read: () => string | undefined) => {
    target.update((current) => [...current, read]);

    return () => {
      target.update((current) => current.filter((entry) => entry !== read));
    };
  };

  // --- Contexts -------------------------------------------------------------
  // R-003: `.time-field [data-slot="label"] { @apply w-fit }` has no channel
  // here; see `time-field.styles.ts` and §8.
  const fieldState: FieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel: (read) => registerInto(labelSources, read),
    focusField,
  };

  const descriptionState: DescriptionContextValue = {
    registerDescription: (read) => registerInto(descriptionSources, read),
    // R-002: `.time-field[data-invalid="true"] [data-slot="description"]` (and
    // the `aria-invalid` twin) → `display: none`. A descendant selector has no
    // NSH counterpart, so the root hands the Description a `hidden` class while
    // the field is invalid; the Description keeps its accessibility text, which
    // `display: none` would take away upstream (§8, item 3).
    partClass: () => (isInvalid() ? "hidden" : undefined),
  };

  const fieldErrorState: FieldErrorState = {
    isInvalid,
    validationErrors,
    registerErrorMessage: (read) => registerInto(errorSources, read),
  };

  // --- Render props and classes ---------------------------------------------
  const renderProps: TimeFieldRenderProps = {
    isDisabled,
    isInvalid,
    isReadOnly,
    isRequired,
    state,
    defaultClassName: baseClass(),
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

  const classes = computed(() => {
    const caller = resolvedClassName();

    return caller ? `${baseClass()} ${caller}` : baseClass();
  });

  // One read of `props.children`, at the placement inside every provider.
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() => (children as (values: TimeFieldRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <DateInputGroupFieldContext.Provider value={state}>
      <FieldContext.Provider value={fieldState}>
        <DescriptionContext.Provider value={descriptionState}>
          <FieldErrorContext.Provider value={fieldErrorState}>
            <View
              {...hostProps(rest)}
              ref={(node) => local.ref?.(node)}
              class={classes()}
              style={resolvedStyle()}
              nativeID={local.id ?? local.nativeID}
              accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
            >
              {content()}
            </View>
          </FieldErrorContext.Provider>
        </DescriptionContext.Provider>
      </FieldContext.Provider>
    </DateInputGroupFieldContext.Provider>
  );
}
