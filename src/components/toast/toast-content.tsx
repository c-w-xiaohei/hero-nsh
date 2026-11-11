import { computed, split, View } from "nsh";
import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./toast-dom-props";
import { viewProps } from "./toast-dom-props";
import { ToastContext, ToastItemContext } from "./toast-context";

/**
 * The props of `Toast.Content` (= `ToastContent`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof ToastContentPrimitive>`, React Aria Components'
 * content `div`, with NSH's view host props.
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

/**
 * `Toast.Content` / `ToastContent`: the text column of a toast.
 *
 * Upstream gets its grid placement and its fade from the `content` slot plus
 * two descendant selectors on the toast (`.toast:not(:has(...))` and
 * `.toast:not([data-frontmost]):not([data-expanded])`). NSH has neither, so the
 * single-track placement and the collapsed fade are appended here from the
 * item context.
 */
export function ToastContent(props: ToastContentProps): JSX.Element {
  // The region's slot table and this toast's layout flags, read once in the
  // body (port sheet §2).
  const region = ToastContext();
  const item = ToastItemContext();

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

  // The single read of `children`, made at the placement below; nothing else
  // reads them (research 4.1 / 4.6).
  const children = computed(() => local.children);

  const classes = computed(() =>
    joinClassNames(
      // R-034 / R-023: the slot carries the column, the flex column and the
      // 200ms opacity transition (`opacity DURATION` stays untouched here).
      region.slots?.().content(),
      // R-050: without an indicator the toast is a single-track grid, so the
      // content takes the indicator's column as well.
      item.hasIndicator?.() === false ? "col-start-1" : undefined,
      // R-025: a collapsed non-front toast keeps its content invisible.
      item.contentHidden?.() ? "opacity-0" : undefined,
      local.className,
    ),
  );

  return (
    <View
      {...viewProps(rest)}
      ref={(next) => local.ref?.(next)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      class={classes()}
      style={local.style}
    >
      {renderChildren(children())}
    </View>
  );
}
