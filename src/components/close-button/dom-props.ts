/*
 * HeroUI's CloseButton sits on React Aria's `<button>` primitive, so its props
 * include the element's ARIA attributes, React Aria's `KeyboardEvents` /
 * `FocusEvents` / `HoverEvents` / `PressEvents`, `GlobalDOMAttributes` and the
 * full `GlobalDOMEvents` set. NSH has no DOM and no element relationships, so
 * the members below are accepted for API parity (port sheet §1.2, §5) and read
 * by nothing: they never reach the root `View`, which would report an unknown
 * prop. The ones with a real counterpart are declared on the props interface
 * itself and mapped by `close-button-root.tsx`.
 *
 * Local copy of the shape in `src/components/button/dom-props.ts`; the port
 * sheet §5 proposes lifting these into `src/primitives/dom-props.ts`, and each
 * unit keeps its own copy until that cross-unit change lands.
 */

/**
 * The `aria-*` attributes HeroUI's button primitive accepts. The mapped ones
 * are declared by `CloseButtonRootProps`; these are the rest: accepted, with no
 * effect. `aria-busy` / `aria-checked` / `aria-selected` are deliberately
 * absent, as they are absent from React Aria's button props too (port sheet
 * §1.2): a close button is no checkbox or toggle.
 *
 * There is no `aria-${string}` index signature on purpose: forgetting to
 * declare a supported attribute would silently drop it, while the port sheet
 * fixes the exact set.
 */
export interface AriaProps {
  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-controls"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-details"?: string;

  /** Accepted, no effect: NSH has no popup semantics. */
  "aria-haspopup"?: boolean | "dialog" | "grid" | "listbox" | "menu" | "tree";

  /** Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** `true` / `"true"` makes the button disabled, like `isDisabled`. */
  "aria-disabled"?: boolean | "true" | "false";

  /** Maps to `accessibilityState.expanded`; `"true"` / `"false"` fold to booleans. */
  "aria-expanded"?: boolean | "true" | "false";

  /** Maps to `accessibilityState.pressed`; `"mixed"` stays as it is. */
  "aria-pressed"?: boolean | "true" | "false" | "mixed";

  /** Maps to `accessibilityState.current`; the named values pass through. */
  "aria-current"?: boolean | "true" | "false" | "page" | "step" | "location" | "date" | "time";
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
 * An event handler for a DOM event NSH has no channel for. The payload stays
 * `any` so a caller's typed handler (React's `MouseEvent`, …) still compiles;
 * the handler is never called (port sheet §1.2).
 */
type IgnoredEventHandler = (event: any) => void;

/**
 * React Aria's `GlobalDOMEvents` minus the four handlers that do have an NSH
 * counterpart (`onMouseEnter` / `onMouseLeave` / `onMouseMove` /
 * `onContextMenu` are declared on `CloseButtonRootProps`). RAC forwards these
 * from `filterDOMProps(props, { global: true })`; in NSH there is no DOM event
 * at all, so they are accepted and dropped.
 */
