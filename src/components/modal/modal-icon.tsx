import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import type { ModalPartDomProps } from "./modal-dom-props";
import { viewProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import { renderModalPartChildren } from "./modal-part-children";
import { modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Icon`: HeroUI's `DOMRenderProps<'div', undefined>` plus
 * `children` and `className`.
 */
export interface ModalIconProps extends ModalPartDomProps {}

/**
 * Modal.Icon / ModalIcon: the optional icon above the title. R-052 gives it
 * `flex items-center justify-center size-10 shrink-0 rounded-3xl select-none`
 * from the `icon` slot, so it takes the themed square without any rule of its
 * own (port sheet §1.6).
 *
 * Upstream's icon is a `div`, so a bare string inside it shows (a `View` draws
 * none); the children go through `renderModalPartChildren` like every other
 * part's.
 */
export function ModalIcon(props: ModalIconProps): JSX.Element {
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

  const modal = ModalContext();
  const slots = modal?.slots ?? modalVariants;

  const classes = computed(() =>
    [slots().icon(), local.className ?? ""].filter((part) => part !== "").join(" "),
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
