import type { Accessor, Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, effect, locale as hostLocale, signal, split, untracked, View } from "nsh";
import type { CalendarIdentifier, DateValue } from "@internationalized/date";
import { createCalendar as createCalendarDefault } from "@internationalized/date";

import {
  createInteractionModality,
  type InteractionModalityState,
} from "../../primitives/create-interaction-modality";
import {
  createOverlayTrigger,
} from "../../primitives/create-overlay-trigger";
import {
  CalendarDefaultsContext,
  type CalendarDefaultsValue,
} from "../calendar/calendar-context";
import {
  createDateFieldState,
  type DateFieldState,
  type DateFieldValidationError,
} from "../date-input-group/create-date-field-state";
import {
  DateInputGroupAffixContext,
  DateInputGroupAnchorContext,
  DateInputGroupFieldContext,
} from "../date-input-group/date-input-group-context";
import type { Granularity, MaxGranularity } from "../date-input-group/date-field-utils";
import { DescriptionContext, type DescriptionContextValue } from "../description/context";
import { FieldErrorContext, type FieldErrorState } from "../field-error/context";
import { FieldContext, type FieldState } from "../label/context";
import type { DatePickerContextValue, DatePickerLayer } from "./date-picker-context";
import { DatePickerContext, type DatePickerRenderProps } from "./date-picker-context";
import { datePickerVariants } from "./date-picker.styles";
import { renderChildren } from "./render-children";

/** The calendar factory HeroUI's `createCalendar` prop takes. */
type CreateCalendar = (name: CalendarIdentifier) => ReturnType<typeof createCalendarDefault>;

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `DatePicker.Root` / `DatePicker`: HeroUI 3.2.7's
 * `DatePickerRootProps`, which is React Aria Components' `DatePicker`
 * (`AriaDatePickerProps` without the validation-label props, plus
 * `RACValidation`, `shouldCloseOnSelect`, the render props, `SlotProps` and
 * `GlobalDOMAttributes`) plus the empty `DatePickerVariants`.
 *
 * DOM-only members are accepted so code written against HeroUI keeps
 * compiling; they have no effect here (D18, port sheet §1.7 and §8).
 */
export interface DatePickerRootProps {
  /**
   * The picker's content: an element, or a render prop called once with the
   * picker's state (D17). Read once, at the placement inside every provider
   * (the provider exception in the common rules).
   */
  children?: JSX.Element | ((values: DatePickerRenderProps) => JSX.Element);

  /** Appended after the `base` slot classes; the function form gets the same accessors. */
  className?: string | ((values: DatePickerRenderProps) => string | undefined);

  /** Style of the root view; the function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: DatePickerRenderProps) => StyleProp<ViewStyle>);

  /** The value, controlled. `undefined` makes the picker uncontrolled. */
  value?: DateValue | null;

  /** The initial value, uncontrolled. Absent means empty. */
  defaultValue?: DateValue | null;

  /** The value changed: a selection in the calendar, or a committed segment edit. */
  onChange?: (value: DateValue | null) => void;

  /** The date the empty segments show, and the calendar's starting month when empty. */
  placeholderValue?: DateValue | null;

  /** The smallest displayed unit; the value's precision decides when absent. */
  granularity?: Granularity;

  /** The largest displayed unit. @default "year" */
  maxGranularity?: MaxGranularity;

  /** 12 or 24 hour display; the locale decides when absent. */
  hourCycle?: 12 | 24;

  /** Hides the time zone abbreviation of a zoned value. @default false */
  hideTimeZone?: boolean;

  /** Forces leading zeros in the month, day and hour segments. @default false */
  shouldForceLeadingZeros?: boolean;

  /** The earliest allowed date, for the field and for the calendar. */
  minValue?: DateValue | null;

  /** The latest allowed date, for the field and for the calendar. */
  maxValue?: DateValue | null;

  /** Marks a date the user may not pick; it stays focusable. */
  isDateUnavailable?: (date: DateValue) => boolean;

  /** Builds the calendar for an identifier; defaults to `@internationalized/date`. */
  createCalendar?: CreateCalendar;

  /** Runs on every commit; `true` when valid, otherwise a message or `{ message }`. */
  validate?: (
    value: DateValue | null,
  ) => true | string | DateFieldValidationError | null | undefined;

  /** The caller's errors; their messages come before the field's own. */
  validationErrors?: readonly DateFieldValidationError[];

  /** Accepted, no effect: NSH has no `ValidityState`. */
  validationDetails?: unknown;

  /** Accepted, no effect: NSH has no native form validation; the picker validates on commit. */
  validationBehavior?: "native" | "aria";

