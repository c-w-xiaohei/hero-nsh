import { context } from "nsh";
import type { PasteEvent } from "nsh";

/**
 * SearchField's two contexts. HeroUI has one `SearchFieldContext` carrying the
 * variant table (`{ slots?: ReturnType<typeof searchFieldVariants> }`) and
 * reaches everything else through React Aria's providers (`InputContext`,
 * `GroupContext`, `ButtonContext`, `TextContext`, `FieldErrorContext`). NSH has
 * no DOM ids, no `aria-labelledby` / `aria-describedby` and no `:has()`, so the
 * field wiring and the part registrations travel through these two contexts
 * instead (port sheet §2, §5).
 *
 * Both are internal: they are imported by this component's parts through these
 * paths and are not exported from the package entry, exactly as HeroUI keeps
 * its own `SearchFieldContext` private.
 */

/** The live slot class strings of one `SearchField` root, re-resolved per read. */
export interface SearchFieldSlots {
  /** The root's `flex flex-col gap-1` (R-001, R-033). */
  base: () => string;

  /** The group's fill, border, shadow and transition (R-005 … R-010, R-026 … R-028, R-034). */
  group: () => string;

  /** The input's padding, text size and flex behavior (R-015). */
  input: () => string;

  /** The leading icon's margin, size and color (R-021, R-022). */
  searchIcon: () => string;

  /** The trailing clear button's margin and size (R-023). */
  clearButton: () => string;
}

/** Upstream's `variant` dimension (`SearchFieldVariants["variant"]`), resolved. */
export type SearchFieldResolvedVariant = "primary" | "secondary";

/**
 * What a `SearchField.Input` inherits from its field root: React Aria's
 * `useTextField` `inputProps` (React Aria `useSearchField.ts`) expressed as
 * accessors and as the handlers NSH's `<Input>` takes (port sheet §2, the
 * "输入属性包" row).
 */
export interface SearchFieldInputBindings {
  /** The field's text; the input shows it unless the caller's own `value` wins. */
  value: () => string;

  /** Writes the field's text (the `onChange` of the host input). */
  setValue: (value: string) => void;

  /** The field is disabled: the host input is `disabled` and non-editable. */
  isDisabled: () => boolean;

  /** The field is read-only: the host input keeps focus and selection but no edits. */
  isReadOnly: () => boolean;

  /** The field is required (no NSH constraint; the Label shows the asterisk). */
  isRequired: () => boolean;

  /** The field is invalid (prop, or committed validation errors). */
  isInvalid: () => boolean;

  /** `aria-label`, else the registered Label text. */
  accessibilityLabel: () => string | undefined;

  /** The registered Description, then the registered error message. */
  accessibilityHint: () => string | undefined;

  /** The HTML input type, mapped to the keyboard layout by the input. */
  type: () => string | undefined;

  /** Wins over the mapping from `type`. */
  inputMode: () => SearchFieldInputMode | undefined;

  /** Mapped to `returnKeyType`. */
  enterKeyHint: () => SearchFieldEnterKeyHint | undefined;

  /** Mapped to the host's `autoComplete` when NSH knows the value. */
  autoComplete: () => string | undefined;

  /** The HTML string `"on"` / `"off"`, mapped to the host boolean. */
  autoCorrect: () => string | undefined;

  /** Mapped to the host's `autoCapitalize` when NSH knows the value. */
  autoCapitalize: () => string | undefined;

  /** The host's `maxLength`. */
  maxLength: () => number | undefined;

  /** Focuses the input when it mounts. */
  autoFocus: () => boolean | undefined;

  /** Return was pressed in the input: commits validation, then `onSubmit(value)`. */
  submit: () => void;

  /** The input took focus: the root's `onFocus` and `onFocusChange`. */
  focus: () => void;

  /** The input lost focus: commits validation, then the root's `onBlur` / `onFocusChange`. */
  blur: () => void;

  /**
   * The input is going away while focused: drops the field's focus state
   * without firing `onBlur` / `onFocusChange`, as upstream's `:focus-within`
   * does when the focused descendant is removed.
   */
  releaseFocus: () => void;

