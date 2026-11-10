import { split, View } from "nsh";
import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";
import { viewProps } from "./toast-dom-props";

/**
 * The props of `Toast.Content` (= `ToastContent`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof ToastContentPrimitive>`, React Aria Components'
 * content `div`, with NSH's view host props.
 *
 * STUB: the body is a plain `View` with the caller's children; the part
 * implementer replaces the body, not the file name or the props.
 */
export interface ToastContentProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The title, description and any custom content. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** NSH style keys instead of React's `CSSProperties`. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the content `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** `Toast.Content` / `ToastContent`: the text column of a toast. */
export function ToastContent(props: ToastContentProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
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
