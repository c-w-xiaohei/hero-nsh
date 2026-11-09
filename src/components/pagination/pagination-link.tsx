import type { JSX } from "nsh";

import { PaginationButtonRoot } from "./pagination-button";
import type { PaginationLinkProps } from "./pagination-button-props";

/**
 * `Pagination.Link`: one page number, or any content the caller puts in it.
 *
 * HeroUI renders it on React Aria's `Button`, with `aria-current="page"` and
 * `data-active="true"` while `isActive`, which is the current page's tertiary
 * background. `data-active` has no NSH counterpart (D18), so `isActive` drives
 * `accessibilityState.current` and the `bg-default` class instead (R-015); the
 * press, hover and focus behaviour is the shared `PaginationButtonRoot`.
 */
export function PaginationLink(props: PaginationLinkProps): JSX.Element {
  return <PaginationButtonRoot {...props} />;
}
