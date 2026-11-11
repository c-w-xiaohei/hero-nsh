import type { Accessor } from "nsh";
import { context } from "nsh";

/**
 * The selection state a table hands to a `<Checkbox slot="selection">`, the
 * HeroUI way of writing a table's select-all and row-selection checkboxes
 * (port sheet table §5, the cross-unit addition).
 *
 * React Aria's `Table` puts the same object on its `CheckboxContext` slots: the
 * header row's slot selects every row, a row's slot selects that row. The value
 * is an accessor so a checkbox follows the table state without being rebuilt.
 */
export interface TableSelectionCheckboxState {
  isSelected: boolean;
  isIndeterminate: boolean;
  isDisabled: boolean;

  /** The next checked state the press asks for. */
  onChange: (isSelected: boolean) => void;

  /** A fallback name when the caller gives the checkbox no `aria-label`. */
  accessibilityLabel?: string;
}

/**
 * `undefined` outside a table: a `slot="selection"` checkbox then behaves as a
 * plain checkbox, exactly as it did before this context existed.
 */
export const TableSelectionCheckboxContext = context<
  Accessor<TableSelectionCheckboxState | undefined> | undefined
>(undefined);
