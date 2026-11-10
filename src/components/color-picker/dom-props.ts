/*
 * HeroUI's parts render real DOM elements, so their props include ARIA,
 * global and data attributes plus the React DOM handlers. NSH has no DOM, so
 * these are accepted for API parity and have no effect: the ones with an NSH
 * counterpart are mapped in the part (`id` → `nativeID`, `aria-label` →
 * `accessibilityLabel`), the rest are never read (port sheet §1, §8).
 *
 * One copy for both components of this unit (port sheet §5 keeps new shared
 * code out of `src/primitives/`). Local shape of
 * `src/components/color-field/color-field-dom-props.ts`.
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
 * The React DOM handlers. `onMouseEnter` / `onMouseLeave` are the two NSH's
 * views do have (the parts use them); the rest have no channel.
 */
export interface DomEventProps {
  onClick?: (event: unknown) => void;
  onDoubleClick?: (event: unknown) => void;
  onMouseDown?: (event: unknown) => void;
  onMouseUp?: (event: unknown) => void;
  onMouseMove?: (event: unknown) => void;
  onPointerDown?: (event: unknown) => void;
  onPointerUp?: (event: unknown) => void;
  onKeyDown?: unknown;
  onKeyUp?: unknown;
  /** A DOM key event upstream; keys arrive through `keymap` here. */
  onFocusCapture?: unknown;
  onBlurCapture?: unknown;
}

/** The DOM-only members a part accepts and never forwards to its view. */
export const DOM_ONLY_KEYS: readonly string[] = [
  "slot",
  "render",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
  "onClick",
  "onDoubleClick",
  "onMouseDown",
  "onMouseUp",
  "onMouseMove",
  "onPointerDown",
  "onPointerUp",
  "onKeyDown",
  "onKeyUp",
  "onFocusCapture",
  "onBlurCapture",
];
