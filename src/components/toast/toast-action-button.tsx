import { split, View } from "nsh";
import type { JSX } from "nsh";

import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";
import type { ButtonRootProps } from "../button";

/**
 * The props of `Toast.ActionButton` (= `ToastActionButton`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof Button>` — every HeroUI `Button` prop
 * (`children`, `variant`, `size`, `onPress`, `isDisabled`, …) plus
 * `className`. The queue's `actionProps` travels through unchanged.
 *
 * STUB: the body is a plain `View` with the caller's children; the part
 * implementer replaces the body with the ported `Button`, not the file name or
 * the props.
 */
export interface ToastActionButtonProps extends ButtonRootProps {}

/** `Toast.ActionButton` / `ToastActionButton`: the action inside a toast. */
export function ToastActionButton(props: ToastActionButtonProps): JSX.Element {
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
