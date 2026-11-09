import { context } from "nsh";
import type { Accessor, PressEvent, ViewRef } from "nsh";

import type { SwitchSize } from "./switch.styles";

/**
 * HeroUI's press callbacks, as the field root accepts them (React Aria's
 * `PressEvents`). NSH fires them from whichever part saw the press: the
 * Content, or a `Label` inside it (whose press is reported through
 * `FieldContext.focusField`).
 */
export interface SwitchPressHandlers {
  /** The press began. */
  onPressStart?: (event: PressEvent) => void;

  /** The press was released over the switch. */
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

/**
 * The live state one Switch field root hands to its parts.
 *
 * HeroUI reaches the same information two ways: React context
 * (`SwitchField` → `SwitchButton`) for behaviour, and CSS descendant selectors
 * (`.switch[data-selected="true"] &`, `.switch:has([data-slot="switch-content"]
 * [data-hovered="true"]) &`) for looks. NSH has neither `data-*` attributes nor
 * descendant selectors, so both travel through this context: the root owns the
 * fields, the Content part writes the interaction signals it observes, and the
 * Control / Thumb read them (port sheet §2 and §4).
 *
 * This context is internal: it is not exported from the public entry, exactly
 * as HeroUI's own `SwitchContext` is not.
 */
export interface SwitchContextValue {
  /** The size dimension of the variant table. */
  size: Accessor<SwitchSize>;

  /** The selection state, as `createToggleState` reports it. */
  isSelected: Accessor<boolean>;

  /** Whether interaction is blocked and the whole field is dimmed. */
  isDisabled: Accessor<boolean>;

  /** Whether the value cannot change, while the switch stays focusable. */
  isReadOnly: Accessor<boolean>;

  /** Whether the field is required; only the Label's asterisk shows it. */
  isRequired: Accessor<boolean>;

  /** Whether the field is invalid: from `isInvalid` or committed validation. */
  isInvalid: Accessor<boolean>;

  /** The pointer is over the clickable face (off while disabled or read-only). */
  isHovered: Accessor<boolean>;

  /**
   * A press is in progress on the clickable face, as the render prop reports
   * it: React Aria's label press is disabled for `isDisabled || isReadOnly`
   * (`react-aria/src/toggle/useToggle.ts:186`), so a read-only field stays
   * `false`.
   */
  isPressed: Accessor<boolean>;

  /**
   * The face is held down, the signal the track paints. Unlike `isPressed` it
   * survives `isReadOnly`, because the stylesheet's `.switch:active &`
   * (`switch.css:112-117`) paints on any pointer press, read-only or not.
   */
  isActive: Accessor<boolean>;

  /** The clickable face has the keyboard focus. */
  isFocused: Accessor<boolean>;

  /** Focus arrived from the keyboard, so the focus ring shows. */
  isFocusVisible: Accessor<boolean>;

  /** The render-prop form of React Stately's `ToggleState`, with accessors (D17). */
  state: SwitchToggleState;

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

  /** The clickable face reports its view so the Label can focus it. */
  setContentRef: (node: ViewRef | undefined) => void;

  /**
   * The Content registers the press callbacks a caller placed on it, so a
   * Label press (which never reaches the Content) reports into them too. The
   * field root's own props win when both are given.
   */
  setContentPressHandlers: (handlers: SwitchPressHandlers | undefined) => void;

  /**
   * Focuses the clickable face the way pressing a `<label for>` does: the
   * focus is a pointer interaction, so no focus ring appears (R-026).
   */
  focusContentFromPointer: () => void;

  /**
   * The root's `onPressStart` plus the pressed bookkeeping. Both press paths
   * (the clickable face and a Label inside it) report here, so the root
   * callbacks fire once per press.
   */
  pressStart: (event: PressEvent) => void;

  /** The root's `onPressUp`, reported by whichever part saw the press. */
  pressUp: (event: PressEvent) => void;

  /** The root's `onPressEnd`, and the pressed state ending. */
  pressEnd: (event: PressEvent) => void;

  /**
   * A Label inside the field reported its real press-down, so a held label
   * press sets the pressed state and paints, as the `<label>`'s own
   * `onPressStart` does upstream (`react-aria/src/toggle/useToggle.ts:134-147`).
   */
  pressFieldStart: (event: PressEvent) => void;

  /** A Label inside the field reported its real press-up. */
  pressFieldUp: (event: PressEvent) => void;

  /** The root's `onPress`, dispatched before the selection changes. */
  press: (event: PressEvent) => void;

  /** The root's `onClick`, dispatched after the selection changed. */
  click: (event: PressEvent) => void;

  /** The clickable face reports a hover transition (R-027). */
  setHovered: (value: boolean) => void;

  /** The clickable face reports a press transition (R-028, R-030, R-031). */
  setPressed: (value: boolean) => void;

  /** The clickable face reports a focus transition (R-026). */
  setFocused: (value: boolean) => void;

  /** The keyboard drove the last interaction, so a focus ring is due (R-026). */
  setKeyboardModality: () => void;

  /** The pointer drove the last interaction (R-026). */
  setPointerModality: () => void;

  /**
   * Reads and clears the one-shot marker the Label sets before it asks for
   * focus: that focus is a pointer interaction, not a Tab arrival.
   */
  consumeFocusFromPointer: () => boolean;

  /** The measured width of the track, which positions the thumb (R-037). */
  trackWidth: Accessor<number>;

  /** The Control reports its laid-out width. */
  setTrackWidth: (width: number) => void;

  /** Runs `validate` and commits its errors (the root's blur handler). */
  commitValidation: () => void;
}

/** React Stately's `ToggleState`, with accessors instead of plain values (D17). */
export interface SwitchToggleState {
  isSelected: Accessor<boolean>;

  /** Updates the selection; the root's `onChange` hears it. */
  setSelected: (isSelected: boolean) => void;

  /** Flips the selection. */
  toggle: () => void;
}

/**
 * What the field root's render props receive. HeroUI's
 * `SwitchFieldRenderProps` carries plain values; per D17 they are accessors
 * here, so the tree the function returns can follow the field without being
 * rebuilt.
 */
export interface SwitchFieldRenderProps {
  isSelected: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  state: SwitchToggleState;
}

/**
 * What the clickable face's render props receive: the field state plus the
 * interaction signals the face itself originates (HeroUI's
 * `SwitchButtonRenderProps`).
 */
export interface SwitchButtonRenderProps extends SwitchFieldRenderProps {
  isHovered: Accessor<boolean>;
  isPressed: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
}

/**
 * What a part sees when it is rendered outside a Switch root. HeroUI's parts
 * read `InternalSwitchContext` unconditionally and would throw; NSH keeps the
 * tree rendering, so a lone part shows the resting state instead. It holds no
 * mutable value, so sharing it between instances cannot leak state.
 */
export const FALLBACK_SWITCH_CONTEXT: SwitchContextValue = {
  size: () => "md",
  isSelected: () => false,
  isDisabled: () => false,
  isReadOnly: () => false,
  isRequired: () => false,
  isInvalid: () => false,
  isHovered: () => false,
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
  setPressed: () => {},
  setFocused: () => {},
  setKeyboardModality: () => {},
  setPointerModality: () => {},
  consumeFocusFromPointer: () => false,
  trackWidth: () => 0,
  setTrackWidth: () => {},
  commitValidation: () => {},
};

export const SwitchContext = context<SwitchContextValue | undefined>(undefined);
