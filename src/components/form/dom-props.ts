/*
 * HeroUI's Form sits on React Aria's `<form>`, so its props include the
 * element's ARIA attributes, the form attributes, React Aria's
 * `GlobalDOMAttributes` and the DOM event handlers. NSH has no DOM and no
 * native form, so these are accepted for API parity and read by nothing: the
 * port sheet §1 and §8 say what each can and cannot do here. The members with
 * a real counterpart (`onSubmit`, `onReset`, `onInvalid`, `aria-label`, `role`,
 * `id`, `validationErrors`, `validationBehavior`) are declared on
 * `FormRootProps` itself and mapped by `form.tsx`; the rest never reach the
 * root `View`, which would report an unknown prop.
 *
 * Local copy of the shape in `src/components/close-button/dom-props.ts`, which
 * the port sheet §5 proposes lifting into `src/primitives/dom-props.ts`; each
 * unit keeps its own copy until that cross-unit change lands.
 */

/** Every `aria-*` attribute, ignored at runtime (the mapped ones are declared by `FormRootProps`). */
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
 * An event handler for a DOM event NSH has no channel for. The payload stays
 * `any` so a caller's typed handler (React's `FormEvent`, …) still compiles;
 * the handler is never called (port sheet §1).
 */
type IgnoredEventHandler = (event: any) => void;

/**
 * The DOM events a `<form>` receives. One array drives both the accepted prop
 * names and the list dropped before the spread onto `View`, so a handler can
 * never slip through and make the host warn. `onMouseEnter` /
 * `onMouseLeave` / `onMouseMove` / `onContextMenu` and the `onTouch*` family
 * are deliberately absent: they are NSH host events, and the Form forwards
 * them to its root `View`.
 */
const DOM_EVENT_NAMES = [
  "onClick",
  "onClickCapture",
  "onAuxClick",
  "onAuxClickCapture",
  "onContextMenuCapture",
  "onDoubleClick",
  "onDoubleClickCapture",
  "onKeyDown",
  "onKeyDownCapture",
  "onKeyUp",
  "onKeyUpCapture",
  "onInput",
  "onBeforeInput",
  "onChange",
  "onSubmitCapture",
  "onResetCapture",
  "onInvalidCapture",
  "onMouseDown",
  "onMouseDownCapture",
  "onMouseMoveCapture",
  "onMouseUp",
  "onMouseUpCapture",
  "onMouseOver",
  "onMouseOverCapture",
  "onMouseOut",
  "onMouseOutCapture",
  "onPointerDown",
  "onPointerDownCapture",
  "onPointerUp",
  "onPointerUpCapture",
  "onPointerMove",
  "onPointerMoveCapture",
  "onPointerCancel",
  "onPointerCancelCapture",
  "onPointerOver",
  "onPointerOverCapture",
  "onPointerOut",
  "onPointerOutCapture",
  "onPointerEnter",
  "onPointerLeave",
  "onGotPointerCapture",
  "onGotPointerCaptureCapture",
  "onLostPointerCapture",
  "onLostPointerCaptureCapture",
  "onScroll",
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
] as const;

/** The accepted, ignored DOM event props of a form. */
export type GlobalDomEvents = {
  [K in (typeof DOM_EVENT_NAMES)[number]]?: IgnoredEventHandler;
};

/** Attributes that exist only because HeroUI renders a real `<form>`. */
const FORM_DOM_PROP_NAMES = [
  "action",
  "method",
  "encType",
  "target",
  "noValidate",
  "acceptCharset",
  "autoComplete",
  "name",
  "render",
] as const;

const GLOBAL_ATTR_NAMES = ["dir", "lang", "hidden", "inert", "translate"] as const;

const DROPPED_DOM_PROPS: ReadonlySet<string> = new Set([
  ...DOM_EVENT_NAMES,
  ...FORM_DOM_PROP_NAMES,
  ...GLOBAL_ATTR_NAMES,
]);

/**
 * The props the root actually hands to its `View`: everything `split` left in
 * `rest` except the DOM-only members above and the caller's `aria-*` /
 * `data-*` attributes. Each kept prop becomes an enumerable getter that reads
 * `rest`, so the value keeps following its source exactly as `split`'s `rest`
 * does; the keys are fixed at render time, as with every spread.
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
    DROPPED_DOM_PROPS.has(key)
  );
}
