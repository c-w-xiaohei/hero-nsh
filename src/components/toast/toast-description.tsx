import { cleanup, computed, split, Text } from "nsh";
import type { JSX, StyleProp, TextProps, TextStyle, ViewRef } from "nsh";

import { extractText, renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";
import { viewProps } from "./toast-dom-props";
import { ToastContext, ToastItemContext } from "./toast-context";

/**
 * The props of `Toast.Description` (= `ToastDescription`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof TextPrimitive>`, React Aria Components' `Text`.
 *
 * `slot` is fixed to `"description"` upstream and accepted here without
 * effect, as on the title.
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

/**
 * `Toast.Description` / `ToastDescription`: the toast's second line.
 *
 * The variant dimension names only `title` and `indicator` upstream, so the
 * description keeps `text-muted` in every variant (port sheet §4 R-041).
 *
 * Like the title it registers its text, so the toast root's accessible name is
 * `"Title, Description"`; `extractText` reads the same single `computed`
 * children the placement renders.
 */
export function ToastDescription(props: ToastDescriptionProps): JSX.Element {
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

  // R-041, plus the caller's class.
  const classes = computed(() =>
    joinClassNames(region.slots?.().description(), local.className),
  );

  const unregister = item.registerText?.("description", () =>
    extractText(children()),
  );

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
