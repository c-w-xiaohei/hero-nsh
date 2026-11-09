import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./pagination-children";
import { PaginationContext, type PaginationContextValue } from "./pagination-context";
import { PaginationDomPartProps, viewProps } from "./pagination-dom-props";
import { toAccessibilityRole } from "./pagination-roles";
import { type PaginationSize, paginationVariants } from "./pagination.styles";

/**
 * The props of `Pagination` / `Pagination.Root`: HeroUI 3.2.7's
 * `PaginationRootProps`, a `nav` with the element's own attributes, plus
 * `children`, `className` and the one `size` dimension.
 *
 * The DOM-only members are accepted so code written against HeroUI keeps
 * compiling; port sheet §1.2 and §5 list what they do here.
 */
export interface PaginationRootProps extends PaginationDomPartProps {
  children: JSX.Element;

  /** Pagination size. @default "md" */
  size?: PaginationSize;
}

/**
 * `Pagination` / `PaginationRoot`: the navigation landmark every part sits in.
 *
 * It owns the only shared state: the six slot classes resolved from `size`, and
 * `size` itself, which `Previous` / `Next` need for their nav geometry. Both go
 * down through `PaginationContext`; the parts still work outside a root, just
 * without slot classes, exactly as upstream's `slots?.link()` does.
 *
 * Upstream's `useMemo` has no equivalent needed here: `computed` keeps the
 * table live while `size` changes.
 */
export function PaginationRoot(props: PaginationRootProps): JSX.Element {
  const [, rest] = split(props, [
    "children",
    "className",
    "style",
    "size",
    "role",
    "ref",
    "focusable",
    "id",
    "nativeID",
    "accessibilityLabel",
    "render",
  ] as const);

  // R-001: the `base` slot. R-031: the default lives in the table's
  // `defaultVariants`, so the raw prop goes in.
  const slots = computed(() => paginationVariants({ size: props.size }));

  const contextValue: PaginationContextValue = {
    slots,
    size: () => props.size,
  };

  // HeroUI merges the slot class with the caller's through tailwind-merge;
  // NSH classes resolve left to right, so joining them gives the same winner
  // (D13).
  const classes = computed(() =>
    [slots().base(), props.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  return (
    <PaginationContext.Provider value={contextValue}>
      <View
        {...viewProps(rest)}
        ref={(node) => props.ref?.(node)}
        nativeID={props.id ?? props.nativeID}
        // A `<nav>` is not a keyboard focus stop upstream; leave it out of the
        // Tab order even when the caller hangs a press handler on it.
        focusable={props.focusable ?? false}
        role={toAccessibilityRole(props.role, "navigation")}
        accessibilityLabel={props["aria-label"] ?? props.accessibilityLabel ?? "pagination"}
        class={classes()}
        style={props.style}
      >
        {/*
          The single read of `props.children`, inside the provider and at the
          placement (research 4.1 / 4.6 and the provider exception in the common
          rules): the parts below resolve `PaginationContext`, so a computed
          created in the body would evaluate outside it.
        */}
        {renderChildren(props.children)}
      </View>
    </PaginationContext.Provider>
  );
}
