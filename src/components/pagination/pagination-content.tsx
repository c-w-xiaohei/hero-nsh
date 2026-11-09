import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./pagination-children";
import { PaginationContext } from "./pagination-context";
import { type PaginationDomPartProps, viewProps } from "./pagination-dom-props";
import { toAccessibilityRole } from "./pagination-roles";

/**
 * The props of `Pagination.Content`: HeroUI's `PaginationContentProps`, a `ul`
 * with the element's attributes plus `children` and `className`.
 */
export interface PaginationContentProps extends PaginationDomPartProps {
  children: JSX.Element;
}

/**
 * `Pagination.Content`: the row of items. Upstream's `<ul>` carries the list
 * role implicitly; NSH has no element semantics, so the view states
 * `role="list"` and the caller's own `role` wins.
 */
export function PaginationContent(props: PaginationContentProps): JSX.Element {
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
    [ctx?.slots().content(), props.className]
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
      // A `<ul>` is not a keyboard focus stop upstream.
      focusable={props.focusable ?? false}
      role={toAccessibilityRole(props.role, "list")}
      accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel}
      class={classes()}
      style={props.style}
    >
      {renderChildren(children())}
    </View>
  );
}
