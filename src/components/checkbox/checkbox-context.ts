import type { Accessor } from "nsh";
import { context } from "nsh";
import type { PressEvent, ViewRef } from "nsh";

import type { CheckboxVariant } from "./checkbox.styles";
import type { CheckboxGroupState } from "./create-checkbox-group-state";

/* -------------------------------------------------------------------------------------------------
 * Press callbacks
 * -----------------------------------------------------------------------------------------------*/

/**
 * HeroUI's press callbacks, as the field root accepts them (React Aria's
 * `PressEvents`). NSH fires them from whichever part saw the press: the
 * Content, or a `Label` inside it (whose press is reported through
 * `FieldContext.focusField`).
 */
export interface CheckboxPressHandlers {
  /** The press began. */
  onPressStart?: (event: PressEvent) => void;

  /** The press was released over the checkbox. */
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
 * React Stately's `ToggleState`, with accessors instead of plain values (D17).
 * HeroUI does not expose the checkbox's state object in its render props, so
 * this one stays internal: the parts read the individual accessors instead.
 */
export interface CheckboxToggleState {
  isSelected: Accessor<boolean>;

  /** Updates the selection; in a group this writes the group's value. */
  setSelected: (isSelected: boolean) => void;

  /** Flips the selection; in a group this toggles the item's value. */
  toggle: () => void;
}

/**
 * What the field root's render props receive (HeroUI's
 * `CheckboxFieldRenderProps`, `react-aria-components/src/Checkbox.tsx:221-261`).
 * Per D17 every value is an accessor, so the tree the function returns follows
 * the field without being rebuilt. Note there is no hover / pressed / focus
 * here upstream: those belong to the button (the Content).
 */
export interface CheckboxFieldRenderProps {
  isSelected: Accessor<boolean>;
  isIndeterminate: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isRequired: Accessor<boolean>;
}

/**
 * What the clickable face's render props receive (HeroUI's
 * `CheckboxButtonRenderProps`): the field state plus the interaction signals
 * the face itself originates.
 */
export interface CheckboxButtonRenderProps extends CheckboxFieldRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
}

/**
 * What `CheckboxGroup.Root`'s render props receive (HeroUI's
 * `CheckboxGroupRenderProps`, `react-aria-components/src/Checkbox.tsx:130-159`).
 * `state` is the React Stately state object with accessors (D17).
 */
export interface CheckboxGroupRenderProps {
  isDisabled: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  state: CheckboxGroupState;
}

/* -------------------------------------------------------------------------------------------------
 * Checkbox context
 * -----------------------------------------------------------------------------------------------*/

/**
 * The live state one Checkbox field root hands to its parts.
 *
 * HeroUI reaches the same information two ways: React context
 * (`CheckboxField` → `CheckboxButton`) for behaviour, and CSS descendant
 * selectors (`.checkbox[data-selected="true"] .checkbox__control`, `.checkbox
 * [data-slot="checkbox-content"][data-hovered="true"] &`) for looks. NSH has
 * neither `data-*` attributes nor descendant selectors, so both travel through
 * this context: the root owns the field state, the Content part writes the
 * interaction signals it observes, and the Control / Indicator read them (port
 * sheet §2 and §4).
 *
 * This context is internal, exactly as HeroUI's own `CheckboxContext` is.
 */
export interface CheckboxContextValue {
  /** The variant dimension, inherited from a group when the item has none. */
  variant: Accessor<CheckboxVariant>;

  /** Whether the checkbox is checked. */
  isSelected: Accessor<boolean>;

  /** Whether the checkbox paints the indeterminate state (presentation only). */
  isIndeterminate: Accessor<boolean>;

  /** Whether interaction is blocked and the whole field is dimmed. */
  isDisabled: Accessor<boolean>;

  /** Whether the value cannot change, while the checkbox stays focusable. */
  isReadOnly: Accessor<boolean>;

  /** Whether the field is required; only a Label's asterisk shows it. */
  isRequired: Accessor<boolean>;

  /** Whether the field is invalid: from `isInvalid`, validation, or the group. */
  isInvalid: Accessor<boolean>;

  /** The pointer is over the clickable face (off while disabled or read-only). */
  isHovered: Accessor<boolean>;

  /** The pointer is anywhere over the field root, the stylesheet's `.checkbox:hover`. */
  rootHovered: Accessor<boolean>;

  /**
   * A press is in progress on the clickable face, as the render prop reports
   * it: React Aria's label press is disabled for `isDisabled || isReadOnly`, so
   * a read-only field stays `false`.
   */
  isPressed: Accessor<boolean>;

  /**
   * The face is held down, the signal the Control paints. Unlike `isPressed` it
   * survives `isReadOnly`, because the stylesheet's `.checkbox:active &` and
   * `:has(content[data-pressed])` paint on any pointer press (R-028).
   */
  isActive: Accessor<boolean>;

  /** The clickable face has the keyboard focus. */
  isFocused: Accessor<boolean>;

  /** Focus arrived from the keyboard, so the focus ring shows (R-023). */
  isFocusVisible: Accessor<boolean>;

  /** The checkbox's own toggle state (internal; not in HeroUI's render props). */
  state: CheckboxToggleState;

  /** `excludeFromTabOrder` inverted; the clickable face's `focusable`. */
  focusable: Accessor<boolean>;

