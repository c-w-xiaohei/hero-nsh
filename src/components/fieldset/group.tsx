import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./children";
import type { FieldsetDomProps } from "./fieldset-dom-props";
import { fieldsetVariants } from "./fieldset.styles";

/* -------------------------------------------------------------------------------------------------
 * Field Group
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Fieldset.Group` / `FieldGroup`: HeroUI 3.2.7's `FieldGroupProps`,
 * the props of a `<div>` holding the fields, expressed with NSH's view host
 * props.
 *
 * Both spellings exist upstream (`Fieldset.Group` and the named `FieldGroup`);
 * this one component serves both.
 */
export interface FieldGroupProps
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

export function FieldGroup(props: FieldGroupProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "render",
  ] as const);

  const classes = computed(() =>
    fieldsetVariants().fieldGroup({ className: local.className }),
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
