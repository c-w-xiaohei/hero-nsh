/*
 * HeroUI's DisclosureGroup sits on a `div` (React Aria Components'
 * `DisclosureGroupProps` extends `GlobalDOMAttributes<HTMLDivElement>`), so its
 * props include the element's ARIA attributes, React's `GlobalDOMAttributes`
 * and the whole `div` event handler set (`onClick`, `onKeyDown`, …). NSH has no
 * DOM, no attribute channel and no DOM events, so the members below are
 * accepted for API parity: the DOM-only ones are dropped before the spread onto
 * `View`, which would report an unknown prop (port sheet §1 and §8). NSH's own
 * view events travel through the rest props, as in `switch-group/dom-props.ts`.
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

/** React's `GlobalDOMAttributes`: global DOM attributes, ignored at runtime. */
export interface GlobalDomProps {
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
  translate?: "yes" | "no";

  /** A React-only hydration flag upstream; NSH has no hydration, accepted and dropped. */
  suppressHydrationWarning?: boolean;
}

/**
 * An event handler for a DOM event NSH has no channel for. The payload stays
 * `any` so a caller's typed handler (React's `MouseEvent`, …) still compiles;
 * the handler is never called.
 */
type IgnoredEventHandler = (event: any) => void;

/**
 * The `div` event handlers NSH has no counterpart for. NSH's own handlers
 * (`onPress` / `onPressDown` / `onPressUp` / `onLongPress` / `onMouseEnter` /
 * `onMouseLeave` / `onMouseMove` / `onContextMenu` / `onFocus` / `onBlur` /
 * `onLayout` and the gesture ones) are declared by `ViewProps` and do reach the
 * root `View`, so they are deliberately absent here.
 */
const DOM_EVENT_NAMES = [
  "onClick",
  "onClickCapture",
  "onDoubleClick",
  "onDoubleClickCapture",
  "onMouseDown",
  "onMouseDownCapture",
  "onMouseUp",
  "onMouseUpCapture",
  "onMouseOver",
  "onMouseOverCapture",
  "onMouseOut",
  "onMouseOutCapture",
  "onMouseMoveCapture",
  "onDrag",
  "onDragCapture",
  "onDragEnd",
  "onDragEndCapture",
  "onDragEnter",
  "onDragEnterCapture",
  "onDragExit",
  "onDragExitCapture",
  "onDragLeave",
  "onDragLeaveCapture",
  "onDragOver",
  "onDragOverCapture",
  "onDragStart",
  "onDragStartCapture",
  "onDrop",
  "onDropCapture",
  "onPointerDown",
  "onPointerDownCapture",
  "onPointerUp",
  "onPointerUpCapture",
  "onPointerMove",
  "onPointerMoveCapture",
  "onPointerCancel",
  "onPointerCancelCapture",
  "onPointerEnter",
  "onPointerEnterCapture",
  "onPointerLeave",
  "onPointerLeaveCapture",
  "onPointerOver",
  "onPointerOverCapture",
  "onPointerOut",
  "onPointerOutCapture",
  "onGotPointerCapture",
  "onGotPointerCaptureCapture",
  "onLostPointerCapture",
  "onLostPointerCaptureCapture",
  "onKeyDown",
  "onKeyDownCapture",
  "onKeyPressCapture",
  "onKeyUp",
  "onKeyUpCapture",
  "onCopy",
  "onCopyCapture",
  "onCut",
  "onCutCapture",
  "onPasteCapture",
  "onCompositionEnd",
  "onCompositionEndCapture",
  "onCompositionStart",
  "onCompositionStartCapture",
  "onCompositionUpdate",
  "onCompositionUpdateCapture",
  "onBeforeInput",
  "onBeforeInputCapture",
  "onInput",
  "onInputCapture",
  "onChangeCapture",
  "onInvalid",
  "onInvalidCapture",
  "onReset",
  "onResetCapture",
  "onSubmitCapture",
  "onLoadCapture",
  "onErrorCapture",
  "onScrollCapture",
  "onWheel",
  "onWheelCapture",
  "onAnimationStart",
  "onAnimationStartCapture",
  "onAnimationEnd",
  "onAnimationEndCapture",
  "onAnimationIteration",
  "onAnimationIterationCapture",
  "onTransitionRun",
  "onTransitionRunCapture",
  "onTransitionStart",
  "onTransitionStartCapture",
  "onTransitionEnd",
  "onTransitionEndCapture",
  "onTransitionCancel",
  "onTransitionCancelCapture",
  "onToggle",
] as const;

/** The DOM event handlers above, accepted and never called. */
export type GlobalDomEvents = Partial<
  Record<(typeof DOM_EVENT_NAMES)[number], IgnoredEventHandler>
>;

/** The attributes that exist only because HeroUI renders a real `<div>`. */
const DOM_ONLY_PROPS = new Set<string>([
  "render",
  "slot",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
  "suppressHydrationWarning",
]);

const DOM_ONLY_EVENTS = new Set<string>(DOM_EVENT_NAMES);

/**
 * The props the root actually hands to its `View`: everything `split` left in
 * `rest` except the DOM-only members above, the caller's `aria-*` / `data-*`
 * attributes and the DOM event handlers. Each kept prop becomes an enumerable
 * getter that reads `rest`, so the value keeps following its source exactly as
 * `split`'s `rest` does; the keys are fixed at render time, as with every
 * spread.
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
    DOM_ONLY_PROPS.has(key) ||
    DOM_ONLY_EVENTS.has(key)
  );
}
