/*
 * HeroUI's Typography parts sit on React DOM elements (`<p>`, `<h1>`–`<h6>`,
 * `<code>`, `<div>`), so their props include the element's ARIA and global
 * attributes. NSH has no DOM and no element relationships, so these are
 * accepted for API parity and have no effect: the values are never read.
 *
 * This is a local copy of `src/components/button/dom-props.ts`, which the port
 * sheet §5 proposes lifting into `src/primitives/dom-props.ts`; `kbd` and
 * `typography` both need it. The unit keeps its own copy until that cross-unit
 * change lands, as the sheet instructs.
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

/**
 * The attributes that exist only because HeroUI renders real DOM elements
 * (`<p>`, `<h1>`–`<h6>`, `<code>`, `<div>`). NSH's host logs every prop it does
 * not know, so they are accepted by the props type and dropped before the
 * spread onto `Text` / `View`; forwarding them would make the host warn on
 * every render.
 */
const DOM_ONLY_PROPS = new Set([
  "render",
  "slot",
  "title",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
]);

/**
 * The props a text part actually hands to its `Text`: everything `split` left
 * in `rest` except the DOM-only members above and the caller's `aria-*` /
 * `data-*` attributes.
 *
 * Each kept prop becomes an enumerable getter that reads `rest`, so the value
 * keeps following its source exactly as `split`'s `rest` does; the keys are
 * fixed at render time, as with every spread.
 */
export function textProps(rest: object): Record<string, unknown> {
  return hostProps(rest);
}

/** `View`'s counterpart: `Prose` is a container, not a text element. */
export function viewProps(rest: object): Record<string, unknown> {
  return hostProps(rest);
}

function hostProps(rest: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const source = rest as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    if (isDomOnlyProp(key)) {
      continue;
    }

    Object.defineProperty(result, key, {
      enumerable: true,
      configurable: true,
      get: () => source[key],
    });
  }

  return result;
}

function isDomOnlyProp(key: string): boolean {
  return key.startsWith("aria-") || key.startsWith("data-") || DOM_ONLY_PROPS.has(key);
}