  /** Dims the picker and makes its segments and trigger inert. */
  isDisabled?: boolean;

  /** The segments stay focusable and the value cannot change. */
  isReadOnly?: boolean;

  /** The picker must be filled: the Label shows its asterisk. */
  isRequired?: boolean;

  /** Paints the picker invalid and mounts the `FieldError` inside it. */
  isInvalid?: boolean;

  /** Focuses the first editable segment when the picker appears. */
  autoFocus?: boolean;

  /** The calendar layer's open state, controlled. */
  isOpen?: boolean;

  /** The initial open state, uncontrolled. @default false */
  defaultOpen?: boolean;

  /** The layer opened or closed. */
  onOpenChange?: (isOpen: boolean) => void;

  /** Whether picking a date closes the layer. @default true */
  shouldCloseOnSelect?: boolean;

  /** Accepted, no effect: NSH has no form submission, so there is no hidden input. */
  name?: string;

  /** The locale the segments and the calendar are formatted in (default: the host's). */
  locale?: string;

  /** A segment or the trigger took the focus. */
  onFocus?: () => void;

  /** The focus left every part of the picker. */
  onBlur?: () => void;

  /** Both focus transitions, as React Aria's `FocusEvents` report them. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** A DOM id upstream; becomes the view's `nativeID`. */
  id?: string;

  /** NSH's own id; `id` wins. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The accessible name of the picker, put on the root view. */
  "aria-label"?: string;

  /** NSH's own accessible name; `aria-label` wins. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;

  /** The picker was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** The picker's view, forwarded as a callback only (an undefined ref store throws on the web). */
  ref?: (node: ViewRef) => void;

