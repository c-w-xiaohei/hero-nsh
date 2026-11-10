import type { Accessor, PressEvent, ViewRef } from "nsh";
import { context } from "nsh";

// The two dimensions belong to the group; only their types come down here, and
// `import type` is erased, so the group's runtime import of this module is not
// part of a cycle.
import type { RadioGroupOrientation, RadioGroupVariant } from "../radio-group/radio-group.styles";
import type { RadioGroupState } from "./create-radio-group-state";

/* -------------------------------------------------------------------------------------------------
 * Press callbacks
 * -----------------------------------------------------------------------------------------------*/

/**
 * HeroUI's press callbacks, as `Radio.Root` accepts them (React Aria's
 * `PressEvents`). NSH fires them from whichever part saw the press: the
 * Content, or a `Label` inside it (whose press is reported through
 * `FieldContext.focusField`).
 */
export interface RadioPressHandlers {
  /** The press began. */
  onPressStart?: (event: PressEvent) => void;

  /** The press was released over the radio. */
  onPressUp?: (event: PressEvent) => void;

  /** The press ended, whether or not it became a press. */
  onPressEnd?: (event: PressEvent) => void;

  /** Every press-start / press-end transition. */
  onPressChange?: (isPressed: boolean) => void;

  /** A completed press, before the selection changes. */
  onPress?: (event: PressEvent) => void;

  /** A completed activation, after the selection changed. */
  onClick?: (event: PressEvent) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What `Radio.Root`'s render props receive (HeroUI's `RadioFieldRenderProps`,
 * `radio.tsx:8`). Per D17 every value is an accessor, so the tree the function
 * returns follows the field without being rebuilt. Hover / pressed / focus
 * belong to the clickable face (the Content).
 */
export interface RadioFieldRenderProps {
  isSelected: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isRequired: Accessor<boolean>;
}

/**
 * What the clickable face's render props receive (HeroUI's
 * `RadioButtonRenderProps`): the field state plus the interaction signals the
 * face itself originates.
 */
export interface RadioButtonRenderProps extends RadioFieldRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
}

/**
 * What `RadioGroup.Root`'s render props receive (HeroUI's
 * `RadioGroupRenderProps`, `react-aria-components/src/RadioGroup.tsx:296-306`).
 * `state` is React Stately's `RadioGroupState` with accessors (D17).
 */
export interface RadioGroupRenderProps {
  orientation: Accessor<RadioGroupOrientation>;
  isDisabled: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  state: RadioGroupState;
}

/* -------------------------------------------------------------------------------------------------
 * Radio group context
 * -----------------------------------------------------------------------------------------------*/

/**
 * One item as the group sees it: the identity its selection and roving tab stop
 * are computed from, and the only way the group moves the focus into it.
 */
export interface RadioGroupItem {
  value: Accessor<string>;
  isDisabled: Accessor<boolean>;
  /** Focuses the item's clickable face; `fromPointer` suppresses the ring. */
  focus: (fromPointer?: boolean) => void;
}

/**
 * What `RadioGroup.Root` hands to every `Radio` inside it (port sheet §2).
 *
 * NSH has no descendant selectors and no native radio inputs grouped by
 * `name`, so the group is both the value owner and the collection: it keeps the
 * items in mount order for the arrow keys and the single tab stop, which the
 * browser gives a same-name input group for free upstream.
 */
export interface RadioGroupContextValue {
  /** The variant dimension, inherited by every item. */
  variant: Accessor<RadioGroupVariant>;

  /** The layout orientation; the item's `mt-4` and the arrow keys read it. */
  orientation: Accessor<RadioGroupOrientation>;

  /** The group's value and the flags RAC exposes on it. */
  state: RadioGroupState;

  isDisabled: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  isInvalid: Accessor<boolean>;

  /** The committed validation errors, which an item's FieldError shows. */
  validationErrors: Accessor<readonly string[]>;

  /** The classes the group adds to each item root (R-026, `mt-4`). */
  itemClass: Accessor<string | undefined>;

  /** An item joins the collection; the returned function removes it. */
  registerItem: (item: RadioGroupItem) => () => void;

  /** Whether `value` is the item that carries the group's single tab stop. */
  isTabStop: (value: string) => boolean;

  /** An item's clickable face gained (`true`) or lost (`false`) the focus. */
  setItemFocused: (token: object, value: string, focused: boolean) => void;

  /** Selects `value` and commits the group's validation (every select does). */
  select: (value: string) => void;

  /** Moves the focus to `value` (the arrow keys), after the value is written. */
  requestFocus: (value: string) => void;
}

export const RadioGroupContext = context<RadioGroupContextValue | undefined>(undefined);

/* -------------------------------------------------------------------------------------------------
 * Radio item context
 * -----------------------------------------------------------------------------------------------*/

/**
 * The live state one `Radio.Root` hands to its parts.
 *
 * HeroUI reaches the same information two ways: React context
 * (`RadioField` → `RadioButton`) for behaviour, and CSS descendant selectors
 * (`.radio__control` rules under a `data-selected` field) for looks. NSH has
 * neither `data-*` attributes nor descendant selectors, so both travel through
 * this context: the root owns the field state, the Content reports the
 * interaction signals it observes, and the Control / Indicator read them
 * (port sheet §2 and §4).
 */
