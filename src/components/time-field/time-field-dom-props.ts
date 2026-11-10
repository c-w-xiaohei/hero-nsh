/*
 * HeroUI's `TimeFieldRoot` sits on a plain `div` (`time-field.tsx:20-38`), so its
 * props include the element's ARIA and global attributes. NSH has no DOM, so
 * these are accepted for API parity and have no effect: the ones with an NSH
 * counterpart (`id`, `aria-label`, `ref`) are mapped in the root, the rest are
 * never read.
 *
 * Local copy of `src/components/number-field/number-field-dom-props.ts`; the
 * port sheet §5 keeps new shared code out of `src/primitives/` until the
 * controller promotes it, so this unit carries its own copy.
 */

/** Every `aria-*` attribute, ignored unless a part maps it. */
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
 * The attributes that exist only because HeroUI renders a real DOM element.
 * NSH's host logs every prop it does not know, so they are accepted by the props
 * types and dropped before the spread onto the host.
 */
const DOM_ONLY_PROPS = new Set([
  "render",
  "slot",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
  "name",
  "onKeyDown",
  "onKeyUp",
  "onClick",
  "onDoubleClick",
  "onMouseDown",
  "onMouseUp",
  "onMouseMove",
  "onMouseEnter",
  "onMouseLeave",
  "onPointerDown",
  "onPointerUp",
]);

/**
 * The props the root hands to its host: everything `split` left in `rest` except
 * the DOM-only members above and the caller's `aria-*` / `data-*` attributes.
 *
 * Each kept prop becomes an enumerable getter that reads `rest`, so the value
 * keeps following its source exactly as `split`'s `rest` does; the keys are
 * fixed at render time, as with every spread.
 */
export function hostProps(rest: object): Record<string, unknown> {
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