  /** The user pasted; NSH reports the content, not a DOM `ClipboardEvent`. */
  onPaste?: (event: PasteEvent) => void;

  /** An input method's composition; NSH reports all three phases on one event. */
  onCompositionChange?: (event: { composing: boolean; text: string }) => void;

  /** The caret / selection moved. */
  onSelectionChange?: (event: { start: number; end: number }) => void;
}

/** React Aria's `inputMode` values, as `useSearchField` accepts them. */
export type SearchFieldInputMode =
  | "none"
  | "text"
  | "tel"
  | "url"
  | "email"
  | "numeric"
  | "decimal"
  | "search";

/** React Aria's `enterKeyHint` values, as `useSearchField` accepts them. */
export type SearchFieldEnterKeyHint =
  | "enter"
  | "done"
  | "go"
  | "next"
  | "previous"
  | "search"
  | "send";

/**
 * Root → all parts. HeroUI's root hands the same wiring to `Group`, `Input`,
 * `SearchIcon` and `ClearButton` through React Aria's providers; here it is one
 * object read once in each part's body.
 */
export interface SearchFieldContextValue {
  /** The root's variant table; each part calls its own slot. */
  slots: SearchFieldSlots;

  /** The resolved `variant`, for the group's state classes (R-029 … R-031). */
  variant: () => SearchFieldResolvedVariant;

  /** The field's text. */
  value: () => string;

  /** Writes the field's text. */
  setValue: (value: string) => void;

  /**
   * Empties the field and calls `onClear`, as the clear button does. The escape
   * key only reaches it while the field is non-empty (port sheet §2).
   */
  clear: () => void;

  /** The field is empty; hides the clear button (R-004). */
  isEmpty: () => boolean;

  /** The field's effective disabled state. */
  isDisabled: () => boolean;

  /** The field's effective read-only state. */
  isReadOnly: () => boolean;

  /** The field's effective required state. */
  isRequired: () => boolean;

  /** The field's effective invalid state (prop or committed validation). */
  isInvalid: () => boolean;

  /** Something in the field has keyboard focus (`:focus-within`). */
  focused: () => boolean;

  /**
   * Registers the input's `focus()`, which stands in for `<label for>` and for
   * the clear button's `onPressStart`. Returns the unregister function, called
   * on cleanup.
   */
  registerInputFocus: (focus: () => void) => () => void;

  /** Focuses the registered input; a no-op before it mounts. */
  focusInput: () => void;

  /** The input-side half of the field wiring. */
  input: SearchFieldInputBindings;
}

/**
 * Group → `SearchIcon` / `ClearButton` / `Input`. Stands in for upstream's
 * `.search-field__group:has([data-slot="search-field-search-icon"])` and
 * `:has([slot="clear"])`: the parts register on creation and unregister on
 * cleanup, and the input reads the two counts (R-017, R-018).
 */
export interface SearchFieldGroupContextValue {
  /** The group's effective disabled state (`isDisabled` prop, else the field). */
  isDisabled: () => boolean;

  /** The group's effective invalid state (`isInvalid` prop, else the field). */
  isInvalid: () => boolean;

  /** Something inside the group has keyboard focus (`:focus-within`). */
  isFocusWithin: () => boolean;

  /** Writes the focus-within state; called by the input. */
  setFocusWithin: (value: boolean) => void;

  /** A `SearchIcon` is mounted inside the group (R-017). */
  hasSearchIcon: () => boolean;

  /** A `ClearButton` is mounted inside the group (R-018). */
  hasClearButton: () => boolean;

  /** Registers a `SearchIcon`; returns the unregister function for `cleanup`. */
  registerSearchIcon: () => () => void;

  /** Registers a `ClearButton`; returns the unregister function for `cleanup`. */
  registerClearButton: () => () => void;
}

/** Root → parts; `undefined` outside a `SearchField`. */
export const SearchFieldContext = context<SearchFieldContextValue | undefined>(undefined);

/** Group → its children; `undefined` outside a `SearchField.Group`. */
export const SearchFieldGroupContext = context<SearchFieldGroupContextValue | undefined>(
  undefined,
);
