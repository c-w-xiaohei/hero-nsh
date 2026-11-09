/*
 * HeroUI's Skeleton sits on a `div`, so its props include the element's ARIA
 * and global attributes (port sheet §1). NSH has no DOM: those with an NSH
 * counterpart are mapped in `skeleton.tsx`, the rest are accepted for API
 * parity and read by nothing, so they are never passed to the root `View`
 * (which would report them as unsupported).
 */

/** Every `aria-*` attribute. `skeleton.tsx` maps the ones with a state; the rest are no-ops. */
export interface AriaProps {
  [key: `aria-${string}`]: unknown;
}

/** React Aria's `GlobalDOMAttributes`: global DOM attributes, ignored at runtime. */
export interface GlobalDomProps {
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";
}
