/*
 * HeroUI's ColorField root sits on a React DOM `<div>`, so its props include
 * the element's ARIA, global and data attributes. NSH has no DOM, so these are
 * accepted for API parity and have no effect: the ones with an NSH counterpart
 * are mapped in the root, the rest are never read.
 *
 * Local copy of `src/components/number-field/number-field-dom-props.ts`; the
 * port sheet §5 keeps new shared code out of `src/primitives/`, so this unit
 * carries its own copy until the controller promotes one.
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
 * NSH's host logs every prop it does not know, so they are accepted by the
 * props type and dropped before the spread onto the host.
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
  "form",
  "placeholder",
  "autoFocus",
  "excludeFromTabOrder",
  "isWheelDisabled",
  "onKeyDown",
  "onKeyUp",
  "onBeforeInput",
  "onInput",
  "onCopy",
  "onCut",
  "onPaste",
  "onCompositionStart",
  "onCompositionEnd",
  "onCompositionUpdate",
  "onSelect",
  "onClick",
  "onDoubleClick",
  "onMouseDown",
  "onMouseUp",
  "onMouseMove",
  "onPointerDown",
  "onPointerUp",
]);

/**
 * The props the root hands to its host: everything `split` left in `rest`
 * except the DOM-only members above and the caller's `aria-*` / `data-*`
 * attributes.
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
