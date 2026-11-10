import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

/*
 * HeroUI's Pagination is a set of DOM elements: `nav`, `div`, `ul`, `li` and
 * `span`. Their props are "the element you can replace, plus every HTML
 * attribute that element accepts" (port sheet §1.2). NSH has no DOM and no
 * element replacement, so these members are accepted for API parity and read by
 * nothing: the values never reach the root `View`, which would report an
 * unknown prop. The members with a real NSH counterpart (`className`, `style`,
 * `ref`, `id`, `role`) are declared on each part's own props interface.
 *
 * Local copy of the shape in `src/components/switch-group/dom-props.ts`; the
 * port sheet §5 proposes lifting these into `src/primitives/dom-props.ts`, and
 * each unit keeps its own copy until that cross-unit change lands.
 */

/** Every `aria-*` attribute, ignored at runtime. */
export interface AriaProps {
  [key: `aria-${string}`]: unknown;
}

/** Every `data-*` attribute, ignored at runtime; identify a view with `testID`. */
export interface DataProps {
  [key: `data-${string}`]: unknown;
}

/**
 * React Aria's `GlobalDOMAttributes` and the remaining global HTML attributes
 * NSH has no element-level equivalent for:
 *
 * - `dir`: Summary defaults to `"auto"` upstream, so mixed number/word content
 *   is not bidi-reordered by an RTL ancestor; NSH decides text direction at the
 *   host and `Text`, not per element.
 * - `hidden` cannot be emulated with conditional rendering: that would change
 *   when the subtree mounts (`autoFocus`, effects).
 */
export interface GlobalDomProps {
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";
  title?: string;
}

/**
 * An event handler for a DOM event NSH has no channel for. The payload stays
 * `any` so a caller's typed handler still compiles; the handler is never
 * called (port sheet §1.2).
 */
type IgnoredEventHandler = (event: any) => void;

/** React Aria's `KeyboardEvents`, accepted, no effect (port sheet §1.2). */
export interface KeyboardEvents {
  onKeyDown?: IgnoredEventHandler;
  onKeyUp?: IgnoredEventHandler;
  onKeyDownCapture?: IgnoredEventHandler;
  onKeyUpCapture?: IgnoredEventHandler;
}

/**
 * React Aria's `GlobalDOMEvents`, accepted, no effect. `View` has press, mouse
 * enter / leave / move and context menu, and nothing else: no touch, pointer,
 * scroll, animation or transition channels.
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
  onMouseMoveCapture?: IgnoredEventHandler;
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

/**
 * What the seven DOM-based parts accept: the host element's NSH props (the
 * upstream type is "the element plus all of its HTML attributes"), plus the
 * DOM-only members above, which are dropped before they reach the view.
 *
 * `class` / `style` / `children` / `role` / `ref` are replaced by the component
 * spellings, and `role` broadens to React's role string, mapped by
 * `pagination-roles.ts`.
 */
export interface PaginationDomPartProps
  extends Omit<
      ViewProps,
      | "children"
      | "class"
      | "style"
      | "role"
      | "ref"
      // The DOM event members below replace the host's own touch and pointer
      // channels, which `View` would otherwise type differently.
      | keyof GlobalDomEvents
      | keyof KeyboardEvents
    >,
    AriaProps,
    DataProps,
    GlobalDomProps,
    KeyboardEvents,
    GlobalDomEvents {
  /** Appended after the slot classes; later classes win (D13). */
  className?: string;

  /** Style of the part's view; wins over the slot classes on the keys it sets. */
  style?: StyleProp<ViewStyle>;

  /** A callback, as NSH forwards refs; `ref={undefined}` would reach the host. */
  ref?: (node: ViewRef) => void;

  /** A DOM role upstream; defaults to the element's implicit role where it has one. */
  role?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Maps to `accessibilityLabel`, with the element's default where it has one. */
  "aria-label"?: string;

  /** Accepted, no effect: a view hears presses, not DOM clicks. */
  onClick?: (event: any) => void;

  /** Accepted, no effect: NSH has no replaceable DOM element. */
  render?: unknown;

  /** The content; bare strings and numbers become `Text` at the placement. */
  children?: JSX.Element;
}

/** The attributes that exist only because HeroUI renders a real DOM element. */
const DOM_ONLY_PROPS = new Set([
  "render",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
  "title",
]);

/** The `on*` props NSH's `View` really has; every other event is a DOM one. */
const HOST_EVENTS = new Set([
  "onPress",
  "onPressDown",
  "onPressUp",
  "onLongPress",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onContextMenu",
  "onFileDragEnter",
  "onFileDragLeave",
  "onFileDrop",
  "onLayout",
  "onFocus",
  "onBlur",
  "onAccessibilityAction",
  "onPanStart",
  "onPanEnd",
  "onPinchStart",
  "onPinchEnd",
  "onRotationStart",
  "onRotationEnd",
]);

/**
 * The props a part actually hands to its host element: everything `split` left
 * in `rest` except the DOM-only members above, the caller's `aria-*` /
 * `data-*` attributes and the DOM event handlers `View` has no channel for.
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
  if (key.startsWith("aria-") || key.startsWith("data-")) {
    return true;
  }

  if (DOM_ONLY_PROPS.has(key)) {
    return true;
  }

  return key.startsWith("on") && !HOST_EVENTS.has(key);
}
