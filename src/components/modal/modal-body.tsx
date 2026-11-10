import type { JSX } from "nsh";
import { computed, Scroll, View } from "nsh";

import { ModalDialogContext } from "./create-modal-part-order";
import type { ModalPartDomProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import { renderModalPartChildren } from "./modal-part-children";
import { modalBodyAfterHeaderClasses, modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Body`: HeroUI's `DOMRenderProps<'div', undefined>` plus
 * `children` and `className`.
 */
export interface ModalBodyProps extends ModalPartDomProps {
  /** A DOM tab stop upstream; accepted without effect, a view is one or not. */
  tabIndex?: number;
}

/**
 * Modal.Body / ModalBody: the dialog's content area.
 *
 * R-053 `.modal__body` → `min-h-0 flex-1 text-sm leading-[1.43] text-muted
 * -m-[3px] my-0 overflow-visible p-[3px]` is the slot table's `body` entry;
 * R-055 `.modal__body--scroll-outside` → `overflow-visible` is its `outside`
 * variant. R-054 `.modal__body--scroll-inside` (`scrollbar overflow-y-auto
 * overscroll-contain`, `-webkit-overflow-scrolling: touch`) has no class
 * channel in NSH — `overflow-auto` and `scrollbar` are not utilities and
 * `Scroll` is an element — so the `inside` variant renders a `Scroll` and the
 * `outside` variant keeps the `View`.
 *
 * R-058 `.modal__header + .modal__body` → `mt-2`: the body asks the Dialog's
 * registration table which part was written before it.
 */
export function ModalBody(props: ModalBodyProps): JSX.Element {
  const context = ModalContext();

  const slots = () => context?.slots() ?? modalVariants();
  const scroll = () => context?.scroll() ?? "inside";
  const inside = () => scroll() === "inside";

  // R-058, through the order the Dialog hands down (port sheet §2).
  const previous = ModalDialogContext()?.register("body");

  const classes = computed(() =>
    [
      slots().body(),
      props.className,
      previous === "header" ? modalBodyAfterHeaderClasses : undefined,
    ]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  // One read of `props.children`, at its placement inside both candidate
  // elements: only the one `<If>` mounts builds native views.
  const children = renderModalPartChildren(props.children);

  // R-054: `Scroll` carries the scrollbar and the momentum the CSS asked for.
  // Upstream's `overscroll-contain` only stops the scroll from chaining to the
  // carrier; there is no class channel for it here and the dialog clips its
  // own box (`max-h-full min-h-0 overflow-clip`, R-040), so nothing outside
  // can scroll with it.
  const insideBody = (
    <Scroll
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      class={classes()}
      style={props.style}
    >
      {children}
    </Scroll>
  );

  // R-055: with `scroll="outside"` the body is an ordinary `View` and the
  // carrier around the dialog scrolls instead (R-029, the Backdrop's part).
  const outsideBody = (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      class={classes()}
      style={props.style}
    >
      {children}
    </View>
  );

  return (
    <If when={inside()} else={outsideBody}>
      {insideBody}
    </If>
  );
}
