import type { Accessor, JSX } from "nsh";
import { context } from "nsh";

import type {
  FocusStrategy,
  ListOwnerListControls,
  ListState,
  SelectionManager,
  SelectionMode,
} from "../../primitives";
import type { autocompleteVariants } from "./autocomplete.styles";

/** The slot functions of the variant table, resolved for this instance. */
export type AutocompleteSlots = ReturnType<typeof autocompleteVariants>;

/**
 * The caller's filter, with React Aria's signature
 * (`AriaAutocompleteProps.filter`): it receives the option's text value and the
 * input's text, and says whether the option stays. `useFilter` is a React Aria
 * hook that does not exist here; the stories' `contains(textValue, inputValue)`
 * is written out by the caller (port sheet §4b).
 */
export type AutocompleteFilterFn = (
  textValue: string,
  inputValue: string,
) => boolean;

/** One selected option, as `Autocomplete.Value`'s render values report it. */
export interface AutocompleteSelectedItem {
  /** The collection key. */
  key: string;

  /** The entry's object value in a dynamic collection; `undefined` when unknown. */
  value: unknown;

  /** The typeahead / accessible text. */
  textValue: string | undefined;

  /** The option's rendered content, which the default value renders again. */
  children: () => JSX.Element | undefined;
}

/**
 * The facade `Autocomplete.Value`'s render values carry as `state`, standing in
 * for React Stately's `SelectState` (port sheet §1, §8): only the members the
 * stories read, because the rest has no NSH counterpart.
 *
 * The fields are plain values, as upstream (`state.selectedItems` is an array
 * read as `state.selectedItems[0].key` or `.map`), each a tracked getter over
 * the field's signals.
 */
export interface AutocompleteStateFacade {
  readonly selectedItems: readonly AutocompleteSelectedItem[];
  readonly selectedKeys: Set<string>;
  readonly selectionMode: SelectionMode;
  readonly isOpen: boolean;
  readonly isDisabled: boolean;
  readonly isInvalid: boolean;
  readonly isRequired: boolean;
}

/**
 * What the field's trigger tells the parts inside it. Upstream this travels by
 * DOM: the trigger is a container whose `:has(.autocomplete__indicator)` pads
 * its inline end, and whose `:hover` is suppressed while the clear button is
 * hovered. NSH has no `:has`, so the parts register (port sheet §2, §4).
 */
export interface AutocompleteTriggerContextValue {
  /** The trigger's resolved disabled state (its own prop over the root's). */
  isDisabled: Accessor<boolean>;

  /** Reports that an Indicator mounted; returns its unregister. */
  registerIndicator: () => () => void;

  /** Puts the trigger's inline-end padding on while an Indicator is mounted. */
  hasIndicator: Accessor<boolean>;

  /** The pointer entered / left the clear button (`:has(...:hover)`'s twin). */
  setClearHovered: (isHovered: boolean) => void;

  /** Whether the clear button holds the pointer. */
  isClearHovered: Accessor<boolean>;
}

export const AutocompleteTriggerContext = context<
  AutocompleteTriggerContextValue | undefined
>(undefined);

/**
 * The input-side props the root accepts on the field and hands down to the
 * `Autocomplete.Filter` (port sheet §1, §4b). React Aria's `Autocomplete`
 * takes them on the primitive; HeroUI's root is a `Select`, so they arrive on
 * the field's public surface and must take effect there.
 */
export interface AutocompleteFilterSource {
  /** The controlled input text. */
  inputValue: Accessor<string | undefined>;

  /** The initial input text. */
  defaultInputValue: Accessor<string | undefined>;

  /** The input text changed (typing, the clear button, Escape). */
  onInputChange: (value: string) => void;

  /** The caller's filter function. */
  filter: Accessor<AutocompleteFilterFn | undefined>;

  /** Whether the first available option is skipped when the collection changes. */
  disableAutoFocusFirst: Accessor<boolean>;

  /** The field's dynamic collection, when the root carries it. */
  items: Accessor<Iterable<unknown> | undefined>;
}

/**
 * What the `Autocomplete.Filter` reports back to the root once it mounts. The
 * root reads the text for the list's filter, moves the focus into the input
 * when the field opens, and nothing else: the input state itself stays in the
 * Filter, where HeroUI's `Autocomplete.Filter` keeps it (port sheet §2).
 */
export interface AutocompleteFilterRegistration {
  /** The current input text (already merged controlled / uncontrolled). */
  text: Accessor<string>;

