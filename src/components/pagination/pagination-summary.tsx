import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./pagination-children";
import { PaginationContext } from "./pagination-context";
import { type PaginationDomPartProps, viewProps } from "./pagination-dom-props";
import { toOptionalAccessibilityRole } from "./pagination-roles";

/**
 * The props of `Pagination.Summary`: HeroUI's `PaginationSummaryProps`, a
 * `div` with the element's attributes plus `children` and `className`.
 *
 * `dir` defaults to `"auto"` upstream so mixed number/word content is not
 * bidi-reordered by an RTL ancestor. NSH has no element-level bidi direction;
 * the prop is accepted and has no effect (port sheet §5).
 */
export interface PaginationSummaryProps extends PaginationDomPartProps {
  children: JSX.Element;
}

/**
 * `Pagination.Summary`: the "1 to 5 of 10 invoices" text beside the page
 * buttons. A plain view around its content; the summary text inherits `text-sm`
 * and `text-muted` from R-002, which is why strings are wrapped in `Text`.
 */
export function PaginationSummary(props: PaginationSummaryProps): JSX.Element {
  const ctx = PaginationContext();
  const [, rest] = split(props, [
    "children",
    "className",
    "style",
    "role",
    "ref",
    "focusable",
    "id",
    "nativeID",
    "accessibilityLabel",
    "render",
  ] as const);

  const classes = computed(() =>
    [ctx?.slots().summary(), props.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // The single read of `props.children`, at the placement (research 4.1 / 4.6).
  const children = computed(() => props.children);

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => props.ref?.(node)}
      nativeID={props.id ?? props.nativeID}
      // A `<div>` is not a focus stop upstream.
      focusable={props.focusable ?? false}
      role={toOptionalAccessibilityRole(props.role)}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      class={classes()}
      style={props.style}
    >
      {renderChildren(children())}
    </View>
  );
}
