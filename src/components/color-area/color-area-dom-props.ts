/*
 * HeroUI's ColorArea sits on a React DOM `div` (React Aria Components'
 * `ColorArea`), so its props include that element's ARIA attributes, its
 * global DOM attributes and its DOM event handlers. NSH has no DOM, so these
 * are accepted for API parity and have no effect: the values are never read
 * (port sheet §1 and §8).
 *
 * Local copy of `src/components/color-swatch/color-swatch-dom-props.ts` (also in Kbd, Badge, Button
 * and Avatar); port sheet §5 proposes lifting it into
 * `src/primitives/dom-props.ts`, and this unit keeps its own copy until that
 * cross-unit change lands, as the sheet instructs.
 */

/** Every `aria-*` attribute, ignored at runtime; the accessible name is combined by the root. */
export interface AriaProps {
  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;
  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-details"?: string;
  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-errormessage"?: string;

  /** Every other `aria-*` attribute, ignored at runtime. */
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
 * The React DOM handlers RAC's `div` would receive. NSH's `View` reports
 * presses as `onPress` with a `PressEvent`, so these DOM-shaped handlers are
 * accepted and never called (port sheet §1: the swatch has no events of its
 * own); the host props NSH does have (`onPress`, `onLayout`, `onFocus`,
 * `onBlur`, the pointer ones) still pass through untouched.
 */
export interface DomEventProps {
  onClick?: (event: unknown) => void;
  onDoubleClick?: (event: unknown) => void;
  onKeyDown?: (event: unknown) => void;
  onKeyUp?: (event: unknown) => void;
  onKeyPress?: (event: unknown) => void;
  onMouseDown?: (event: unknown) => void;
  onMouseUp?: (event: unknown) => void;
  onPointerDown?: (event: unknown) => void;
  onPointerUp?: (event: unknown) => void;
}

/**
 * The attributes and handlers that exist only because HeroUI renders a real DOM
 * element (`<div>`). NSH's host logs every prop it does not know, so they are
 * accepted by the props type and dropped before the spread onto `View`;
 * forwarding them would make the host warn on every render.
 */
const DOM_ONLY_PROPS = new Set([
  "render",
  "slot",
  "title",
  "tabIndex",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
  "onClick",
  "onDoubleClick",
  "onKeyDown",
  "onKeyUp",
  "onKeyPress",
  "onMouseDown",
  "onMouseUp",
  "onPointerDown",
  "onPointerUp",
]);

/**
 * The props the root actually hands to its `View`: everything `split` left in
 * `rest` except the DOM-only members above and the caller's `aria-*` /
 * `data-*` attributes.
 *
 * Each kept prop becomes an enumerable getter that reads `rest`, so the value
 * keeps following its source exactly as `split`'s `rest` does; the keys are
 * fixed at render time, as with every spread.
 */
export function viewProps(rest: object): Record<string, unknown> {
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
  return (
    key.startsWith("aria-") ||
    key.startsWith("data-") ||
    DOM_ONLY_PROPS.has(key)
  );
}
