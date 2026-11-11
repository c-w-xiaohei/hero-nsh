import type { Accessor, ViewRef } from "nsh";
import { context } from "nsh";

import type {
  FocusStrategy,
  ListOwnerListControls,
  ListState,
  SelectionManager,
  SelectionMode,
} from "../../primitives";
import type { comboBoxVariants } from "./combo-box.styles";

/** The slot functions of the variant table, resolved for this instance. */
export type ComboBoxSlots = ReturnType<typeof comboBoxVariants>;

/**
 * What makes the field open, as React Aria's `menuTrigger` (`"focus"` by
 * default in HeroUI, `"input"` upstream).
 */
export type ComboBoxMenuTrigger = "focus" | "input" | "manual";

/** One selected option, as `ComboBox.Value`'s render values report it. */
export interface ComboBoxSelectedItem {
  /** The collection key. */
  key: string;

  /** The entry's object in the root's `items`; built from the row when unknown. */
  value: unknown;

  /** The typeahead / accessible text. */
  textValue: string | undefined;
}

/**
 * The state `ComboBox.Value`'s render values call `state`, a facade over this
 * port's list state (port sheet §1, §8): React Stately's `ComboBoxState` has no
 * NSH counterpart for the methods, so only the members the HeroUI stories and
 * tests read are carried. Each is a tracked getter, so a tree that reads one
 * where it binds follows the field.
 */
export interface ComboBoxStateFacade {
  readonly selectedItems: readonly ComboBoxSelectedItem[];
  readonly selectedKeys: Set<string>;
  readonly selectionMode: SelectionMode;
  readonly isOpen: boolean;
  readonly isDisabled: boolean;
  readonly isInvalid: boolean;
  readonly isRequired: boolean;
  readonly isReadOnly: boolean;
  readonly inputValue: string;
}

/**
 * What `ComboBox.Root` provides to every part. HeroUI reaches the same state
 * through React Aria's `ComboBoxStateContext` and its own `ComboBoxContext`
 * (`{ slots, variant }`); NSH has no DOM, so the parts read this one, the
 * overlay trigger's context and the three field contexts.
 */
export interface ComboBoxContextValue {
  /** The variant table, resolved for this instance; read it where classes bind. */
  slots: Accessor<ComboBoxSlots>;

  /** The `variant` dimension (`"primary"` by default); it makes no class. */
  variant: Accessor<"primary" | "secondary">;

  isOpen: Accessor<boolean>;

  /** Opens with the focus strategy (a pointer press passes `true`). */
  open: (strategy?: FocusStrategy | boolean) => void;

  /** The internal "close the menu" half: it only flips `isOpen` to false. */
  close: () => void;

  /** The commit-style close: text committed, then the menu closes (§2). */
  commitClose: () => void;

  toggle: () => void;

  menuTrigger: Accessor<ComboBoxMenuTrigger>;

  selectionMode: Accessor<SelectionMode>;

  /** The current selection, normalized to string keys. */
  selectedKeys: Accessor<Set<string>>;

  /** The selected options, in selection order. */
  selectedItems: Accessor<readonly ComboBoxSelectedItem[]>;

  /** The single selection's text, or the multiple one joined by `Intl.ListFormat`. */
  selectedText: Accessor<string | undefined>;

  isSelectionEmpty: Accessor<boolean>;

  /** The input's text: both the display value and the filter (§2). */
  inputValue: Accessor<string>;

  setInputValue: (value: string) => void;

  /** The filter the list applies, or `undefined` when it does not filter. */
  filterText: Accessor<string | undefined>;

  /** The caller's `defaultFilter`; the language-aware `contains` when absent. */
  defaultFilter: Accessor<
    ((textValue: string, inputValue: string) => boolean) | undefined
  >;

  /** The root's dynamic collection (`items ?? defaultItems`). */
  items: Accessor<Iterable<unknown> | undefined>;

  allowsCustomValue: Accessor<boolean>;
  allowsEmptyCollection: Accessor<boolean>;

  isDisabled: Accessor<boolean>;
  isRequired: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isReadOnly: Accessor<boolean>;

  /** The input holds the keyboard focus (React Aria's `state.isFocused`). */
  isFocused: Accessor<boolean>;

  setInputFocused: (focused: boolean) => void;

  /** Whether the last interaction was the keyboard. */
  isKeyboard: Accessor<boolean>;

  notePointer: () => void;
  noteKeyboard: () => void;

  /** The classes the field adds to its input (`min-w-0 flex-1 pe-7`, R-004/5). */
  inputPartClass: Accessor<string | undefined>;

  /** Return on the input commits the highlighted option (R-0? §2 side effects). */
  handleInputKeyPress: (event: { key: string }) => void;

  /** Registers a `ComboBox.Trigger`; returns its unregister (R-005). */
  registerTrigger: () => () => void;

  /** Whether a trigger is mounted; the input then reserves its room. */
  hasTrigger: Accessor<boolean>;

  /** Registers the popover's anchor: the input group (R-037). */
  registerAnchor: (node: ViewRef) => () => void;

  anchorRef: Accessor<ViewRef | undefined>;

  /** The list's state, once the `ListBox` inside the popover registered it. */
  list: Accessor<ListState | undefined>;

  /** The list's focus entry points, once it registered. */
  listControls: Accessor<ListOwnerListControls | undefined>;

  /** The list's selection manager, once it registered. */
  selectionManager: Accessor<SelectionManager | undefined>;

  /** The highlighted option's key, or `undefined`. */
  focusedKey: Accessor<string | undefined>;

  /** Commits the highlighted option (Enter / Tab), then closes a single one. */
  commitFocused: () => void;

  /** Commits the text: the selected item's text, or the custom value (§2). */
  commitValue: () => void;

  /** Escape: resets the text and keeps the selection, then closes (§2). */
  revert: () => void;

  /** The visible label's text, from `FieldContext` (the input's name). */
  labelText: Accessor<string | undefined>;

  /** The root's `aria-label`; it names the input and the list. */
  ariaLabel: Accessor<string | undefined>;

  /** The description's text, from `DescriptionContext` (the input's hint). */
  descriptionText: Accessor<string | undefined>;

  /** The error message's text, from `FieldErrorContext` (also a hint). */
  errorText: Accessor<string | undefined>;

  /** Moves the keyboard focus to the input. */
  focusInput: () => void;

  /** The facade `ComboBox.Value`'s render values carry as `state`. */
  state: ComboBoxStateFacade;
}

export const ComboBoxContext = context<ComboBoxContextValue | undefined>(
  undefined,
);
