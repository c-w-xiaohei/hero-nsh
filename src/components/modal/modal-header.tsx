import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { ModalDialogContext } from "./create-modal-part-order";
import type { ModalPartDomProps } from "./modal-dom-props";
import { viewProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import { renderModalPartChildren } from "./modal-part-children";
import { modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Header`: HeroUI's `DOMRenderProps<'div', undefined>`
 * plus `children` and `className`.
 */
export interface ModalHeaderProps extends ModalPartDomProps {}

/**
 * Modal.Header / ModalHeader: the header row holding the icon and title.
 *
 * R-048 `.modal__header` → `flex flex-col gap-3 mb-0` lives in the slot table;
 * R-049 (`.modal__header > .modal__icon`) is deleted there because the icon has
 * no bottom margin to undo. What this part adds is its place in the Dialog's
 * registration table: a Body or Footer written after it asks for the part
 * before it and gets `mt-2` / `mt-5` (R-058, R-059).
 */
export function ModalHeader(props: ModalHeaderProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "render",
    "slot",
  ]);

  const context = ModalContext();

  // Outside a Root the part still renders with the table's defaults, as the
  // rest of the family does (see `modal-heading.tsx`).
  const slots = () => context?.slots() ?? modalVariants();

  // The registration is what R-058 `.modal__header + .modal__body` → `mt-2`
  // and R-059 `.modal__header + .modal__footer` → `mt-5` read. It belongs in
  // the body of the part (not a computed) because the table records the order
  // in which the parts mount, and removes this entry on unmount.
  ModalDialogContext()?.register("header");

  const classes = computed(() =>
    [slots().header(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  return (
    <View
      // Upstream spreads every caller prop onto the div; the ones NSH models
      // (`testID`, `accessibilityLabel`, `onLayout`, `focusable`, `onPress` …)
      // reach the view, the DOM-only ones are dropped by `viewProps`.
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {renderModalPartChildren(local.children)}
    </View>
  );
}
