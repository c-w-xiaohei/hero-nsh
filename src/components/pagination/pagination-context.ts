import { context } from "nsh";
import type { Accessor } from "nsh";

import type { PaginationSize, paginationVariants } from "./pagination.styles";

/**
 * What `Pagination` hands to every part under it: the six resolved slot
 * classes and the root's `size` (needed by `Previous` / `Next`, whose nav
 * geometry is not a public slot — port sheet §5).
 *
 * HeroUI keeps the same two things in a React context whose default value is
 * `{}`, so a part used outside a root still renders, just without slot classes.
 * `null` plays that role here.
 */
export interface PaginationContextValue {
  /** The slot table resolved from the root's `size`. */
  slots: Accessor<ReturnType<typeof paginationVariants>>;
  /** The root's `size` as given; `undefined` means the table's default. */
  size: Accessor<PaginationSize | undefined>;
}

export const PaginationContext = context<PaginationContextValue | null>(null);
