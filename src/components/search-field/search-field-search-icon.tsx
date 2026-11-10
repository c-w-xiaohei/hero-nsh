import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, split, View } from "nsh";

import { IconSearch } from "../icons";
import { joinClassNames } from "./class-names";
import {
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
  hostProps,
} from "./search-field-dom-props";
import { renderChildren } from "./render-children";
import { SearchFieldContext, SearchFieldGroupContext } from "./search-field-context";

/**
 * The props of `SearchField.SearchIcon`: HeroUI 3.2.7's
 * `SearchFieldSearchIconProps`, which is `DOMRenderProps<'svg', undefined>` — an
 * `<svg>` with its attributes, `children` and `className` — plus an optional
 * custom icon.
 *
 * Upstream clones a custom child element and writes the slot classes onto it.
 * NSH has no `cloneElement`, so the classes go on a `View` around the child and
 * the child keeps its own size classes (port sheet §1.5, §8). The members that
 * describe an SVG document (`fill`, `stroke`, `viewBox`, `xmlns`, the `on*`
 * handlers) are accepted with no effect: `icons` draws with canvas paths.
 */
export interface SearchFieldSearchIconProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * A custom icon. An element (or a zero-argument reactive child) is wrapped in
   * the slot classes; with no children, numbers or strings the component draws
   * the built-in `IconSearch`, as upstream does.
   */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Style of the wrapper view. */
  style?: StyleProp<ViewStyle>;

  /** The icon's width, in points; the built-in icon's own size wins when absent. */
  width?: number | string;

  /** The icon's height, in points; the built-in icon's own size wins when absent. */
  height?: number | string;

  /** Accepted, no effect: the canvas paths are filled, never stroked. */
  fill?: string;

  /** Accepted, no effect, as `fill`. */
  stroke?: string;

  /** Accepted, no effect, as `fill`. */
  strokeWidth?: number | string;

  /** Accepted, no effect: each icon's path decides its own rule. */
  fillRule?: "nonzero" | "evenodd";

  /** Accepted, no effect, as `fillRule`. */
  clipRule?: "nonzero" | "evenodd";

  /** Accepted, no effect: the icon's own viewBox decides. */
  viewBox?: string;

  /** Accepted, no effect. */
  preserveAspectRatio?: string;

  /** Accepted, no effect: NSH has no XML namespace. */
  xmlns?: string;

  /** The wrapper view, as `DOMRenderProps` gives upstream. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

/**
 * `SearchField.SearchIcon` / `SearchFieldSearchIcon`: the leading icon. It
 * registers with the enclosing `SearchField.Group`, which is how the input
 * learns to drop its start padding and corner radius (R-017) — the stand-in for
 * upstream's `:has([data-slot="search-field-search-icon"])`. Rendered outside a
 * group it still draws, it just does not change the input.
 */
export function SearchFieldSearchIcon(props: SearchFieldSearchIconProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "focusable",
    "width",
    "height",
    "fill",
    "stroke",
    "strokeWidth",
    "fillRule",
    "clipRule",
    "viewBox",
    "preserveAspectRatio",
    "xmlns",
    "render",
    "slot",
  ] as const);

  const field = SearchFieldContext();
  const group = SearchFieldGroupContext();

  // R-017: registers this icon's presence for the input's start padding, and
  // unregisters on unmount — a conditionally rendered icon must not leave the
  // padding behind.
  const unregister = group?.registerSearchIcon();

  cleanup(() => unregister?.());

  // One read of `children`, shared by the "custom icon or default" decision and
  // the placement (research 4.1 / 4.6). A computed keeps `<SearchIcon>{icon()}
  // </SearchIcon>` following its signal; a plain capture would freeze it.
  const children = computed(() => local.children);

  const classes = computed(() =>
    // R-021 / R-022: the slot classes, then the caller's.
    joinClassNames(field?.slots.searchIcon(), local.className),
  );

  const content = (): JSX.Element => {
    const child = children();

    // Upstream ignores anything that is not a valid element (a string, a
    // number, an array) and draws `IconSearch` instead. A zero-argument
    // function is NSH's reactive child, though, so it is treated as the
    // element it returns (port sheet §6).
    if (
      child === undefined ||
      child === null ||
      child === false ||
      typeof child === "string" ||
      typeof child === "number" ||
      Array.isArray(child)
    ) {
      return (
        <IconSearch
          // R-021's `text-field-placeholder`: the canvas paints with a theme
          // token, so the color is handed to the icon itself (§8).
          color="field-placeholder"
          width={local.width}
          height={local.height}
        />
      );
    }

    return renderChildren(child);
  };

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      // An `<svg>` is not a focus stop upstream; a caller's own `focusable`
      // still wins.
      focusable={local.focusable ?? false}
      class={classes()}
      style={local.style}
    >
      {content()}
    </View>
  );
}
