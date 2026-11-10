import type { JSX, StyleProp, TextProps, TextStyle, ViewRef } from "nsh";
import { computed, split, Text } from "nsh";

import { FieldsetContext } from "./context";
import type { FieldsetDomProps } from "./fieldset-dom-props";
import { fieldsetVariants } from "./fieldset.styles";

/* -------------------------------------------------------------------------------------------------
 * Fieldset Legend
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Fieldset.Legend`: HeroUI 3.2.7's `FieldsetLegendProps`, the
 * props of a `<legend>` element, expressed with NSH's text host props.
 *
 * The slot class comes from the root (R-003): upstream reads `slots?.legend`
 * from `FieldsetContext` and composes it onto `className` only when a root is
 * above (`fieldset.tsx:115-122`), so this part follows the same rule and stays
 * classless — apart from its own `className` — outside a `Fieldset`.
 */
export interface FieldsetLegendProps
  extends Omit<TextProps, "children" | "class" | "style" | "ref">,
    Pick<FieldsetDomProps, "render"> {
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  style?: StyleProp<TextStyle>;

  /** Forwarded as a callback only (a ref store throws on the web target). */
  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
}

export function FieldsetLegend(props: FieldsetLegendProps): JSX.Element {
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

  // Upstream's `composeSlotClassName(undefined, className)` applies nothing but
  // the caller's class when there is no root (`compose.ts:22-28`); the default
  // context is `{}` (`fieldset.tsx:29`).
  const classes = computed(() =>
    fieldset === undefined
      ? local.className
      : fieldsetVariants().legend({ className: local.className }),
  );

  // The one read of `props.children`, at the placement. A bare string is what a
  // `<Text>` draws, so no wrapper is needed here.
  return (
    <Text
      {...rest}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {local.children}
    </Text>
  );
}
