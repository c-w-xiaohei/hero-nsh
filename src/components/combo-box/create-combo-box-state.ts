import { type Accessor, effect, signal } from "nsh";

/**
 * ComboBox's filtered collection, kept beside the component as React Aria's
 * `displayedCollection` memo chain (`useComboBoxState.ts:298-306`, `:369`;
 * `combobox-base.tsx:456-527`, `:528-537`; port sheet §2). Upstream it decides
 * which collection the `ListBox` receives; here it hands the list a filter
 * string through the owner contract and the list cuts its own collection down
 * (port sheet §5, first change).
 *
 * The three rules, in order:
 *
 * - A root that was given `items` (a controlled collection) does not get the
 *   default filter: the caller's collection is the source of truth, and the
 *   default filter would silently cut it.
 * - While the field is open, the current text filters the options — unless a
 *   manual open (the trigger, an arrow key) asked to show every option, which
 *   the first typed character ends.
 * - While it is closed the last text stays applied, so the rows do not spring
 *   back during the 100ms exit. Upstream keeps `lastCollection` the same way.
 */
export interface CreateComboBoxFilterStateProps {
  /** The field's open state. */
  isOpen: Accessor<boolean>;

  /** The input's text: the display value and the filter at once. */
  inputValue: Accessor<string>;

  /**
   * The caller-controlled collection (`props.items` only): when present the
   * default filter is off. `defaultItems` is an uncontrolled collection and
   * stays filtered, exactly as upstream (`useComboBoxState.ts:298-306` skips
   * the filter only when `props.items != null`).
   */
  items: Accessor<Iterable<unknown> | undefined>;
}

export interface CreateComboBoxFilterStateResult {
  /** The filter the list applies, or `undefined` when it applies none. */
  filterText: Accessor<string | undefined>;

  /** Shows every option until the next typed character (a manual open). */
  showAllOptions: () => void;

  /** A typed character ended the "show every option" window. */
  noteInput: () => void;

  /** Keeps the closed field's filter equal to the text that is on screen. */
  noteText: (text: string) => void;
}

export function createComboBoxFilterState(
  props: CreateComboBoxFilterStateProps,
): CreateComboBoxFilterStateResult {
  const lastFilter = signal<string | undefined>(undefined);
  const showAll = signal(false);

  // A close freezes the text that was on screen; an open clears the snapshot,
  // because the open state reads the live text instead.
  effect(() => {
    if (props.isOpen()) {
      lastFilter.set(undefined);

      return;
    }

    lastFilter.set(props.inputValue());
  });

  const filterText = (): string | undefined => {
    if (props.items() !== undefined) {
      return undefined;
    }

    if (!props.isOpen()) {
      return lastFilter();
    }

    return showAll() ? undefined : props.inputValue();
  };

  return {
    filterText,
    showAllOptions: () => showAll.set(true),
    noteInput: () => showAll.set(false),
    // The text is written in the same turn as the filter is read (the typed
    // character decides whether the open list still has rows), so the closed
    // snapshot is updated here instead of waiting for the effect above.
    noteText: (text) => {
      if (!props.isOpen()) {
        lastFilter.set(text);
      }
    },
  };
}
