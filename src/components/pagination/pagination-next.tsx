import type { JSX } from "nsh";

import { PaginationButtonRoot } from "./pagination-button";
import type { PaginationNextProps } from "./pagination-button-props";

/**
 * `Pagination.Next`: the "next page" button, the mirror of
 * `Pagination.Previous` with the same slot and nav geometry (R-017 / R-021 /
 * R-027) and no `isActive`.
 */
export function PaginationNext(props: PaginationNextProps): JSX.Element {
  return <PaginationButtonRoot {...props} nav />;
}
