import type { Accessor } from "nsh";
import { context } from "nsh";

import { inputGroupVariants } from "./input-group.styles";

/**
 * What an `InputGroup` root tells its parts. HeroUI reaches the same information
 * through a tiny slot context, CSS descendant selectors on the group's `data-*`
 * attributes and `:has()`; NSH has neither (D18), so the slot strings, the
 * states and the three existence registrations travel through this context
 * instead (port sheet §2.2).
 *
 * This module is internal: the component entry does not export it, so the
 * context adds no public API.
 */
export interface InputGroupContextValue {
  /** The `inputGroupVariants` result for the group's variant and width. */
  slots: Accessor<ReturnType<typeof inputGroupVariants>>;

  /** Whether the group is disabled (its own prop, its field's, or `aria-disabled`). */
  isDisabled: Accessor<boolean>;

  /** Whether the group is invalid (its own prop, its field's, or `aria-invalid`). */
  isInvalid: Accessor<boolean>;

  /** Whether the group is read only. Has no separate look, as upstream. */
  isReadOnly: Accessor<boolean>;

  /** Whether the input or the textarea inside the group has the focus. */
  isFocusWithin: Accessor<boolean>;

  /** Whether that focus came from the keyboard, so the render props say focus-visible. */
  isFocusVisible: Accessor<boolean>;

  /** Whether the last interaction the group saw was the keyboard. */
  isKeyboard: Accessor<boolean>;

  /** Records a keyboard interaction (a key press in the control). */
  setKeyboardModality: () => void;

  /** Records a pointer interaction (a press on the group or its control). */
  setPointerModality: () => void;

  /**
   * A pointer press is about to move the focus into the control. The next focus
   * belongs to it, so the focus handler must not record the keyboard modality.
   */
  requestPointerFocus: () => void;

  /** Whether a pointer press asked for the focus being reported; clears the mark. */
  consumePointerFocus: () => boolean;

  /** Whether a Prefix part was created inside the group (R-016). */
  hasPrefix: Accessor<boolean>;

  /** Whether a Suffix part was created inside the group (R-017). */
  hasSuffix: Accessor<boolean>;

  /** Whether a TextArea part was created inside the group (R-008, R-024, R-029). */
  hasTextArea: Accessor<boolean>;

  /** A Prefix part reports itself; the returned function unregisters it. */
  registerPrefix: () => () => void;

  /** A Suffix part reports itself; the returned function unregisters it. */
  registerSuffix: () => () => void;

  /** A TextArea part reports itself; the returned function unregisters it. */
  registerTextArea: () => () => void;

  /**
   * A focusable control reports whether it holds the focus; the returned
   * function unregisters it. This replaces the stylesheet's `:focus-within`.
   */
  registerFocusTarget: (isFocused: Accessor<boolean>) => () => void;

  /**
   * The single-line Input reports its `focus()`, standing in for upstream's
   * `querySelector("input")`. The returned function unregisters it.
   */
  registerInputFocus: (focus: () => void) => () => void;

  /** Focuses the registered input; a no-op before it mounts or while disabled. */
  focusInput: () => void;
}

/** The resting slot strings a lone part uses; computed once, never mutable. */
const FALLBACK_SLOTS = inputGroupVariants({ variant: "primary", fullWidth: false });

/** What a part sees outside a group: resting state, no registrations, no crash. */
export const FALLBACK_INPUT_GROUP_CONTEXT: InputGroupContextValue = {
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
  hasTextArea: () => false,
  registerPrefix: () => () => {},
  registerSuffix: () => () => {},
  registerTextArea: () => () => {},
  registerFocusTarget: () => () => {},
  registerInputFocus: () => () => {},
  focusInput: () => {},
};

export const InputGroupContext = context<InputGroupContextValue>(FALLBACK_INPUT_GROUP_CONTEXT);
