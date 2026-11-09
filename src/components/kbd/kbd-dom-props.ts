/*
 * HeroUI's Kbd parts sit on React DOM elements (`<kbd>`, `<abbr>`, `<span>`),
 * so their props include the element's ARIA and global attributes. NSH has no
 * DOM and no element relationships, so these are accepted for API parity and
 * have no effect: the values are never read.
 *
 * This is a local copy of `src/components/button/dom-props.ts`, which the port
 * sheet §5 proposes lifting into `src/primitives/dom-props.ts`. The unit keeps
 * its own copy until that cross-unit change lands, as the sheet instructs.
 */

/** Every `aria-*` attribute, ignored at runtime. */
export interface AriaProps {
  [key: `aria-${string}`]: unknown;
}

/** Every `data-*` attribute, ignored at runtime; identify a view with `testID`. */
export interface DataProps {
  [key: `data-${string}`]: unknown;
}

/** React Aria's `GlobalDOMAttributes`: global DOM attributes, ignored at runtime. */
export interface GlobalDomProps {
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";
}
