/*
 * HeroUI's EmptyState sits on a `div`, so its props include the element's ARIA
 * and global attributes. NSH has no DOM, but it does model an accessible name,
 * a hidden subtree and an element state, so the ARIA attributes with a
 * counterpart are mapped by `empty-state.tsx`: `aria-label` →
 * `accessibilityLabel`, `aria-hidden` → `accessibilityElementsHidden`, and
 * `aria-disabled` / `aria-busy` / `aria-checked` / `aria-expanded` /
 * `aria-pressed` / `aria-selected` / `aria-current` →
 * `accessibilityState`. The rest (the cross-element relations and the
 * attributes NSH has no field for) are accepted for API parity and read by
 * nothing, so they never reach the root `View` (which would report them as
 * unsupported).
 *
 * This is a local copy of `src/components/kbd/kbd-dom-props.ts`, which the
 * port sheet §5 proposes lifting into `src/primitives/dom-props.ts`. The unit
 * keeps its own copy until that cross-unit change lands, as the sheet
 * instructs.
 */

import type { AccessibilityState } from "nsh";

/**
 * Every `aria-*` attribute. The ones NSH models are declared below and mapped
 * by the root; the index signature keeps the rest accepted and ignored.
 */
export interface AriaProps {
  /** The accessible name; wins over a caller `accessibilityLabel`, as a spread attribute wins upstream. */
  "aria-label"?: string;

  /** Hides the view and its subtree from assistive technology; maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Maps to `accessibilityState.disabled`. */
  "aria-disabled"?: boolean;

  /** Maps to `accessibilityState.busy`. */
  "aria-busy"?: boolean;

  /** Maps to `accessibilityState.checked`. */
  "aria-checked"?: boolean | "mixed";

  /** Maps to `accessibilityState.expanded`. */
  "aria-expanded"?: boolean;

  /** Maps to `accessibilityState.pressed`. */
  "aria-pressed"?: boolean | "mixed";

  /** Maps to `accessibilityState.selected`. */
  "aria-selected"?: boolean;

  /** Maps to `accessibilityState.current`. */
  "aria-current"?: AccessibilityState["current"];

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-controls"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-owns"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-activedescendant"?: string;

  /** Every other `aria-*` attribute (live regions, autocomplete, …), ignored at runtime. */
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
 * The attributes that exist only because HeroUI renders a real DOM element
 * (`<div>`). NSH's host logs every prop it does not know, so they are accepted
 * by the props type and dropped before the spread onto `View`; forwarding them
 * would make the host warn on every render.
 */
const DOM_ONLY_PROPS = new Set([
  "render",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
  "tabIndex",
]);

/**
 * The props the root actually hands to its `View`: everything `split` left in
 * `rest` except the DOM-only members above and the caller's `aria-*` /
 * `data-*` attributes.
 *
 * The mapped `aria-*` keys (`aria-label`, `aria-hidden`, the state ones) are
 * taken out by `split` and reach the `View` through the accessibility props
 * instead; whatever `aria-*` is left here is one NSH has no field for, and the
 * host has no attribute channel, so it is dropped like `data-*`.
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
  return key.startsWith("aria-") || key.startsWith("data-") || DOM_ONLY_PROPS.has(key);
}
