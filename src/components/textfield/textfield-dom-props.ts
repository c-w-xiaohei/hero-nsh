/*
 * HeroUI's TextField parts sit on React DOM elements (`div`, `input`,
 * `textarea`), so their props include the element's ARIA, global and
 * input-specific attributes. NSH has no DOM, so these are accepted for API
 * parity and have no effect: the ones with an NSH counterpart are mapped in the
 * parts, the rest are never read (port sheet §1.2, §1.3, §1.4, §5).
 *
 * Local copy of `src/components/search-field/search-field-dom-props.ts`; the
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
 * The attributes that exist only because HeroUI renders real DOM elements.
 * NSH's host logs every prop it does not know, so they are accepted by the
 * props types and dropped before the spread onto a host.
 *
 * DOM events that do have an NSH channel on an input (`onKeyPress`, `onPaste`,
 * `onSelectionChange`, `onCompositionChange`, `onCaretMove`) are absent from
 * this list on purpose: they reach the host.
 */
const DOM_ONLY_PROPS = new Set([
  "render",
  "slot",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
  // `<input>` / `<textarea>` attributes and events without an NSH host channel,
  // accepted with no effect (port sheet §1.2 / §1.3 / §1.4, §8).
  "name",
  "form",
  "list",
  "pattern",
  "minLength",
  "spellCheck",
  "required",
  "size",
  "min",
  "max",
  "step",
  "multiple",
  "accept",
  "alt",
  "src",
  "width",
  "height",
  "formAction",
  "formEncType",
  "formMethod",
  "formNoValidate",
  "formTarget",
  "dirName",
  "popover",
  "accessKey",
  "title",
  "tabIndex",
  "draggable",
  "capture",
  "autoSave",
  "results",
  "excludeFromTabOrder",
  "validationBehavior",
  "validate",
  "onKeyDown",
  "onKeyUp",
  "onBeforeInput",
  "onInput",
  "onCopy",
  "onCut",
  "onSelect",
  "onClick",
  "onDoubleClick",
  "onMouseDown",
  "onLoad",
  "onError",
  "onCompositionStart",
  "onCompositionEnd",
  "onCompositionUpdate",
  "onFocusChange",
  "cols",
  "wrap",
]);

/**
 * The props a part hands to its host: everything `split` left in `rest` except
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
