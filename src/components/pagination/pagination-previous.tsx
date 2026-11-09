import type { JSX } from "nsh";

import { PaginationButtonRoot } from "./pagination-button";
import type { PaginationPreviousProps } from "./pagination-button-props";

/**
 * `Pagination.Previous`: the "previous page" button.
 *
 * The `link` slot plus the hand-written nav geometry of R-017 / R-021 / R-027
 * (upstream appends the `pagination__link--nav` class after the slot). It has
 * no `isActive`: it is never the current page.
 */
export function PaginationPrevious(props: PaginationPreviousProps): JSX.Element {
  return <PaginationButtonRoot {...props} nav />;
}
