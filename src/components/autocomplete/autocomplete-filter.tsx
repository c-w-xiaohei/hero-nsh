import type { JSX } from "nsh";
import { cleanup, effect, keymap, signal, split } from "nsh";

import { createControllableSignal } from "../../primitives";
import { renderChildren } from "../list-box/children";
import { SearchFieldOwnerContext } from "../search-field/search-field-context";
import type { SearchFieldOwnerContextValue } from "../search-field/search-field-context";
import {
  AutocompleteContext,
  type AutocompleteFilterFn,
  type AutocompleteFilterRegistration,
  type AutocompleteFilterSource,
} from "./autocomplete-context";

export interface AutocompleteFilterProps {
  /**
   * The filter's content: the caller's `SearchField` and the `ListBox` it
   * filters. Read once, at the placement (research 4.1).
   */
  children?: JSX.Element;

  /** The controlled search text (React Aria's `Autocomplete` `inputValue`). */
  inputValue?: string;

  /** The initial search text. */
  defaultInputValue?: string;

  /** The search text changed (typing, the clear button, Escape). */
  onInputChange?: (value: string) => void;

  /**
   * Whether an option survives the current text. React Aria's signature
   * `(textValue, inputValue) => boolean`; without one the list falls back to
   * its own case-insensitive `contains`.
   */
  filter?: AutocompleteFilterFn;

  /**
   * Keeps the virtual focus where it is while the filtered collection
   * changes; by default the first available option takes it (React Aria's
   * `disableAutoFocusFirst`).
   */
  disableAutoFocusFirst?: boolean;

  /** The collection the rows come from, when the Filter carries it. */
  items?: Iterable<unknown>;

  /** Accepted, no effect: the React Aria `Autocomplete` renders no element. */
  className?: string;
  slot?: string;
  render?: unknown;
}

/**
 * Autocomplete.Filter / AutocompleteFilter: the search input's owner. HeroUI's
 * part is React Aria's `Autocomplete` primitive, a context provider with no
 * element of its own: it holds `inputValue`, filters the collection below it
 * and routes the input's keys to the list.
 *
 * NSH has no DOM and no provider that reaches an unrelated component, so the
 * wiring is explicit (port sheet §2, §5): the Filter owns the input state,
 * hands it to the caller's `SearchField` through the SearchField owner channel,
 * publishes the text to the root as the list's filter, and routes the keys the
 * input holds to the list's keyboard delegate. This part renders no view of its
 * own — upstream's `autocomplete__filter` class has no declarations, because
 * nothing carries it.
 */
