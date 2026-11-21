/*
 * HeroUI's Disclosure parts sit on React DOM elements (the trigger is a
 * `button` spread onto `Button`, RAC-style), so their props include the
 * element's `aria-*` / `data-*` attribute families. NSH has no DOM and no
 * attribute channel, so these members are accepted for API parity and never
 * read: the named `aria-*` props keep their real meaning on each part, the
 * index signatures only widen the compile-time surface.
 *
 * Local copy of the shape in `src/components/disclosure-group/dom-props.ts`;
 * the port sheet §5 proposes lifting these into `src/primitives/dom-props.ts`,
 * and each unit keeps its own copy until that cross-unit change lands.
 */

/** Every `aria-*` attribute not named on a part, accepted and ignored. */
export interface AriaProps {
  [key: `aria-${string}`]: unknown;
}

/** Every `data-*` attribute: NSH projects none of them (D18). */
export interface DataProps {
  [key: `data-${string}`]: unknown;
}
