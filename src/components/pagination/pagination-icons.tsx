import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { IconChevronLeft, IconChevronRight } from "../icons";
import { renderChildren } from "./pagination-children";
import { type PaginationDomPartProps, viewProps } from "./pagination-dom-props";
import { toOptionalAccessibilityRole } from "./pagination-roles";

/**
 * The props of `Pagination.PreviousIcon` / `Pagination.NextIcon`: HeroUI's
 * `PaginationPreviousIconProps` / `PaginationNextIconProps`, a `span` with the
 * element's attributes, `className` and optional `children`.
 */
export interface PaginationPreviousIconProps extends PaginationDomPartProps {}

export interface PaginationNextIconProps extends PaginationDomPartProps {}

/** The two chevron containers differ only in their default glyph and name. */
interface PaginationIconProps extends PaginationDomPartProps {
  children?: JSX.Element;
}

function renderPaginationIcon(
  props: PaginationIconProps,
  defaultIcon: () => JSX.Element,
): JSX.Element {
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
    "accessibilityElementsHidden",
    "render",
  ] as const);

  // R-018: the `[data-slot="pagination-previous-icon"]` / `…-next-icon`
  // descendant rule → `rtl:rotate-180` on the icon container itself. A
  // custom child is not forced to a size; the caller brings its own, as the
  // default chevron brings `h-4 w-4`.
  const classes = computed(() =>
    ["rtl:rotate-180", props.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // The single read of `props.children`, at the placement (research 4.1 / 4.6).
  const children = computed(() => props.children);

  // HeroUI's `children ?? <IconChevronLeft />`: only the two empty values take
  // the default glyph. A zero-argument function is NSH's reactive child (D17),
  // never "no children".
  const renderContent = () => {
    const content = children();

    return content === undefined || content === null ? defaultIcon() : renderChildren(content);
  };

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
      {renderContent()}
    </View>
  );
}

/** `Pagination.PreviousIcon`: the left chevron of `Pagination.Previous`. */
export function PaginationPreviousIcon(props: PaginationPreviousIconProps): JSX.Element {
  return renderPaginationIcon(props, () => <IconChevronLeft />);
}

/** `Pagination.NextIcon`: the right chevron of `Pagination.Next`. */
export function PaginationNextIcon(props: PaginationNextIconProps): JSX.Element {
  return renderPaginationIcon(props, () => <IconChevronRight />);
}
