import { split, View } from "nsh";
import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";
import { viewProps } from "./toast-dom-props";
import type { ToastVariant } from "./toast-queue";

/**
 * The props of `Toast.Indicator` (= `ToastIndicator`): HeroUI 3.2.7's
 * `ToastIndicatorProps<E>` = `DOMRenderProps<E, undefined>` plus `children`,
 * `className` and `variant`.
 *
 * `render` and the `E` parameter are accepted for type parity and have no
 * effect: NSH has no DOM render function (port sheet §8).
 *
 * STUB: the body is a plain `View` with the caller's children; the part
 * implementer replaces the body, not the file name or the props.
 */
export interface ToastIndicatorProps<E extends string = "div">
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The indicator. `null` or `undefined` draws the default icon for the
   * variant; `false` and `""` render as they are.
   */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** NSH style keys instead of React's `CSSProperties`. */
  style?: StyleProp<ViewStyle>;

  /** The variant that picks the default icon and its colour. */
  variant?: ToastVariant;

  /** Accepted, no effect: no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: the `E` type parameter has no runtime meaning. */
  elementType?: E;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Forwarded to the indicator `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** `Toast.Indicator` / `ToastIndicator`: the status mark at the start of a toast. */
export function ToastIndicator<E extends string = "div">(
  props: ToastIndicatorProps<E>,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "variant",
    "render",
    "elementType",
    "id",
    "nativeID",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
    "testID",
    "tooltip",
  ] as const);

  return (
    <View
      {...viewProps(rest)}
      ref={(next) => local.ref?.(next)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      class={joinClassNames(local.className)}
      style={local.style}
    >
      {renderChildren(local.children)}
    </View>
  );
}
