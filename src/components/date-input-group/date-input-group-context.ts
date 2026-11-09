import type { Accessor } from "nsh";
import { context } from "nsh";

import type { DateFieldState } from "./create-date-field-state";
import type { DateInputGroupVariants } from "./date-input-group.styles";
import { dateInputGroupVariants } from "./date-input-group.styles";

/**
 * The six slot class strings of the variant table, read by every part of the
 * group. HeroUI reaches them through its own `DateInputGroupContext`
 * (`date-input-group.tsx:22-26`); here the context also carries the states
 * HeroUI's stylesheet got from `data-*` attributes and `:has()` selectors
 * (D18, port sheet §2).
 *
 * This module is internal: the component entry does not export it, so the
 * context adds no public API. The consuming units (DateField, TimeField,
 * DatePicker, DateRangePicker) import it by relative path and provide or read
 * it as the port sheet §5 contract says.
 */
export interface DateInputGroupContextValue {
  /** The `dateInputGroupVariants` result for the group's variant and width. */
  slots: Accessor<ReturnType<typeof dateInputGroupVariants>>;

  /** Whether the whole group is disabled (its own prop, or its field's state). */
  isDisabled: Accessor<boolean>;

  /** Whether the group is invalid (R-007). */
  isInvalid: Accessor<boolean>;

  /** Whether the group is read only. */
  isReadOnly: Accessor<boolean>;

  /** Whether a registered child inside the group has the keyboard focus. */
  isFocusWithin: Accessor<boolean>;

  /** Whether that focus came from the keyboard, so the group ring shows (R-006). */
  isFocusVisible: Accessor<boolean>;

  /** Whether the last interaction was the keyboard (shared by the group and its Input). */
  isKeyboard: Accessor<boolean>;

  /** Records a keyboard interaction (a segment's key handler). */
  setKeyboardModality: () => void;

  /** Records a pointer interaction (a press on a segment or the input). */
  setPointerModality: () => void;

  /**
   * A pointer press is about to move the focus (a segment focusing itself, or
   * the input's padding focusing a segment). The next focus belongs to it, so
   * the focus handler must not record the keyboard modality.
   */
  requestPointerFocus: () => void;

  /** Whether a pointer press asked for the focus being reported; clears the mark. */
  consumePointerFocus: () => boolean;

  /** Whether a Prefix part was created inside the group (R-010). */
  hasPrefix: Accessor<boolean>;

  /** Whether a Suffix part was created inside the group (R-011). */
  hasSuffix: Accessor<boolean>;

  /** Whether a range separator was created inside the group (R-012). */
  hasRangeSeparator: Accessor<boolean>;

  /** Whether a picker trigger currently has the focus, which suppresses the ring (R-006). */
  triggerFocused: Accessor<boolean>;

  /** A Prefix part reports itself; the returned function unregisters it. */
  registerPrefix: () => () => void;

  /** A Suffix part reports itself; the returned function unregisters it. */
  registerSuffix: () => () => void;

  /** A range separator reports itself; the returned function unregisters it. */
  registerRangeSeparator: () => () => void;

  /**
   * A focusable child (a segment) reports whether it holds the focus; the
   * returned function unregisters it. This replaces the stylesheet's
   * `:focus-within`.
   */
  registerFocusTarget: (isFocused: Accessor<boolean>) => () => void;

  /**
   * A picker trigger reports whether it holds the focus; the returned function
   * unregisters it. The group's ring is suppressed while one is focused.
   */
  registerTriggerFocus: (isFocused: Accessor<boolean>) => () => void;
}

/** The resting slot strings a lone part uses; computed once, never mutable. */
const FALLBACK_SLOTS = dateInputGroupVariants({ variant: "primary", fullWidth: false });

/** What a part sees outside a group: resting state, no registrations, no crash. */
export const FALLBACK_DATE_INPUT_GROUP_CONTEXT: DateInputGroupContextValue = {
  slots: () => FALLBACK_SLOTS,
  isDisabled: () => false,
  isInvalid: () => false,
  isReadOnly: () => false,
  isFocusWithin: () => false,
  isFocusVisible: () => false,
  isKeyboard: () => false,
  setKeyboardModality: () => {},
  setPointerModality: () => {},
  requestPointerFocus: () => {},
  consumePointerFocus: () => false,
  hasPrefix: () => false,
  hasSuffix: () => false,
  hasRangeSeparator: () => false,
  triggerFocused: () => false,
  registerPrefix: () => () => {},
  registerSuffix: () => () => {},
  registerRangeSeparator: () => () => {},
  registerFocusTarget: () => () => {},
  registerTriggerFocus: () => () => {},
};

export const DateInputGroupContext = context<DateInputGroupContextValue>(
  FALLBACK_DATE_INPUT_GROUP_CONTEXT,
);

/**
 * The field state handle every segment of one field reads. `DateField`,
 * `TimeField`, `DatePicker` and `DateRangePicker` provide it (a range picker
 * provides one handle whose readers resolve by the `slot` a part passes);
 * `DateInputGroup.Input` reads it, and creates its own `createDateFieldState`
 * when there is none, so a group can be used on its own.
 */
export const DateInputGroupFieldContext = context<DateFieldState | undefined>(undefined);

/**
 * Whether the affixes of this group take pointer events. HeroUI switches
 * `pointer-events-none` to `auto` for the prefix / suffix of a DatePicker or
 * DateRangePicker through a descendant selector
 * (`date-input-group.css:79-87`); the picker roots provide `true` here, and the
 * default keeps a plain DateField's affixes inert (R-025, R-026).
 */
export const DateInputGroupAffixContext = context<Accessor<boolean>>(() => false);