export function AutocompleteFilter(
  props: AutocompleteFilterProps,
): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "inputValue",
    "defaultInputValue",
    "onInputChange",
    "filter",
    "disableAutoFocusFirst",
    "items",
    "className",
    "slot",
    "render",
  ] as const);

  const autocomplete = AutocompleteContext();

  if (!autocomplete) {
    return null;
  }

  const source: AutocompleteFilterSource = autocomplete.filterSource;

  /* -------------------------------------------------------------------------------------------
   * The input's text: the Filter's own props first, the root's surface second
   * (both are React Aria's `Autocomplete` props; the closer one wins).
   * ----------------------------------------------------------------------------------------- */
  const [value, setValue] = createControllableSignal<string>({
    value: () => local.inputValue ?? source.inputValue(),
    defaultValue: () => local.defaultInputValue ?? source.defaultInputValue() ?? "",
    onChange: (next) => {
      local.onInputChange?.(next);
      source.onInputChange(next);
    },
  });

  const text = () => value() ?? "";

  const filter = () => local.filter ?? source.filter();
  const disableAutoFocusFirst = () =>
    local.disableAutoFocusFirst ?? source.disableAutoFocusFirst();
  const items = () =>
    local.items ?? (source.items() as Iterable<unknown> | undefined);

  /* -------------------------------------------------------------------------------------------
   * Focus: the SearchField reports its input's focus through the owner
   * channel, so the field's focus state and the list's key scopes follow it.
   * ----------------------------------------------------------------------------------------- */
  const focused = signal(false);
  let inputFocus: (() => void) | undefined;

  const focusInput = () => inputFocus?.();

  /* -------------------------------------------------------------------------------------------
   * The registration the root reads (port sheet §2, §5): the filter text, the
   * caller's filter, the auto-focus switch, the collection and the input's
   * focus entry.
   * ----------------------------------------------------------------------------------------- */
  const registration: AutocompleteFilterRegistration = {
    text,
    filter,
    disableAutoFocusFirst,
    items,
    focusInput,
  };

  cleanup(autocomplete.registerFilter(registration));

  /* -------------------------------------------------------------------------------------------
   * Key routing while the input holds the focus (virtual focus)
   *
   * The arrows move the input's caret, so Keymap's default rules would leave
   * them to the input and the list would never see one. An Autocomplete
   * consumes them on purpose (React Aria's `useAutocomplete` handles ArrowDown
   * / ArrowUp on its input), so these scopes ask for `when: "always"`. Each one
   * lives only while the input has the focus and the field is editable
   * (`_common` "NSH component rules"): no list key is bound globally.
   * ----------------------------------------------------------------------------------------- */
  const isDisabled = autocomplete.isDisabled;
  const isOpen = autocomplete.isOpen;

  const runListKey = (key: string) => {
    if (!isOpen()) {
      return;
    }

    autocomplete.listControls()?.handleKeyDown?.({ key });
  };

  effect(() => {
    if (!focused() || isDisabled()) {
      return;
    }

    return keymap.bind(
      {
        down: () => {
          if (isOpen()) {
            runListKey("down");
          } else {
            autocomplete.open("first");
          }
        },
        up: () => {
          if (isOpen()) {
            runListKey("up");
          } else {
            autocomplete.open("last");
          }
        },
      },
      { when: "always", repeat: true },
    );
  });

  effect(() => {
    if (!focused() || !isOpen() || isDisabled()) {
      return;
    }

    return keymap.bind(
      {
        home: () => runListKey("home"),
        end: () => runListKey("end"),
        pageup: () => runListKey("pageup"),
        pagedown: () => runListKey("pagedown"),
      },
      { when: "always", repeat: true },
    );
  });

  /* -------------------------------------------------------------------------------------------
   * Virtual focus: opening the field moves the focus into the input, and a
   * filtered collection puts the highlight on its first option (React Aria's
   * `disableAutoFocusFirst` rule, port sheet §1).
   *
   * The placement outlives the commit that opened the field: the popover's
   * subtree may be mounted by that same commit (a field that never opened
   * mounts it now, so a hidden `SearchField` cannot take the Tab stop first),
   * and the list registers only once it is mounted. `pending` keeps the
   * strategy's option waiting for the collection instead of consuming it while
   * the rows do not exist yet; the effect reruns when the list registers.
   * ----------------------------------------------------------------------------------------- */
  let previousText: string | undefined = text();
  let wasOpen = isOpen();
  let pending = isOpen();

  effect(() => {
    const open = isOpen();
    const current = text();
    const opened = open && !wasOpen;
    const textChanged = current !== previousText;

    previousText = current;
    wasOpen = open;

    if (!open) {
      pending = false;

      return;
    }

    if (opened) {
      pending = true;
    }

    if (disableAutoFocusFirst()) {
      pending = false;

      return;
    }

    const controls = autocomplete.listControls();
    const collection = autocomplete.list()?.collection();

    if (!controls || !collection) {
      return;
    }

    // A text change re-places the highlight on the first surviving option; an
    // open keeps the strategy's option (`open("last")` must not jump to the
    // first one), and only fills an empty highlight.
    const needsPlacement =
      textChanged || (pending && controls.focusedKey() == null);

    pending = false;

    if (!needsPlacement || controls.focusedKey() != null) {
      return;
    }

    const key =
      autocomplete.openFocusStrategy() === "last"
        ? collection.getLastKey()
        : collection.getFirstKey();

    if (key != null) {
      controls.focusKey(key);
    }
  });

  /* -------------------------------------------------------------------------------------------
   * A close clears the text: the next open shows the whole collection, and the
   * field never reopens with a filter the user cannot see (Kobalte's combobox
   * closes with its text reset, port sheet T-030).
   * ----------------------------------------------------------------------------------------- */
  let textWasOpen = isOpen();

  effect(() => {
    const open = isOpen();

    if (open) {
      textWasOpen = true;

      return;
    }

    if (!textWasOpen) {
      return;
    }

    textWasOpen = false;

    if (text() !== "") {
      setValue("");
    }
  });

  /* -------------------------------------------------------------------------------------------
   * Return picks the highlighted option; Escape closes the field and resets
   * the text. Both arrive on the input, which is the only focused part.
   * ----------------------------------------------------------------------------------------- */
  const commit = () => {
    if (!isOpen()) {
      return;
    }

    const key = autocomplete.listControls()?.focusedKey();
    const manager = autocomplete.selectionManager();

    if (key == null || !manager) {
      return;
    }

    // The list's own selection handler reports the change and closes a single
    // selection, exactly as a press on the row would (port sheet §2).
    manager.select(key);
  };

  const dismiss = () => {
    autocomplete.close();
  };

  /* -------------------------------------------------------------------------------------------
   * The SearchField channel: the caller's field shows this text, reports its
   * focus and Return / Escape, and gains the popover's own class (R-033).
   * ----------------------------------------------------------------------------------------- */
  const owner: SearchFieldOwnerContextValue = {
    value: text,
    setValue: (next) => setValue(next),
    onFocus: () => {
      focused.set(true);
      autocomplete.noteFocus();
      autocomplete.setInputFocused(true);
    },
    onBlur: () => {
      focused.set(false);
      autocomplete.setInputFocused(false);
    },
    onSubmit: () => commit(),
    onEscape: () => dismiss(),
    registerFocus: (focus) => {
      inputFocus = focus;

      return () => {
        if (inputFocus === focus) {
          inputFocus = undefined;
        }
      };
    },
    partClass: () => autocomplete.slots().searchField(),
  };

  // One read of `props.children`, at the placement inside the channel the
  // SearchField reads (research 4.1).
  const content = (): JSX.Element => renderChildren(local.children as JSX.Element);

  return (
    <SearchFieldOwnerContext.Provider value={owner}>
      {content()}
    </SearchFieldOwnerContext.Provider>
  );
}