export interface RadioItemContextValue {
  /** The variant dimension, inherited from the group. */
  variant: Accessor<RadioGroupVariant>;

  /** The item's value inside the group. */
  value: Accessor<string>;

  isSelected: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  isInvalid: Accessor<boolean>;

  /** The pointer is over the clickable face (off while disabled or read-only). */
  isHovered: Accessor<boolean>;

  /** A press is in progress; read-only still presses, disabled does not. */
  isPressed: Accessor<boolean>;

  /** The clickable face has the focus. */
  isFocused: Accessor<boolean>;

  /** Focus arrived from the keyboard, so the focus ring shows (R-013). */
  isFocusVisible: Accessor<boolean>;

  /** The clickable face's `focusable`; only the group's tab stop sets it. */
  focusable: Accessor<boolean>;

  /** `aria-label` of the field root, which names the clickable face first. */
  ariaLabel: Accessor<string | undefined>;

  /** The text every Label inside the field registered. */
  labelText: Accessor<string | undefined>;

  /** The text every Description inside the field registered. */
  descriptionText: Accessor<string | undefined>;

  /** The text every visible FieldError inside the field registered. */
  errorText: Accessor<string | undefined>;

  /** Selects this item; a read-only or disabled item does nothing. */
  select: () => void;

  /** The clickable face reports its view so a Label can focus it. */
  setContentRef: (node: ViewRef | undefined) => void;

  /** Focuses the clickable face as pressing a `<label>` does (no ring). */
  focusContentFromPointer: () => void;

  /**
   * The Content registers the press callbacks a caller placed on it, so a Label
   * press (which never reaches the Content) reports into them too. The field
   * root's own props win when both are given.
   */
  setContentPressHandlers: (handlers: RadioPressHandlers | undefined) => void;

  /** The root's `onPressStart` plus the pressed bookkeeping. */
  pressStart: (event: PressEvent) => void;

  /** The root's `onPressUp`, reported by whichever part saw the press. */
  pressUp: (event: PressEvent) => void;

  /** The root's `onPressEnd`, and the pressed state ending. */
  pressEnd: (event: PressEvent) => void;

  /** A Label inside the field reported its real press-down. */
  pressFieldStart: (event: PressEvent) => void;

  /** A Label inside the field reported its real press-up. */
  pressFieldUp: (event: PressEvent) => void;

  /** The root's `onPress`, dispatched before the selection changes. */
  press: (event: PressEvent) => void;

  /** The root's `onClick`, dispatched after the selection changed. */
  click: (event: PressEvent) => void;

  /** The clickable face reports a hover transition. */
  setHovered: (value: boolean) => void;

  /** The clickable face reports a press transition. */
  setPressed: (value: boolean) => void;

  /** A Content gained the focus: the root's focus events and the group's. */
  focusIn: (token: object) => void;

  /** A Content lost the focus: the root's focus events and the group's. */
  focusOut: (token: object) => void;

  /** The keyboard drove the last interaction, so a focus ring is due (R-013). */
  setKeyboardModality: () => void;

  /** The pointer drove the last interaction (R-013). */
  setPointerModality: () => void;

  /**
   * Reads and clears the one-shot marker the Label sets before it asks for
   * focus: that focus is a pointer interaction, not a Tab arrival.
   */
  consumeFocusFromPointer: () => boolean;
}

/**
 * What a part sees when it is rendered outside a Radio root. HeroUI's parts
 * read its internal context unconditionally and would throw; NSH keeps the tree
 * rendering, so a lone part shows the resting state instead. It holds no
 * mutable value, so sharing it between instances cannot leak state.
 */
export const FALLBACK_RADIO_ITEM_CONTEXT: RadioItemContextValue = {
  variant: () => "primary",
  value: () => "",
  isSelected: () => false,
  isDisabled: () => false,
  isReadOnly: () => false,
  isRequired: () => false,
  isInvalid: () => false,
  isHovered: () => false,
  isPressed: () => false,
  isFocused: () => false,
  isFocusVisible: () => false,
  focusable: () => false,
  ariaLabel: () => undefined,
  labelText: () => undefined,
  descriptionText: () => undefined,
  errorText: () => undefined,
  select: () => {},
  setContentRef: () => {},
  focusContentFromPointer: () => {},
  setContentPressHandlers: () => {},
  pressStart: () => {},
  pressUp: () => {},
  pressEnd: () => {},
  pressFieldStart: () => {},
  pressFieldUp: () => {},
  press: () => {},
  click: () => {},
  setHovered: () => {},
  setPressed: () => {},
  focusIn: () => {},
  focusOut: () => {},
  setKeyboardModality: () => {},
  setPointerModality: () => {},
  consumeFocusFromPointer: () => false,
};

export const RadioItemContext = context<RadioItemContextValue | undefined>(undefined);
