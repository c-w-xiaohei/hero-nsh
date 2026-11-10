import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

/**
 * What HeroUI's `DOMRenderProps<E, undefined>` parts of Modal accept, in NSH
 * terms: the host view props (presses, focus, state styles, layout events),
 * `children`, `className` and `style`.
 *
 * The DOM-only members (`render`, `slot`, `data-*`, the React DOM event names)
 * are accepted so code written against HeroUI 3.2.7 keeps compiling; port
 * sheet §8 lists what they do here. `ref` is a callback only: a ref store on a
 * view throws at mount on the web target (the measured host rule).
 */
export interface ModalPartDomProps
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
