/*
 * HeroUI's Link parts sit on React DOM elements (`<a>` / `<span>`), so their
 * props include the element's ARIA and global attributes. NSH has no DOM and no
 * element relationships, so these are accepted for API parity and have no
 * effect: the values are never read (`aria-label` / `aria-current` /
 * `aria-disabled` / `aria-hidden` are the exceptions, and are declared with
 * their real meaning on each part). The sets mirror React Aria's
 * `AriaLabelingProps` / `DOMProps`, React's `GlobalDOMAttributes` and the
 * `DOMAttributes` event families no NSH `View` host pipeline carries
 * (port sheet 1.1-1.2 and §8).
 *
 * Local copy of `src/components/button/dom-props.ts`; port sheet §5 proposes
 * lifting it into `src/primitives/dom-props.ts`.
 */

/** Every `aria-*` attribute; only the members each part names have a channel. */
export interface AriaProps {
  [key: `aria-${string}`]: unknown;
}

/** Every `data-*` attribute: NSH has no attribute passthrough. */
export interface DataProps {
  [key: `data-${string}`]: unknown;
}

/** React's global DOM attributes, accepted for parity. */
export interface GlobalDomProps {
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";
}

/**
 * A DOM event handler of the element upstream. NSH has no such event on a link,
 * so one is never called, and the payload is deliberately untyped: `any[]`
 * accepts every handler signature HeroUI code already declares.
 */
export type IgnoredDomEventHandler = (...args: any[]) => void;

/*
 * React's `DOMAttributes` pointer, touch, scroll, wheel, animation and
 * transition handlers, each `*Capture` form included, as `LinkProps` inherits
 * them from `PossibleLinkDOMRenderProps` / `DOMProps`. A link's presses arrive
 * as `onPress` here and scrolling lives on `Scroll`, so a `View` has no such
 * host pipeline for the link: the members exist so code written against HeroUI
 * keeps compiling and the values are never read (port sheet 1.1, 1.2 and §8).
 */
export interface DomEventProps {
  onPointerDown?: IgnoredDomEventHandler;
  onPointerDownCapture?: IgnoredDomEventHandler;
  onPointerMove?: IgnoredDomEventHandler;
  onPointerMoveCapture?: IgnoredDomEventHandler;
  onPointerUp?: IgnoredDomEventHandler;
  onPointerUpCapture?: IgnoredDomEventHandler;
  onPointerCancel?: IgnoredDomEventHandler;
  onPointerCancelCapture?: IgnoredDomEventHandler;
  onPointerEnter?: IgnoredDomEventHandler;
  onPointerLeave?: IgnoredDomEventHandler;
  onPointerOver?: IgnoredDomEventHandler;
  onPointerOverCapture?: IgnoredDomEventHandler;
  onPointerOut?: IgnoredDomEventHandler;
  onPointerOutCapture?: IgnoredDomEventHandler;
  onGotPointerCapture?: IgnoredDomEventHandler;
  onGotPointerCaptureCapture?: IgnoredDomEventHandler;
  onLostPointerCapture?: IgnoredDomEventHandler;
  onLostPointerCaptureCapture?: IgnoredDomEventHandler;

  onTouchStart?: IgnoredDomEventHandler;
  onTouchStartCapture?: IgnoredDomEventHandler;
  onTouchMove?: IgnoredDomEventHandler;
  onTouchMoveCapture?: IgnoredDomEventHandler;
  onTouchEnd?: IgnoredDomEventHandler;
  onTouchEndCapture?: IgnoredDomEventHandler;
  onTouchCancel?: IgnoredDomEventHandler;
  onTouchCancelCapture?: IgnoredDomEventHandler;

  onScroll?: IgnoredDomEventHandler;
  onScrollCapture?: IgnoredDomEventHandler;
  onScrollEnd?: IgnoredDomEventHandler;
  onScrollEndCapture?: IgnoredDomEventHandler;

  onWheel?: IgnoredDomEventHandler;
  onWheelCapture?: IgnoredDomEventHandler;

  onAnimationStart?: IgnoredDomEventHandler;
  onAnimationStartCapture?: IgnoredDomEventHandler;
  onAnimationEnd?: IgnoredDomEventHandler;
  onAnimationEndCapture?: IgnoredDomEventHandler;
  onAnimationIteration?: IgnoredDomEventHandler;
  onAnimationIterationCapture?: IgnoredDomEventHandler;

  onTransitionRun?: IgnoredDomEventHandler;
  onTransitionRunCapture?: IgnoredDomEventHandler;
  onTransitionStart?: IgnoredDomEventHandler;
  onTransitionStartCapture?: IgnoredDomEventHandler;
  onTransitionEnd?: IgnoredDomEventHandler;
  onTransitionEndCapture?: IgnoredDomEventHandler;
  onTransitionCancel?: IgnoredDomEventHandler;
  onTransitionCancelCapture?: IgnoredDomEventHandler;
}