export interface GlobalDomEvents {
  onClickCapture?: IgnoredEventHandler;
  onAuxClick?: IgnoredEventHandler;
  onAuxClickCapture?: IgnoredEventHandler;
  onContextMenuCapture?: IgnoredEventHandler;
  onDoubleClick?: IgnoredEventHandler;
  onDoubleClickCapture?: IgnoredEventHandler;
  onMouseDown?: IgnoredEventHandler;
  onMouseDownCapture?: IgnoredEventHandler;
  onMouseUp?: IgnoredEventHandler;
  onMouseUpCapture?: IgnoredEventHandler;
  onMouseOver?: IgnoredEventHandler;
  onMouseOverCapture?: IgnoredEventHandler;
  onMouseOut?: IgnoredEventHandler;
  onMouseOutCapture?: IgnoredEventHandler;
  onTouchStart?: IgnoredEventHandler;
  onTouchStartCapture?: IgnoredEventHandler;
  onTouchEnd?: IgnoredEventHandler;
  onTouchEndCapture?: IgnoredEventHandler;
  onTouchMove?: IgnoredEventHandler;
  onTouchMoveCapture?: IgnoredEventHandler;
  onTouchCancel?: IgnoredEventHandler;
  onTouchCancelCapture?: IgnoredEventHandler;
  onPointerDown?: IgnoredEventHandler;
  onPointerDownCapture?: IgnoredEventHandler;
  onPointerUp?: IgnoredEventHandler;
  onPointerUpCapture?: IgnoredEventHandler;
  onPointerMove?: IgnoredEventHandler;
  onPointerMoveCapture?: IgnoredEventHandler;
  onPointerCancel?: IgnoredEventHandler;
  onPointerCancelCapture?: IgnoredEventHandler;
  onPointerOver?: IgnoredEventHandler;
  onPointerOverCapture?: IgnoredEventHandler;
  onPointerOut?: IgnoredEventHandler;
  onPointerOutCapture?: IgnoredEventHandler;
  onPointerEnter?: IgnoredEventHandler;
  onPointerLeave?: IgnoredEventHandler;
  onGotPointerCapture?: IgnoredEventHandler;
  onGotPointerCaptureCapture?: IgnoredEventHandler;
  onLostPointerCapture?: IgnoredEventHandler;
  onLostPointerCaptureCapture?: IgnoredEventHandler;
  onScroll?: IgnoredEventHandler;
  onScrollCapture?: IgnoredEventHandler;
  onWheel?: IgnoredEventHandler;
  onWheelCapture?: IgnoredEventHandler;
  onAnimationStart?: IgnoredEventHandler;
  onAnimationStartCapture?: IgnoredEventHandler;
  onAnimationEnd?: IgnoredEventHandler;
  onAnimationEndCapture?: IgnoredEventHandler;
  onAnimationIteration?: IgnoredEventHandler;
  onAnimationIterationCapture?: IgnoredEventHandler;
  onTransitionRun?: IgnoredEventHandler;
  onTransitionRunCapture?: IgnoredEventHandler;
  onTransitionStart?: IgnoredEventHandler;
  onTransitionStartCapture?: IgnoredEventHandler;
  onTransitionEnd?: IgnoredEventHandler;
  onTransitionEndCapture?: IgnoredEventHandler;
  onTransitionCancel?: IgnoredEventHandler;
  onTransitionCancelCapture?: IgnoredEventHandler;
}

/** React Aria's `KeyboardEvents`: accepted, no effect (port sheet §1.2). */
export interface KeyboardEvents {
  onKeyDown?: IgnoredEventHandler;
  onKeyUp?: IgnoredEventHandler;
  onKeyDownCapture?: IgnoredEventHandler;
  onKeyUpCapture?: IgnoredEventHandler;
}

/** React Aria's `FocusEvents` that have no NSH handler of their own. */
export interface FocusEvents {
  /** Called with `true` on focus and `false` on blur; mapped by the root. */
  onFocusChange?: (isFocused: boolean) => void;
}

/** Host attributes that exist only because HeroUI renders a real `<button>`. */
export interface FormProps {
  /** Accepted, no effect: NSH has no form submission. */
  type?: "button" | "submit" | "reset";

  /** Accepted, no effect: NSH has no form submission. */
  form?: string;

  /** Accepted, no effect: NSH has no form submission. */
  formAction?: string;

  /** Accepted, no effect: NSH has no form submission. */
  formEncType?: string;

  /** Accepted, no effect: NSH has no form submission. */
  formMethod?: string;

  /** Accepted, no effect: NSH has no form submission. */
  formNoValidate?: boolean;

  /** Accepted, no effect: NSH has no form submission. */
  formTarget?: string;

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form submission. */
  value?: string;
}