  /** The caller's filter, or `undefined` for the list's own `contains`. */
  filter: Accessor<AutocompleteFilterFn | undefined>;

  /** Whether the collection change leaves the virtual focus alone. */
  disableAutoFocusFirst: Accessor<boolean>;

  /** The collection the Filter carries, if it carries one. */
  items: Accessor<Iterable<unknown> | undefined>;

  /** Moves the keyboard focus into the search input. */
  focusInput: () => void;
}

/**
 * What `Autocomplete.Root` provides to every part. HeroUI reaches the same
 * state through React Aria's `SelectStateContext`, `AutocompleteStateContext`
 * and its own context; NSH has no DOM, so the parts read this one, the trigger
 * context and the overlay trigger's context.
 */
export interface AutocompleteContextValue {
  /** The variant table, resolved for this instance; read it where classes bind. */
  slots: Accessor<AutocompleteSlots>;

  /** The `variant` dimension (`"primary"` by default). */
  variant: Accessor<"primary" | "secondary">;

  /** `onClear`: called after the clear button empties the selection. */
  onClear: () => void;

  /** Whether an `Autocomplete.ClearButton` is mounted; counted, as upstream. */
  hasClearButton: Accessor<boolean>;

  /** Registers a clear button; returns its unregister. */
  registerClearButton: () => () => void;

  /** Empties the selection and calls `onClear`. */
  clear: () => void;

  isOpen: Accessor<boolean>;

  /** Opens with the focus strategy (a pointer press keeps the selected option). */
  open: (strategy?: FocusStrategy | boolean) => void;

  close: () => void;

  toggle: (strategy?: FocusStrategy | boolean) => void;

  selectionMode: Accessor<SelectionMode>;

  /** The list's state, once the ListBox inside the popover registered it. */
  list: Accessor<ListState | undefined>;

  /** The list's focus entry points, once it registered. */
  listControls: Accessor<ListOwnerListControls | undefined>;

  /** The list's selection manager, once it registered. */
  selectionManager: Accessor<SelectionManager | undefined>;

  /** The selected options, in selection order. */
  selectedItems: Accessor<readonly AutocompleteSelectedItem[]>;

  /** The single selection's text, or the multiple one joined by `Intl.ListFormat`. */
  selectedText: Accessor<string | undefined>;

  isSelectionEmpty: Accessor<boolean>;

  /** The text shown when nothing is selected (default `"Select an item"`). */
  placeholder: Accessor<string>;

  isDisabled: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  isInvalid: Accessor<boolean>;

  /** The visible label's text, from `FieldContext` (the trigger's name). */
  labelText: Accessor<string | undefined>;

  /** The root's `aria-label`: it names the trigger (port sheet §1). */
  ariaLabel: Accessor<string | undefined>;

  /** The description's text, from `DescriptionContext` (the trigger's hint). */
  descriptionText: Accessor<string | undefined>;

  /** The error message's text, from `FieldErrorContext` (also a hint). */
  errorText: Accessor<string | undefined>;

  /** The trigger holds the keyboard focus. */
  triggerFocused: Accessor<boolean>;

  /**
   * Records the trigger's focus changes. The trigger is the field's Tab stop
   * while the popover is closed and the search input while it is open, so the
   * root's `isFocused` / `onFocus` / `onBlur` join both halves; reporting the
   * input's focus here instead would mark the whole field blurred whenever the
   * input is left while the trigger still holds it.
   */
  setTriggerFocused: (focused: boolean) => void;

  /** The search input holds the keyboard focus. */
  inputFocused: Accessor<boolean>;

  /** Records the search input's focus changes (the root's render props read them). */
  setInputFocused: (focused: boolean) => void;

  /** Whether the last interaction was the keyboard. */
  isKeyboard: Accessor<boolean>;

  notePointer: () => void;
  noteKeyboard: () => void;
  noteFocus: () => void;

  /** Moves the keyboard focus to the trigger (a label press). */
  focusTrigger: () => void;

  /** The `inputValue` surface the root accepted on the field. */
  filterSource: AutocompleteFilterSource;

  /** Registers the `Filter`; returns its unregister. */
  registerFilter: (registration: AutocompleteFilterRegistration) => () => void;

  /** The facade `Autocomplete.Value`'s render values carry as `state`. */
  state: AutocompleteStateFacade;
}

export const AutocompleteContext = context<
  AutocompleteContextValue | undefined
>(undefined);
