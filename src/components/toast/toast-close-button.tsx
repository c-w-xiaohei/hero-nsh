import { split, View } from "nsh";
import type { JSX } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { CloseButtonRootProps } from "../close-button";

/**
 * The props of `Toast.CloseButton` (= `ToastCloseButton`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof CloseButton>` — every HeroUI `CloseButton`
 * prop (`children`, `className`, `aria-label`, `onPress`, …). Its default
 * accessible label is `"Close"` upstream and in the ported CloseButton.
 *
 * STUB: the body is a plain `View` with the caller's children; the part
 * implementer replaces the body with the ported `CloseButton` and its default
 * dismiss action, not the file name or the props.
 */
export interface ToastCloseButtonProps extends CloseButtonRootProps {}

/** `Toast.CloseButton` / `ToastCloseButton`: the dismiss control of a toast. */
export function ToastCloseButton(props: ToastCloseButtonProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "onLayout",
  ] as const);

  const className = () => {
    const value = local.className;

    return typeof value === "string" ? value : undefined;
  };

  return (
    <View
      {...(rest as Record<string, unknown>)}
      ref={(next) => local.ref?.(next)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      class={joinClassNames(className())}
      style={typeof local.style === "function" ? undefined : local.style}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children as JSX.Element)}
    </View>
  );
}
