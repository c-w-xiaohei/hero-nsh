import { split, Text } from "nsh";
import type { JSX, StyleProp, TextProps, TextStyle, ViewRef } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";

/**
 * The props of `Toast.Description` (= `ToastDescription`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof TextPrimitive>`, React Aria Components' `Text`.
 *
 * `slot` is fixed to `"description"` upstream and accepted here without
 * effect, as on the title.
 *
 * STUB: the body renders the caller's children in the part's own `Text`; the
 * part implementer replaces the body, not the file name or the props.
 */
export interface ToastDescriptionProps
  extends Omit<TextProps, "children" | "class" | "style" | "ref" | "role">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The description text. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** NSH text style keys instead of React's `CSSProperties`. */
  style?: StyleProp<TextStyle>;

  /** Fixed to `"description"` upstream; accepted, no effect. */
  slot?: "description";

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Forwarded to the description as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/** `Toast.Description` / `ToastDescription`: the toast's second line. */
export function ToastDescription(props: ToastDescriptionProps): JSX.Element {
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
