import type { App } from "nsh/test";

/*
 * The Table tester for the ported cases (port sheet 4b), replacing React
 * Aria's `TableTester`. It only names selectors and steps; every assertion
 * stays in the test.
 *
 * `getRows` leaves out the header row: upstream's DOM has the header in a
 * separate `<thead>`, while NSH's header row is the first `role="row"` inside
 * the header `rowgroup`.
 */

export interface TableTester {
  /** The body rows, without the header row. */
  getRows(): number;
  /** The header's `role="columnheader"` cells. */
  getColumns(): number;
  /** The header and body `role="rowgroup"` views. */
  getRowGroups(): number;
  /** Presses the named row's selection checkbox. */
  toggleRowSelection(options: { row: string }): Promise<void>;
  /** Presses the named column header (it toggles its own sort direction). */
  toggleSort(options: { column: string }): Promise<void>;
}

export function createTableTester(app: App): TableTester {
  return {
    getRows: () => app.count("role:row") - 1,
    getColumns: () => app.count("role:columnheader"),
    getRowGroups: () => app.count("role:rowgroup"),

    async toggleRowSelection({ row }) {
      const checkbox = `role:checkbox[Select ${row}]`;

      if (app.count(checkbox) > 0) {
        await app.press(checkbox);
        return;
      }

      // Upstream's tester falls back to the row itself when no selection
      // checkbox is rendered: it navigates to the row, then presses Space.
      await app.press(`role:row[${row}]`);
      await app.keyboard.press("space");
    },

    toggleSort({ column }) {
      return app.press(`role:columnheader[${column}]`);
    },
  };
}
