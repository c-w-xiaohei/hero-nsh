import { cleanup, computed, split, Text } from "nsh";
import type { JSX, StyleProp, TextProps, TextStyle, ViewRef } from "nsh";

import { extractText, renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";
import { viewProps } from "./toast-dom-props";
import { ToastContext, ToastItemContext } from "./toast-context";

/**
 * The props of `Toast.Title` (= `ToastTitle`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof TextPrimitive>`, React Aria Components' `Text`,
 * which is a `<span>` with the text props.
 *
 * `slot` is fixed to `"title"` upstream and accepted here without effect: NSH
 * has no slot mechanism, the registration happens in the body.
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

/**
 * `Toast.Title` / `ToastTitle`: the toast's headline.
 *
 * Upstream's `Text` takes its color from `.toast--<variant> .toast__title`, a
 * descendant selector on the toast. NSH has none, so the same slot is resolved
 * here with the item's `variant` (`accent` / `success` / `warning` / `danger`
 * restate the foreground; port sheet §4 R-052 … R-058).
 *
 * The rendered text is also what gives the toast root its accessible name, so
 * it is registered on `ToastItemContext.registerText`; `extractText` stays a
 * live accessor, which keeps `<Toast.Title>{title()}</Toast.Title>` updating
 * the label too.
 */
export function ToastTitle(props: ToastTitleProps): JSX.Element {
  const region = ToastContext();
  const item = ToastItemContext();

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "slot",
    "id",
    "nativeID",
    "testID",
    "tooltip",
  ] as const);

  // The single read of `children`, shared by the placement and the accessible
  // name below; `computed` keeps a reactive child live (research 4.1 / 4.6).
  const children = computed(() => local.children);

  const classes = computed(() =>
    joinClassNames(
      // R-040, plus the variant's foreground color (R-052 … R-058).
      region.slots?.().title({ variant: item.variant?.() ?? "default" }),
      local.className,
    ),
  );

  const unregister = item.registerText?.("title", () => extractText(children()));

  if (unregister) {
    cleanup(unregister);
  }

  return (
    <Text
      {...viewProps(rest)}
      ref={(next) => local.ref?.(next)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      class={classes()}
      style={local.style}
    >
      {renderChildren(children())}
    </Text>
  );
}