  /** `aria-label` of the field root, which names the clickable face first. */
  ariaLabel: Accessor<string | undefined>;

  /** The text every Label inside the field registered, joined with spaces. */
  labelText: Accessor<string | undefined>;

  /** The text every Description inside the field registered. */
  descriptionText: Accessor<string | undefined>;

  /** The text every visible FieldError inside the field registered. */
  errorText: Accessor<string | undefined>;

  /** The classes a group adds to each item root (R-042, `mt-4`). */
  itemClass: Accessor<string | undefined>;

  /** The clickable face reports its view so a Label can focus it. */
  setContentRef: (node: ViewRef | undefined) => void;

  /**
   * The Content registers the press callbacks a caller placed on it, so a Label
   * press (which never reaches the Content) reports into them too. The field
   * root's own props win when both are given.
   */
  setContentPressHandlers: (handlers: CheckboxPressHandlers | undefined) => void;

  /**
   * Focuses the clickable face the way pressing its `<label>` does: the focus
   * is a pointer interaction, so no focus ring appears.
   */
  focusContentFromPointer: () => void;

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

  /** The field root reports a hover transition (R-024). */
  setRootHovered: (value: boolean) => void;

  /** The clickable face reports a press transition. */
  setPressed: (value: boolean) => void;

  /** A Content gained the focus: the root's focus events, and the group's. */
  focusIn: (token: object) => void;

  /** A Content lost the focus: the root's focus events and the group's. */
  focusOut: (token: object) => void;

  /** The keyboard drove the last interaction, so a focus ring is due (R-023). */
  setKeyboardModality: () => void;

  /** The pointer drove the last interaction (R-023). */
  setPointerModality: () => void;

  /**
   * Reads and clears the one-shot marker the Label sets before it asks for
   * focus: that focus is a pointer interaction, not a Tab arrival.
   */
  consumeFocusFromPointer: () => boolean;

  /** Runs `validate` and commits its errors (the first change, then every change). */
  commitValidation: () => void;
}

/**
 * What a part sees when it is rendered outside a Checkbox root. HeroUI's parts
 * read `InternalCheckboxContext` unconditionally and would throw; NSH keeps the
 * tree rendering, so a lone part shows the resting state instead. It holds no
 * mutable value, so sharing it between instances cannot leak state.
 */
export const FALLBACK_CHECKBOX_CONTEXT: CheckboxContextValue = {
  variant: () => "primary",
  isSelected: () => false,
  isIndeterminate: () => false,
  isDisabled: () => false,
  isReadOnly: () => false,
  isRequired: () => false,
  isInvalid: () => false,
  isHovered: () => false,
  rootHovered: () => false,
  isPressed: () => false,
  isActive: () => false,
  isFocused: () => false,
  isFocusVisible: () => false,
  state: {
    isSelected: () => false,
    setSelected: () => {},
    toggle: () => {},
  },
  focusable: () => true,
  ariaLabel: () => undefined,
  labelText: () => undefined,
  descriptionText: () => undefined,
  errorText: () => undefined,
  itemClass: () => undefined,
  setContentRef: () => {},
  setContentPressHandlers: () => {},
  focusContentFromPointer: () => {},
  pressStart: () => {},
  pressUp: () => {},
  pressEnd: () => {},
  pressFieldStart: () => {},
  pressFieldUp: () => {},
  press: () => {},
  click: () => {},
  setHovered: () => {},
  setRootHovered: () => {},
  setPressed: () => {},
  focusIn: () => {},
  focusOut: () => {},
  setKeyboardModality: () => {},
  setPointerModality: () => {},
  consumeFocusFromPointer: () => false,
  commitValidation: () => {},
};

export const CheckboxContext = context<CheckboxContextValue | undefined>(undefined);

/* -------------------------------------------------------------------------------------------------
 * Checkbox group context
 * -----------------------------------------------------------------------------------------------*/

/**
 * What `CheckboxGroup.Root` hands to every `Checkbox` inside it. HeroUI uses it
 * for one thing only — the `variant` default (`checkbox.tsx:41-47`) — while the
 * rest of the group behaviour arrives through React Aria's
 * `CheckboxGroupStateContext` (`useCheckboxGroupItem`). NSH has one context for
 * both, because the value, the disabled / read-only / invalid state and the
 * per-item class all travel the same way (port sheet §2).
 */
export interface CheckboxGroupContextValue {
  /** The group's `variant`, which an item without its own inherits. */
  variant: Accessor<CheckboxVariant | undefined>;

  /** The group's selection and validation (the only source of its items' state). */
  state: CheckboxGroupState;

  /** Whether every item is disabled. */
  isDisabled: Accessor<boolean>;

  /** Whether every item is read-only. */
  isReadOnly: Accessor<boolean>;

  /** Whether the group is required; it never reaches the items (see §2). */
  isRequired: Accessor<boolean>;

  /** Whether the group is invalid; the items take their `isInvalid` from here. */
  isInvalid: Accessor<boolean>;

  /** The classes the group adds to each item root (R-042). */
  itemClass: Accessor<string | undefined>;

  /** An item's clickable face gained (`true`) or lost (`false`) the focus. */
  setItemFocused: (token: object, focused: boolean) => void;
}

export const CheckboxGroupContext = context<CheckboxGroupContextValue | undefined>(
  undefined,
);
