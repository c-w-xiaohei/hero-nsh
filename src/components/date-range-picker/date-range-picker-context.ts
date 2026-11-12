import type { Accessor, ViewRef, ViewStyle } from "nsh";
import { context } from "nsh";

import type { DateFieldState } from "../date-input-group/create-date-field-state";
import { dateRangePickerVariants } from "./date-range-picker.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What `DateRangePicker.Root`'s function `children`, `className` and `style`
 * receive: React Aria's `DateRangePickerRenderProps` (`react-aria-components/
 * src/DateRangePicker.tsx`), with the booleans as accessors per D17, plus the
 * `defaultClassName` / `defaultStyle` pair `useRenderProps` adds.
 */
export interface DateRangePickerRenderProps {
  /** A segment of either field, or the trigger, holds the focus. */
  isFocusWithin: Accessor<boolean>;

  /** That focus came from the keyboard, so the keyboard affordances show. */
  isFocusVisible: Accessor<boolean>;

  /** The whole picker is disabled. */
  isDisabled: Accessor<boolean>;

  /** The value cannot be edited. */
  isReadOnly: Accessor<boolean>;

  /** Invalid from the prop, from the caller's errors, or from validation. */
  isInvalid: Accessor<boolean>;

  /** The value is required; the Label shows its asterisk. */
  isRequired: Accessor<boolean>;

  /** The range calendar popover is shown. */
  isOpen: Accessor<boolean>;

  /**
   * The range field state the picker shares with its two fields: `value` /
   * `setValue` plus slot-aware segment and editing members (port sheet §2). A
   * reader that needs one side asks `forSlot("start" | "end")`.
   */
  state: DateFieldState;

  /** The `base` slot's class string, before the caller's `className`. */
  defaultClassName: string;

  /** An empty style object, as React Aria's `useRenderProps` supplies. */
  defaultStyle: ViewStyle;
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a `DateRangePicker.Popover` registers with its root: the layer the root
 * actually shows. A popover that was given its own `isOpen` / `defaultOpen`
 * holds the state itself (React Aria's rule, port sheet §1.6), so the root
 * cannot read the picker's disclosure alone: it asks the registered layer.
 */
export interface DateRangePickerLayer {
  isOpen: Accessor<boolean>;
  setOpen: (next: boolean) => void;
}

/** Everything the parts of one DateRangePicker read from its root. */
export interface DateRangePickerContextValue {
  /** The five slot class strings. */
  slots: ReturnType<typeof dateRangePickerVariants>;

  /** The range field state, shared with the field group. */
  state: DateFieldState;

  /** Whether the range calendar layer is shown. */
  isOpen: Accessor<boolean>;

  /** Sets the open state (the trigger's press, an outside press, Escape, a pick). */
  setOpen: (next: boolean) => void;

  /** Flips the open state (the trigger's press). */
  toggle: () => void;

  /** Closes the layer (the range was picked, the pointer went outside). */
  close: () => void;

  /**
   * A popover hands the root the state it actually shows, so the root's
   * `isOpen`, `toggle` and `close` drive the popover that was given its own
   * channel. Returns the unregister function.
   */
  registerLayer: (layer: DateRangePickerLayer) => () => void;

  /** The trigger registers its view: the focus-return target and the render props' focus. */
  registerTrigger: (ref: ViewRef) => () => void;

  /** The trigger's view, once registered. */
  triggerRef: Accessor<ViewRef | undefined>;

  /** A trigger reports whether it holds the focus (`isFocusWithin`); returns the unregister. */
  registerTriggerFocus: (isFocused: Accessor<boolean>) => () => void;

  /** Records that a keyboard interaction happened while the layer was open. */
  markRestoreFocus: () => void;

  /** The field group's element, which the layer is anchored to. */
  anchorRef: Accessor<ViewRef | undefined>;

  /** The registered Label text, the layer's fallback accessible name. */
  labelText: Accessor<string | undefined>;

  /** The picker is disabled: the trigger is too. */
  isDisabled: Accessor<boolean>;

  /** The last interaction was the keyboard (shared by the trigger's ring and the render props). */
  isKeyboard: Accessor<boolean>;

  /** Records a keyboard interaction. */
  setKeyboardModality: () => void;

  /** Records a pointer interaction. */
  setPointerModality: () => void;
}

/**
 * What the parts see outside a `DateRangePicker.Root`: a picker with no state,
 * no layer and no registrations. A part used on its own then renders its
 * resting look instead of crashing.
 */
const FALLBACK_SLOTS = dateRangePickerVariants();

export const FALLBACK_DATE_RANGE_PICKER_CONTEXT: DateRangePickerContextValue = {
  slots: FALLBACK_SLOTS,
  // A lone part has no value state. The read is never reached in practice: the
  // trigger without a picker opens nothing and the popover has no content.
  state: undefined as unknown as DateFieldState,
  isOpen: () => false,
  setOpen: () => {},
  toggle: () => {},
  close: () => {},
  registerLayer: () => () => {},
  registerTrigger: () => () => {},
  triggerRef: () => undefined,
  registerTriggerFocus: () => () => {},
  markRestoreFocus: () => {},
  anchorRef: () => undefined,
  labelText: () => undefined,
  isDisabled: () => false,
  isKeyboard: () => false,
  setKeyboardModality: () => {},
  setPointerModality: () => {},
};

export const DateRangePickerContext = context<DateRangePickerContextValue>(
  FALLBACK_DATE_RANGE_PICKER_CONTEXT,
);

/** The context a root provides; internal, like the group's and the field's. */
export function useDateRangePickerContext(): DateRangePickerContextValue {
  return DateRangePickerContext();
}
