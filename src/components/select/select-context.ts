import type { Accessor, JSX } from "nsh";
import { context } from "nsh";

import type {
  FocusStrategy,
  ListOwnerListControls,
  ListState,
  SelectionManager,
  SelectionMode,
} from "../../primitives";
import type { selectVariants } from "./select.styles";

/** The slot functions of the variant table, resolved for this instance. */
export type SelectSlots = ReturnType<typeof selectVariants>;

/** One selected option, as `Select.Value`'s render values report it. */
export interface SelectSelectedItem {
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
 * The state `Select.Value`'s render values call `state`, a facade over this
 * port's list state (port sheet §1, §8): only the members the stories and tests
 * read are carried, because React Stately's `SelectState` has no NSH
 * counterpart for the rest.
 *
 * The fields are plain values, as upstream: `state.selectedItems` is an array
 * of `{ key, value, textValue }`, read as `state.selectedItems[0].key`,
 * `.length` or `.map` (HeroUI's `select.stories.tsx:582,586,688`). Each is a
 * tracked getter over the field's signals, so a tree that reads it where it
 * binds still follows a change; a scene that branches inside `<If>` / `<Each>`
 * reads the top-level `selectedItems` accessor of the render values instead
 * (D17).
 */
export interface SelectStateFacade {
  readonly selectedItems: readonly SelectSelectedItem[];
  readonly selectedKeys: Set<string>;
  readonly selectionMode: SelectionMode;
  readonly isOpen: boolean;
  readonly isDisabled: boolean;
  readonly isInvalid: boolean;
  readonly isRequired: boolean;
}

/**
 * What the field's trigger tells the parts inside it. Upstream this travels by
 * DOM: the trigger is a `<button>` whose `disabled` the clear button and the
 * indicator read, and `:has(.select__indicator)` pads the trigger. NSH has no
 * descendant selectors and no `:has`, so the parts register (port sheet §2).
 */
export interface SelectTriggerContextValue {
  /** The trigger's resolved disabled state (its own prop over the root's). */
  isDisabled: Accessor<boolean>;

  /** Reports that an Indicator mounted; returns its unregister. */
  registerIndicator: () => () => void;

  /** The pointer entered / left the clear button (`:has(...:hover)`'s twin). */
  setClearHovered: (isHovered: boolean) => void;
}

export const SelectTriggerContext = context<
  SelectTriggerContextValue | undefined
>(undefined);

/**
 * What `Select.Root` provides to every part. HeroUI reaches the same state
 * through React Aria's `SelectStateContext` and its own three contexts; NSH has
 * no DOM, so the parts read this one and the overlay trigger's context.
 */
export interface SelectContextValue {
  /** The variant table, resolved for this instance; read it where classes bind. */
  slots: Accessor<SelectSlots>;

  /** The `variant` dimension (`"primary"` by default). */
  variant: Accessor<"primary" | "secondary">;

  /** `onClear`: called after the clear button (or Backspace / Delete) empties the selection. */
  onClear: () => void;

  /** Whether a `Select.ClearButton` is mounted; counted, as upstream (§2). */
  hasClearButton: Accessor<boolean>;

  /** Registers a clear button; returns its unregister. */
  registerClearButton: () => () => void;

  /** Empties the selection and calls `onClear`. */
  clear: () => void;

  isOpen: Accessor<boolean>;

  /** Opens with the focus strategy (a pointer press passes `true`). */
  open: (strategy?: FocusStrategy | boolean) => void;

  close: () => void;

  toggle: (strategy?: FocusStrategy | boolean) => void;

  selectionMode: Accessor<SelectionMode>;

  disallowEmptySelection: Accessor<boolean>;

  /** The list's state, once the ListBox inside the popover registered it. */
  list: Accessor<ListState | undefined>;

  /** The list's focus entry points, once it registered. */
  listControls: Accessor<ListOwnerListControls | undefined>;

  /** The list's selection manager, once it registered. */
  selectionManager: Accessor<SelectionManager | undefined>;

  /** The selected options, in selection order. */
  selectedItems: Accessor<readonly SelectSelectedItem[]>;

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

  /** Records the trigger's focus changes (the root's render props read them). */
  setTriggerFocused: (focused: boolean) => void;

  /** Whether the last interaction was the keyboard. */
  isKeyboard: Accessor<boolean>;

  notePointer: () => void;
  noteKeyboard: () => void;
  noteFocus: () => void;

  /** Moves the keyboard focus to the trigger (a label press). */
  focusTrigger: () => void;

  /** The facade `Select.Value`'s render values carry as `state`. */
  state: SelectStateFacade;
}

export const SelectContext = context<SelectContextValue | undefined>(undefined);
