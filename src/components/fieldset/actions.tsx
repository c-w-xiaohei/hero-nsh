import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./children";
import { FieldsetContext } from "./context";
import type { FieldsetDomProps } from "./fieldset-dom-props";
import { fieldsetVariants } from "./fieldset.styles";

/* -------------------------------------------------------------------------------------------------
 * Fieldset Actions
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Fieldset.Actions`: HeroUI 3.2.7's `FieldsetActionsProps`, the
 * props of the `<div>` holding the form's buttons, expressed with NSH's view
 * host props.
 */
export interface FieldsetActionsProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref">,
    Pick<FieldsetDomProps, "render"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Forwarded as a callback only (a ref store throws on the web target). */
  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
}

export function FieldsetActions(props: FieldsetActionsProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "render",
  ] as const);

  const fieldset = FieldsetContext();

  // Upstream reads `slots?.actions` from the root context and applies only
  // `className` outside a `Fieldset` (`compose.ts:22-28`, `fieldset.tsx:171-177`).
  const classes = computed(() =>
    fieldset === undefined
      ? local.className
      : fieldsetVariants().actions({ className: local.className }),
  );

  // The one read of `props.children`, at the placement. A bare string inside a
  // `View` is not drawn, so it becomes a `Text`.
  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {renderChildren(local.children)}
    </View>
  );
}
