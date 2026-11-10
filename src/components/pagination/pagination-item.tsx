import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./pagination-children";
import { PaginationContext } from "./pagination-context";
import { type PaginationDomPartProps, viewProps } from "./pagination-dom-props";
import { toOptionalAccessibilityRole } from "./pagination-roles";

/**
 * The props of `Pagination.Item`: HeroUI's `PaginationItemProps`, an `li` with
 * the element's attributes plus `children` and `className`.
 */
export interface PaginationItemProps extends PaginationDomPartProps {
  children: JSX.Element;
}

/**
 * `Pagination.Item`: the wrapper around one page button.
 *
 * Upstream's `<li>` carries the implicit `listitem` role. NSH's
 * `AccessibilityRole` has no such role, so this view reports none unless the
 * caller names one: the item is a visual box only (port sheet §5, §8).
 */
export function PaginationItem(props: PaginationItemProps): JSX.Element {
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

  // R-004: `.pagination__item` → `inline-flex`.
  const classes = computed(() =>
    [ctx?.slots().item(), props.className]
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
      // An `<li>` is not a keyboard focus stop upstream.
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
