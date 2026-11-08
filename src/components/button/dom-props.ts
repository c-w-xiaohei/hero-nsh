/*
 * HeroUI's parts sit on React DOM elements (`<button>`, `<div>`, `<span>`), so
 * their props include the element's ARIA and global attributes. NSH has no DOM
 * and no element relationships, so these are accepted for API parity and have
 * no effect: the values are never read. `AriaLabelingProps` / `DOMProps` of
 * React Aria and `React.JSX.IntrinsicElements['span']` are the upstream source
 * of the sets below (port sheet 1.1-1.3).
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
