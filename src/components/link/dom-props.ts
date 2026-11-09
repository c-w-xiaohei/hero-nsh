/*
 * HeroUI's Link parts sit on React DOM elements (`<a>` / `<span>`), so their
 * props include the element's ARIA and global attributes. NSH has no DOM and no
 * element relationships, so these are accepted for API parity and have no
 * effect: the values are never read (`aria-label` / `aria-current` /
 * `aria-disabled` / `aria-hidden` are the exceptions, and are declared with
 * their real meaning on each part). The sets mirror React Aria's
 * `AriaLabelingProps` / `DOMProps` and React's `GlobalDOMAttributes`
 * (port sheet 1.1-1.2 and §8).
 *
 * Local copy of `src/components/button/dom-props.ts`; port sheet §5 proposes
 * lifting it into `src/primitives/dom-props.ts`.
 */

/** Every `aria-*` attribute; only the members each part names have a channel. */
export interface AriaProps {
  [key: `aria-${string}`]: unknown;
}

/** Every `data-*` attribute: NSH has no attribute passthrough. */
export interface DataProps {
  [key: `data-${string}`]: unknown;
}

/** React's global DOM attributes, accepted for parity. */
export interface GlobalDomProps {
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";
}
