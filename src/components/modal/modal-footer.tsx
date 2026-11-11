import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { ModalDialogContext } from "./create-modal-part-order";
import type { ModalPartDomProps } from "./modal-dom-props";
import { viewProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import { renderModalPartChildren } from "./modal-part-children";
import {
  modalFooterAfterBodyClasses,
  modalFooterAfterHeaderClasses,
  modalVariants,
} from "./modal.styles";

/**
 * The props of `Modal.Footer`: HeroUI's `DOMRenderProps<'div', undefined>`
 * plus `children` and `className`.
 */
export interface ModalFooterProps extends ModalPartDomProps {}

/**
 * Modal.Footer / ModalFooter: the dialog's action row.
 *
 * R-056 `.modal__footer` → `flex flex-row items-center justify-end gap-2 mt-0`
 * is the slot table's `footer` entry. The part's own job is the margin its
 * predecessor carries: R-059 `.modal__header + .modal__footer` → `mt-5` and
 * R-060 `.modal__body + .modal__footer` → `mt-5`, read from the Dialog's
 * registration table (port sheet §2). Both rules land on `mt-5` but they stay
 * separate constants because they are separate rules upstream.
 */
export function ModalFooter(props: ModalFooterProps): JSX.Element {
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

  const slots = () => context?.slots() ?? modalVariants();

  // R-059 / R-060: the part registered immediately before this footer, read
  // once at registration. A footer written first, or outside a Dialog, gets
  // no margin.
  const previous = ModalDialogContext()?.register("footer");

  const gap =
    previous === "header"
      ? modalFooterAfterHeaderClasses
      : previous === "body"
        ? modalFooterAfterBodyClasses
        : undefined;

  const classes = computed(() =>
    [slots().footer(), local.className, gap]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  return (
    <View
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
