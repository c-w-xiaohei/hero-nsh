import type { JSX } from "nsh";
import { split, View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";
import { viewProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import { renderModalPartChildren } from "./modal-part-children";
import { modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Heading`: HeroUI's `ComponentPropsWithRef<typeof
 * HeadingPrimitive>`, which adds `level` (default 3) to the section's props.
 */
export interface ModalHeadingProps extends ModalPartDomProps {
  /** The heading level upstream writes as `h{level}`. @default 3 */
  level?: number;
}

/** Modal.Heading / ModalHeading: the dialog's title. */
export function ModalHeading(props: ModalHeadingProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "level",
    "render",
    "slot",
  ]);

  const context = ModalContext();
  const slots = () => context?.slots() ?? modalVariants();

  // R-050 `align-middle` is deleted (no inline box to align);
  // R-051 `.modal__heading` → `text-base font-medium text-foreground`.
  const classes = () =>
    [slots().heading(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" ");

  // Upstream writes `h{level}` and `slot="title"`. NSH has no slot collection,
  // so `slot` is accepted and has no effect (port sheet §1.6, §5.6), and the
  // level becomes the accessibility level of a `header` role.
  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      role="header"
      accessibilityLevel={local.level ?? 3}
      class={classes()}
      style={local.style}
    >
      {renderModalPartChildren(local.children)}
    </View>
  );
}
