/*
 * HeroUI's Typography parts sit on React DOM elements (`<p>`, `<h1>`–`<h6>`,
 * `<code>`, `<div>`), so their props include the element's ARIA and global
 * attributes. NSH has no DOM, but two of those attributes have a real
 * equivalent and are mapped, as `src/components/button/button-root.tsx` maps
 * them: `aria-label` → `accessibilityLabel`, `aria-hidden` →
 * `accessibilityElementsHidden`. The rest of `aria-*` and `data-*` are accepted
 * for API parity and have no effect: the values are never read.
 *
 * This is a local copy of `src/components/button/dom-props.ts`, which the port
 * sheet §5 proposes lifting into `src/primitives/dom-props.ts`; `kbd` and
 * `typography` both need it. The unit keeps its own copy until that cross-unit
 * change lands, as the sheet instructs.
 */

/** Every `aria-*` attribute; `aria-label` / `aria-hidden` are mapped, the rest ignored. */
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
 *
 * `hidden` is here too, but its behavior is kept: the parts add the `hidden`
 * class when it is set (`display: none` upstream).
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
 * The ARIA attributes NSH can honor, and the host prop each one becomes. HeroUI
 * callers write the DOM spelling; a caller who already used the NSH prop keeps
 * it when the DOM attribute is absent, and loses to it when both are given, as
 * in Button.
 */
const ARIA_ALIASES: Record<string, string> = {
  "aria-label": "accessibilityLabel",
  "aria-hidden": "accessibilityElementsHidden",
};

/**
 * The props a text part actually hands to its `Text`: everything `split` left
 * in `rest` except the DOM-only members above, the caller's `data-*`
 * attributes, and the `aria-*` attributes NSH cannot express — with
 * `aria-label` / `aria-hidden` renamed to their NSH equivalents.
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
  const mapped = new Map<string, string>();

  for (const [attribute, host] of Object.entries(ARIA_ALIASES)) {
    if (source[attribute] !== undefined) {
      mapped.set(host, attribute);
    }
  }

  for (const [host, attribute] of mapped) {
    define(result, host, () =>
      attribute === "aria-hidden" ? isAriaTrue(source[attribute]) : source[attribute],
    );
  }

  for (const key of Object.keys(source)) {
    if (ARIA_ALIASES[key] !== undefined || mapped.has(key) || isDomOnlyProp(key)) {
      continue;
    }

    define(result, key, () => source[key]);
  }

  return result;
}

function define(target: Record<string, unknown>, key: string, get: () => unknown): void {
  Object.defineProperty(target, key, { enumerable: true, configurable: true, get });
}

/**
 * `aria-hidden` takes `true` / `false` or their DOM string spellings; NSH takes
 * a boolean. `"false"` must not become truthy.
 */
function isAriaTrue(value: unknown): boolean {
  return value === "false" ? false : Boolean(value);
}

function isDomOnlyProp(key: string): boolean {
  return key.startsWith("aria-") || key.startsWith("data-") || DOM_ONLY_PROPS.has(key);
}
