import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

/**
 * What HeroUI's `ComponentPropsWithRef<"div">` parts of Sheet accept, in NSH
 * terms: the host view props (presses, focus, state styles, layout events),
 * `children`, `className` and `style`.
 *
 * The DOM-only members (`render`, `slot`, `data-*`, the React DOM event names)
 * are accepted so code written against HeroUI 3.2.7 keeps compiling; port
 * sheet §8 lists what they do here. `ref` is a callback only: a ref store on a
 * view throws at mount on the web target (the measured host rule). Local copy
 * of `modal/modal-dom-props.ts`, which itself carries `card/card-dom-props.ts`;
 * port sheet §5 proposes lifting it into a primitive, and the unit keeps its
 * own until then.
 */
export interface SheetPartDomProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style"> {
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Forwarded as a callback to the view; nothing else is a ref here. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/**
 * The members that exist only because HeroUI spreads its props onto a real DOM
 * element. NSH's host logs every prop it does not know, so they are accepted by
 * the props type and dropped before the spread onto `View`.
 */
const DOM_ONLY_PROPS = new Set([
  "render",
  "slot",
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
]);

/**
 * The props a part hands to its `View`: everything `split` left in `rest`
 * except the DOM-only members above and the caller's `aria-*` / `data-*`
 * attributes. Upstream spreads `{...props}` on the element, so every other
 * member of the public type has to reach the view: `onLayout`,
 * `accessibilityLabel`, `focusable`, `onPress`, `onMouseEnter`, `disabled` …
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
      configurable: true,
      enumerable: true,
      get: () => source[key],
    });
  }

  return result;
}

function isDomOnlyProp(key: string): boolean {
  return key.startsWith("aria-") || key.startsWith("data-") || DOM_ONLY_PROPS.has(key);
}
