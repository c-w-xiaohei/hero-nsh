import type { JSX } from "nsh";
import { computed, split, Text, View } from "nsh";

import { PaginationContext } from "./pagination-context";
import { type PaginationDomPartProps, viewProps } from "./pagination-dom-props";
import { toOptionalAccessibilityRole } from "./pagination-roles";

/**
 * The props of `Pagination.Ellipsis`: HeroUI's `PaginationEllipsisProps`, a
 * `span` with the element's attributes and `className`. The type has no
 * `children`: the content is fixed.
 */
export interface PaginationEllipsisProps extends Omit<PaginationDomPartProps, "children"> {
  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Maps to `accessibilityElementsHidden`, `true` when absent. */
  "aria-hidden"?: boolean;
}

/**
 * `Pagination.Ellipsis`: the `…` between page ranges.
 *
 * Its content is always the ellipsis, hidden from assistive technologies as
 * upstream's `aria-hidden="true"` span is, and it takes no children at all (not
 * even upstream's type).
 */
export function PaginationEllipsis(props: PaginationEllipsisProps): JSX.Element {
  const ctx = PaginationContext();
  const [, rest] = split(props, [
    "className",
    "style",
    "role",
    "ref",
    "focusable",
    "id",
    "nativeID",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "render",
  ] as const);

  // R-016: `.pagination__ellipsis`.
  const classes = computed(() =>
    [ctx?.slots().ellipsis(), props.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => props.ref?.(node)}
      nativeID={props.id ?? props.nativeID}
      focusable={props.focusable ?? false}
      role={toOptionalAccessibilityRole(props.role)}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      // `aria-hidden="true"` upstream, overridable through the spread.
      accessibilityElementsHidden={
        (props["aria-hidden"] as boolean | undefined) ??
        props.accessibilityElementsHidden ??
        true
      }
      class={classes()}
      style={props.style}
    >
      {/* Upstream's `&hellip;`; a View shows no bare string. */}
      <Text>…</Text>
    </View>
  );
}
