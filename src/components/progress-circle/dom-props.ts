/*
 * HeroUI's ProgressCircle sits on a `div` (the root) and on `<svg>` /
 * `<circle>` elements (the parts), so its props include those elements' ARIA,
 * data, global and SVG attributes. NSH has no DOM, but it does model an
 * accessible name, a value, a disabled state and a hidden subtree, so the ARIA
 * attributes with a counterpart are mapped by the components:
 *
 * - `aria-label` → `accessibilityLabel` (root; a registered `Label` wins)
 * - `aria-disabled` → `accessibilityState.disabled`, and R-011's class list
 * - `aria-valuetext` → the derived `accessibilityValue.text`
 *
 * The rest (`aria-labelledby`, `aria-describedby`, the other `aria-*`, every
 * `data-*`, `dir` / `lang` / …, and the SVG attributes of R-005 / R-006) are
 * accepted for API parity and read by nothing. NSH's host logs every prop it
 * does not know, so they are dropped before the spread instead of reaching the
 * `View` / `Canvas`. This is a local copy of `src/components/empty-state/dom-props.ts`
 * for the same reason that file is a copy of Kbd's: the sheet §5 proposal to
 * lift it into `src/primitives/dom-props.ts` has not landed.
 */

import type { AccessibilityState } from "nsh";

/**
 * Every `aria-*` attribute. The ones NSH models are declared below and mapped
 * by the root; the index signature keeps the rest accepted and ignored.
 */
export interface AriaProps {
  /** The accessible name; a label registered through `FieldContext` wins over it. */
  "aria-label"?: string;

  /** Hides the view and its subtree from assistive technology; maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Opens R-011's disabled class list and sets `accessibilityState.disabled`. */
  "aria-disabled"?: boolean;

  /** Accepted, no effect in the determinate case: derived from the value, as upstream overwrites it. */
  "aria-valuenow"?: number;

  /** Accepted, no effect: derived from `minValue`. */
  "aria-valuemin"?: number;

  /** Accepted, no effect: derived from `maxValue`. */
  "aria-valuemax"?: number;

  /** Drives `accessibilityValue.text`; an indeterminate circle keeps it, as upstream does. */
  "aria-valuetext"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

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
 * The attributes that exist only because HeroUI renders real DOM / SVG
 * elements. NSH's host logs every prop it does not know, so they are accepted
 * by the props types and dropped before the spread.
 */
const DOM_ONLY_PROPS = new Set([
  "render",
  "slot",
  "tabIndex",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
]);

/**
 * SVG attributes upstream's `<svg>` / `<circle>` accept and the port cannot
 * honour: the geometry, the dash and the paint are fixed in the Canvas
 * drawing (port sheet §3.1 and §8). A caller that passes one keeps compiling;
 * nothing changes on screen.
 */
export const SVG_ONLY_PROPS = new Set([
  "cx",
  "cy",
  "r",
  "strokeWidth",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeMiterlimit",
  "strokeOpacity",
  "fillOpacity",
  "vectorEffect",
  "pathLength",
  "viewBox",
  "preserveAspectRatio",
  "fill",
  "width",
  "height",
  "xmlns",
  "xmlnsXlink",
  "xmlSpace",
  "overflow",
  "clipPath",
  "mask",
  "filter",
  "display",
  "visibility",
]);

/**
 * The props a part actually hands to its host element: everything `split` left
 * in `rest` except the DOM-only members above, the SVG-only ones and the
 * caller's unmodelled `aria-*` / `data-*`.
 *
 * Each kept prop becomes an enumerable getter that reads `rest`, so the value
 * keeps following its source exactly as `split`'s `rest` does; the keys are
 * fixed at render time, as with every spread.
 */
export function viewProps(rest: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const source = rest as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    if (isDroppedProp(key)) {
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

function isDroppedProp(key: string): boolean {
  return (
    key.startsWith("aria-") ||
    key.startsWith("data-") ||
    DOM_ONLY_PROPS.has(key) ||
    SVG_ONLY_PROPS.has(key)
  );
}

/** The ARIA state NSH models, with the mapped attributes taking precedence. */
export function accessibilityState(
  own: AccessibilityState | undefined,
  ariaDisabled: boolean | undefined,
): AccessibilityState {
  return {
    ...own,
    disabled: ariaDisabled ?? own?.disabled,
  };
}
