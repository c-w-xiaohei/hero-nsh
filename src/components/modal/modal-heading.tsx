import type { JSX } from "nsh";
import { Text, View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import { modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Heading`: HeroUI's `ComponentPropsWithRef<typeof
 * HeadingPrimitive>`, which adds `level` (default 3) to the section's props.
 */
export interface ModalHeadingProps extends ModalPartDomProps {
  /** The heading level upstream writes as `h{level}`. @default 3 */
  level?: number;
}

/**
 * Upstream's heading is an `h{level}` DOM element, so its text is drawn by the
 * element itself. A `View` draws no bare string (research 4.1 / 4.6), so the
 * one value read from `props.children` is wrapped in a `Text` when it is a
 * string or a number. Local copy of `card/card-children.tsx`, which port sheet
 * §5 proposes lifting into a primitive; the unit keeps its own until then.
 */
function renderHeadingChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <Text>{node}</Text>;
  }

  // A zero-argument function is NSH's reactive child: calling it here keeps the
  // read inside the tracked children expression at the placement, so a signal
  // in `<Modal.Heading>{title()}</Modal.Heading>` still updates.
  if (typeof node === "function") {
    return renderHeadingChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderHeadingChildren(child)) as unknown as JSX.Element;
  }

  return node;
}

/** Modal.Heading / ModalHeading: the dialog's title. */
export function ModalHeading(props: ModalHeadingProps): JSX.Element {
  const context = ModalContext();
  const slots = () => context?.slots() ?? modalVariants();

  // R-050 `align-middle` is deleted (no inline box to align);
  // R-051 `.modal__heading` → `text-base font-medium text-foreground`.
  const classes = () =>
    [slots().heading(), props.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" ");

  // Upstream writes `h{level}` and `slot="title"`. NSH has no slot collection,
  // so `slot` is accepted and has no effect (port sheet §1.6, §5.6), and the
  // level becomes the accessibility level of a `header` role.
  return (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      role="header"
      accessibilityLevel={props.level ?? 3}
      class={classes()}
      style={props.style}
    >
      {renderHeadingChildren(props.children)}
    </View>
  );
}
