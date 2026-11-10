import { context } from "nsh";
import type { Accessor, PasteEvent } from "nsh";

/** HeroUI's `variant` dimension, as both `Input` and `TextArea` accept it. */
export type TextFieldVariant = "primary" | "secondary";

/** React Aria's `inputMode` values, as `useTextField` accepts them. */
export type TextFieldInputMode =
  | "none"
  | "text"
  | "tel"
  | "url"
  | "email"
  | "numeric"
  | "decimal"
  | "search";

/** React Aria's `enterKeyHint` values, as `useTextField` accepts them. */
export type TextFieldEnterKeyHint =
  | "enter"
  | "done"
  | "go"
  | "next"
  | "previous"
  | "search"
  | "send";

/**
 * What a TextField root tells its `Input` and `TextArea` inside it.
 *
 * HeroUI has two paths: a tiny `TextFieldContext` (`{ variant }`), and React
 * Aria's `inputProps` that `useTextField` puts into `InputContext` /
 * `TextAreaContext` — value, setters, disabled / read-only / invalid state,
 * the HTML attributes and the event handlers. NSH has no DOM ids, no
 * `aria-labelledby` / `aria-describedby` and no `<label for>`, so the field
 * wiring, the registered texts and the focus handle all travel through this one
 * context instead (port sheet §1.1, §2, §5).
 *
 * The value shape is the NSH replacement contract: every reactive member is an
 * accessor, exactly as D17 asks of render props. It is exported under
 * HeroUI's name and from HeroUI's place in the entry.
 */
export interface TextFieldContextValue {
  /** The resolved `variant` the field hands to its inputs. */
  variant: Accessor<TextFieldVariant>;

  /**
   * The resolved `fullWidth`: the field's own `true`. Inputs OR their own
   * `fullWidth` with it, so an explicit `false` on the input cannot turn the
   * field's stretch off (port sheet R-004 / §5).
   */
  fullWidth: Accessor<boolean>;

  /** The field's text; the inputs show it unless their own `value` wins. */
  value: Accessor<string>;

  /** Writes the field's text (the `onChange` of the host input). */
  setValue: (value: string) => void;

  /** The field is disabled: the host input is `disabled` and non-editable. */
  isDisabled: Accessor<boolean>;

  /** The field is read-only: edits are refused, selection and focus stay. */
  isReadOnly: Accessor<boolean>;

  /** The field is required (no NSH constraint; the Label shows the asterisk). */
  isRequired: Accessor<boolean>;

  /** The field is invalid (the prop, or committed validation errors). */
  isInvalid: Accessor<boolean>;

  /** `aria-label`, else the registered Label text. */
  accessibilityLabel: Accessor<string | undefined>;

  /** The registered Description, then the registered error message. */
  accessibilityHint: Accessor<string | undefined>;

  /** The field's HTML input type, mapped to a keyboard layout by the input. */
  type: Accessor<string | undefined>;

  /** Wins over the mapping from `type`. */
  inputMode: Accessor<TextFieldInputMode | undefined>;

  /** Mapped to `returnKeyType`. */
  enterKeyHint: Accessor<TextFieldEnterKeyHint | undefined>;

  /** The field's autofill hint. */
  autoComplete: Accessor<string | undefined>;

  /** The field's HTML `"on"` / `"off"` corrections switch. */
  autoCorrect: Accessor<string | undefined>;

  /** The field's character limit. */
  maxLength: Accessor<number | undefined>;

  /** The field focuses its input when it mounts. */
  autoFocus: Accessor<boolean | undefined>;

  /**
   * The field's `onFocusChange`; an input calls it on its focus and blur. Both
   * inputs in one field share it, as `FocusableProps` gives one callback to the
   * whole field (port sheet §2).
   */
  handleFocus: () => void;

  /** The field's blur: commits validation, then reports `onBlur` / `onFocusChange`. */
  handleBlur: () => void;

  /**
   * Registers the input's `focus()`, standing in for `<label for>`. Returns the
   * unregister function, called on cleanup.
   */
  registerInputFocus: (focus: () => void) => () => void;

  /** Focuses the registered input; a no-op before it mounts. */
  focusInput: () => void;

  /** The user pasted; NSH reports the content, not a DOM `ClipboardEvent`. */
  onPaste?: (event: PasteEvent) => void;

  /** An input method's composition; NSH reports all three phases on one event. */
  onCompositionChange?: (event: { composing: boolean; text: string }) => void;

  /** The caret / selection moved. */
  onSelectionChange?: (event: { start: number; end: number }) => void;
}

/** Root → its inputs; `undefined` outside a `TextField`. */
export const TextFieldContext = context<TextFieldContextValue | undefined>(undefined);
