import { split, Text } from "nsh";
import type { JSX, StyleProp, TextProps, TextStyle, ViewRef } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";

/**
 * The props of `Toast.Title` (= `ToastTitle`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof TextPrimitive>`, React Aria Components' `Text`,
 * which is a `<span>` with the text props.
 *
 * `slot` is fixed to `"title"` upstream and accepted here without effect: NSH
 * has no slot mechanism, the registration happens in the body.
 *
 * STUB: the body is a plain `View` with the caller's children; the part
 * implementer replaces the body, not the file name or the props.
 */
export interface ToastTitleProps
  extends Omit<TextProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The title; a string becomes a `Text` at the placement. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** NSH text style keys instead of React's `CSSProperties`. */
  style?: StyleProp<TextStyle>;

  /** Fixed to `"title"` upstream; accepted, no effect. */
  slot?: "title";

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Forwarded to the title as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** `Toast.Title` / `ToastTitle`: the toast's headline. */
export function ToastTitle(props: ToastTitleProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "slot",
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
    <Text
      {...(rest as Record<string, unknown>)}
      ref={(next) => local.ref?.(next)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      class={joinClassNames(local.className)}
      style={local.style}
    >
      {renderChildren(local.children)}
    </Text>
  );
}