  /** Any other DOM / global attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * DatePicker.Root / DatePickerRoot: the value bridge, the one open state, the
 * calendar defaults and the five contexts the parts and the already-ported
 * Label / Description / FieldError read (port sheet §2 and §5).
 *
 * It reads `props.children` exactly once, at the placement inside every
 * provider (the provider exception in the common rules): a `computed` built in
 * the body would evaluate outside them and the parts would lose their state.
 */
export function DatePickerRoot(props: DatePickerRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "value",
    "defaultValue",
    "onChange",
    "placeholderValue",
    "granularity",
    "maxGranularity",
    "hourCycle",
    "hideTimeZone",
    "shouldForceLeadingZeros",
    "minValue",
    "maxValue",
    "isDateUnavailable",
    "createCalendar",
    "validate",
    "validationErrors",
    "validationDetails",
    "validationBehavior",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "autoFocus",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "shouldCloseOnSelect",
    "name",
    "locale",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "slot",
    "render",
    "id",
    "nativeID",
    "testID",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "onLayout",
    "ref",
  ] as const);

  const slots = datePickerVariants();

  /* -------------------------------------------------------------------------------------------
   * Value and segment state (port sheet §2)
   * ----------------------------------------------------------------------------------------- */
  const state: DateFieldState = createDateFieldState({
    value: () => local.value,
    defaultValue: () => local.defaultValue,
    onChange: (value) => local.onChange?.(value),
    placeholderValue: () => local.placeholderValue,
    granularity: () => local.granularity,
    maxGranularity: () => local.maxGranularity,
    hourCycle: () => local.hourCycle,
    hideTimeZone: () => local.hideTimeZone,
    shouldForceLeadingZeros: () => local.shouldForceLeadingZeros,
    minValue: () => local.minValue,
    maxValue: () => local.maxValue,
    isDateUnavailable: () => local.isDateUnavailable,
    createCalendar: () => local.createCalendar ?? createCalendarDefault,
    locale: () => local.locale ?? hostLocale(),
    validate: () => local.validate,
    isDisabled: () => local.isDisabled,
    isReadOnly: () => local.isReadOnly,
    isRequired: () => local.isRequired,
    // The root's computed flag, not the raw prop: it also counts the caller's
    // `validationErrors`, so the group, the Label and the FieldError agree.
    // Read lazily, and it never reads `state.isInvalid`, so there is no cycle.
    isInvalid: () => isInvalid(),
  });

  const isDisabled = computed(() => local.isDisabled ?? false);
  const isReadOnly = computed(() => local.isReadOnly ?? false);
  const isRequired = computed(() => local.isRequired ?? false);

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

  /* -------------------------------------------------------------------------------------------
   * Open state: the picker's disclosure plus the layer a popover registers.
   * ----------------------------------------------------------------------------------------- */
  const disclosure = createOverlayTrigger({
    isOpen: () => local.isOpen,
    defaultOpen: () => local.defaultOpen,
    onOpenChange: (value) => local.onOpenChange?.(value),
    // The focus return is the picker's own rule (an unmodified keyboard key
    // while open), not the disclosure's unconditional one: a pointer pick must
    // leave the focus where it is (`date-picker.tsx:55-84`).
    returnFocus: () => false,
  });

  const layer = signal<DatePickerLayer | undefined>(undefined);

  const registerLayer = (next: DatePickerLayer) => {
    layer.set(next);

    return () => {
      if (layer() === next) {
        layer.set(undefined);
      }
    };
  };

  const isOpen = computed(() => layer()?.isOpen() ?? disclosure.isOpen());

  const setOpen = (next: boolean) => {
    const current = layer();

    if (current) {
      current.setOpen(next);
    } else {
      disclosure.setIsOpen(next);
    }
  };

  const toggle = () => setOpen(!isOpen());
  const close = () => setOpen(false);

  // `shouldCloseOnSelect` decides whether a pick closes the layer (default true).
  const shouldCloseOnSelect = () => local.shouldCloseOnSelect !== false;

  // --- Focus return to the trigger ------------------------------------------
  // HeroUI listens on `window` for any unmodified keydown while the layer is
  // open and marks the close as keyboard (so the trigger gets the focus back).
  // NSH has no document-level keys: Escape arrives from the layer's `onCancel`,
  // and the layer's key bindings mark the other keys (port sheet §5).
  let restoreFocusToTrigger = false;

  const markRestoreFocus = () => {
    restoreFocusToTrigger = true;
  };

  let wasOpen = isOpen();

  effect(() => {
    const open = isOpen();

    if (open) {
      wasOpen = true;

      return;
    }

    if (!wasOpen) {
      return;
    }

    wasOpen = false;

    if (!restoreFocusToTrigger) {
      return;
    }

    restoreFocusToTrigger = false;

    const node = disclosure.triggerRef();

    if (node) {
      requestAnimationFrame(() => node.focus());
    }
  });

  /* -------------------------------------------------------------------------------------------
   * Modality, focus aggregation and the render props
   * ----------------------------------------------------------------------------------------- */
  const modality: InteractionModalityState = createInteractionModality();

  const triggerTargets = signal<readonly Accessor<boolean>[]>([]);

  const registerTriggerFocus = (isFocused: Accessor<boolean>) => {
    triggerTargets.update((current) => [...current, isFocused]);

    return () => {
      triggerTargets.update((current) => current.filter((target) => target !== isFocused));
    };
  };

  const triggerFocused = computed(() => triggerTargets().some((target) => target()));
  const isFocusWithin = computed(() => state.focusedSegment() != null || triggerFocused());
  const isFocusVisible = computed(() => isFocusWithin() && modality.isKeyboard());

  // RAC reports the focus through `useFocusWithin`; NSH has no bubbling focus,
  // so the null ↔ non-null transitions of `isFocusWithin` are the picker's
  // focus and blur (the same shape as DateField's root).
  let hadFocus = false;

  effect(() => {
    const focused = isFocusWithin();

    if (focused === hadFocus) {
      return;
    }

    hadFocus = focused;

    if (focused) {
      local.onFocus?.();
    } else {
      local.onBlur?.();
    }

    local.onFocusChange?.(focused);
  });

  // `autoFocus` focuses the first editable segment once the parts are mounted.
  effect(() => {
    if (local.autoFocus) {
      untracked(() => state.focusAdjacent(1));
    }
  });

  /* -------------------------------------------------------------------------------------------
   * Registered field texts and the layer's accessible name
   * ----------------------------------------------------------------------------------------- */
  const labelSources = signal<readonly (() => string | undefined)[]>([]);
  const descriptionSources = signal<readonly (() => string | undefined)[]>([]);
  const errorSources = signal<readonly (() => string | undefined)[]>([]);

  const registerInto = (target: typeof labelSources, read: () => string | undefined) => {
    target.update((current) => [...current, read]);

    return () => {
      target.update((current) => current.filter((entry) => entry !== read));
    };
  };

  // The layer's accessible name: upstream points `aria-labelledby` at the
  // Label's id, which NSH cannot resolve, so the registered text is handed
  // down instead (port sheet §1.5, §8).
  const labelText = computed(() => joinedText(labelSources()));

  /* -------------------------------------------------------------------------------------------
   * Anchor: the field group's element (§5, second change)
   * ----------------------------------------------------------------------------------------- */
  const anchorElement = signal<ViewRef | undefined>(undefined);

  /* -------------------------------------------------------------------------------------------
   * Calendar defaults (§5, first change)
   * ----------------------------------------------------------------------------------------- */
  const calendarDefaults: CalendarDefaultsValue = {
    value: () => state.value(),
    onChange: (value) => {
      state.setValue((value ?? null) as DateValue | null);

      if (shouldCloseOnSelect()) {
        close();
      }
    },
    defaultFocusedValue: () => state.value() ?? local.placeholderValue ?? null,
    minValue: () => local.minValue,
    maxValue: () => local.maxValue,
    isDateUnavailable: () => local.isDateUnavailable,
    isDisabled: () => isDisabled(),
    isReadOnly: () => isReadOnly(),
    // RAC propagates `autoFocus` into the calendar, which would leave the
    // grid's key scope active from the first frame and swallow Escape (port
    // sheet §8, item 13): the focus stays on the layer instead.
    autoFocus: () => false,
    createCalendar: () => local.createCalendar,
    // R-028 / R-029: the popover cancels the calendar's right-to-left chevron
    // flip. A descendant selector has no NSH counterpart, so the class travels
    // to the nav button's icon through this context.
    navButtonIconClass: () => "rtl:rotate-0",
  };

  /* -------------------------------------------------------------------------------------------
   * Contexts
   * ----------------------------------------------------------------------------------------- */
  const fieldState: FieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel: (read) => registerInto(labelSources, read),
    focusField: () => {
      if (state.focusedSegment() == null) {
        state.focusAdjacent(1);
      }
    },
  };

  const descriptionState: DescriptionContextValue = {
    registerDescription: (read) => registerInto(descriptionSources, read),
  };

  const fieldErrorState: FieldErrorState = {
    isInvalid,
    validationErrors,
    registerErrorMessage: (read) => registerInto(errorSources, read),
  };

  const pickerContext: DatePickerContextValue = {
    slots,
    state,
    isOpen,
    setOpen,
    toggle,
    close,
    registerLayer,
    registerTrigger: disclosure.registerTrigger,
    triggerRef: disclosure.triggerRef,
    registerTriggerFocus,
    markRestoreFocus,
    anchorRef: anchorElement,
    labelText,
    isDisabled,
    isKeyboard: modality.isKeyboard,
    setKeyboardModality: modality.setKeyboardModality,
    setPointerModality: modality.setPointerModality,
  };

  // R-002 / R-003: `.date-picker .date-input-group__suffix` and `__prefix` turn
  // `pointer-events-none` into `auto`. A descendant selector has no NSH
  // counterpart, so the picker tells the group's affixes through this context.
  const affixContext = () => true;

  /* -------------------------------------------------------------------------------------------
   * Render props and classes (R-001)
   * ----------------------------------------------------------------------------------------- */
  const renderProps: DatePickerRenderProps = {
    isFocusWithin,
    isFocusVisible,
    isDisabled,
    isReadOnly,
    isInvalid,
    isRequired,
    isOpen,
    state,
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

  const classes = computed(() => {
    const caller = resolvedClassName();

    return caller ? `${slots.base()} ${caller}` : slots.base();
  });

  // The one read of `props.children`, at the placement inside every provider.
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() => (children as (values: DatePickerRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <DatePickerContext.Provider value={pickerContext}>
      <DateInputGroupFieldContext.Provider value={state}>
        <FieldContext.Provider value={fieldState}>
          <DescriptionContext.Provider value={descriptionState}>
            <FieldErrorContext.Provider value={fieldErrorState}>
              <DateInputGroupAffixContext.Provider value={affixContext}>
                <DateInputGroupAnchorContext.Provider
                  value={(ref) => anchorElement.set(ref)}
                >
                  <CalendarDefaultsContext.Provider value={calendarDefaults}>
                    <View
                      ref={(node) => local.ref?.(node)}
                      class={classes()}
                      style={resolvedStyle()}
                      nativeID={local.id ?? local.nativeID}
                      testID={local.testID}
                      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
                      accessibilityState={isDisabled() ? { disabled: true } : undefined}
                      onLayout={local.onLayout}
                    >
                      {content()}
                    </View>
                  </CalendarDefaultsContext.Provider>
                </DateInputGroupAnchorContext.Provider>
              </DateInputGroupAffixContext.Provider>
            </FieldErrorContext.Provider>
          </DescriptionContext.Provider>
        </FieldContext.Provider>
      </DateInputGroupFieldContext.Provider>
    </DatePickerContext.Provider>
  );
}

/** The registered texts joined the way an `aria-labelledby` list reads them. */
function joinedText(readers: readonly (() => string | undefined)[]): string | undefined {
  const text = readers
    .map((read) => read())
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}
