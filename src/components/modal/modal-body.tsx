import type { JSX, ScrollEvent } from "nsh";
import { computed, split, Scroll, View } from "nsh";

import { ModalDialogContext } from "./create-modal-part-order";
import type { ModalPartDomProps } from "./modal-dom-props";
import { viewProps } from "./modal-dom-props";
import { ModalContext } from "./modal-context";
import { renderModalPartChildren } from "./modal-part-children";
import { modalBodyAfterHeaderClasses, modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Body`: HeroUI's `DOMRenderProps<'div', undefined>` plus
 * `children` and `className`.
 */
export interface ModalBodyProps extends ModalPartDomProps {
  /** A DOM tab stop upstream; a view is one through `focusable` (below). */
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
export function ModalBody(
  props: ModalBodyProps & {
    /**
     * Called on the `inside` Scroll's `onScroll`, after the modal's own
     * scroll-position reporting (adapt sheet A-005): the swipe's claim gate
     * hears the offset before the caller does. Under `scroll="outside"` the
     * body is a plain `View` and the prop is accepted but never fires — the
     * carrier's own Scroll reports instead. Rides an inline intersection:
     * the sheet's `prop` cell carries a `（ModalBodyProps）` suffix that
     * gate M5's declaration lookup cannot match (same move as the
     * Backdrop's `presentation`/`isSwipeable`).
     */
    onScroll?: (event: ScrollEvent) => void;
  },
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "tabIndex",
    "focusable",
    "render",
    "slot",
    "onScroll",
  ]);

  const context = ModalContext();

  const slots = () => context?.slots() ?? modalVariants();
  const scroll = () => context?.scroll() ?? "inside";
  const inside = () => scroll() === "inside";

  // R-058, through the order the Dialog hands down (port sheet §2).
  const previous = ModalDialogContext()?.register("body");

  // HeroUI's fixture gives the body `tabIndex={0}` to make the scrolling area
  // focusable. A view is a tab stop through `focusable`, so a non-negative
  // `tabIndex` maps to it; a caller's own `focusable` still decides when no
  // `tabIndex` is given.
  const focusable = () =>
    local.tabIndex === undefined ? local.focusable : local.tabIndex >= 0;

  // A-005: every offset the `inside` Scroll emits reaches the context's
  // `scrollAtTop` channel first — the swipe's claim gate — and only then the
  // caller's own `onScroll` (adapt sheet §2: report before forward). The
  // channel is a no-op where no Backdrop mounted, and this extra write is
  // the only thing the desktop half sees.
  const handleScroll = (event: ScrollEvent) => {
    context?.reportScrollOffset(event.offset);
    local.onScroll?.(event);
  };

  const classes = computed(() =>
    [
      slots().body(),
      local.className,
      previous === "header" ? modalBodyAfterHeaderClasses : undefined,
    ]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  // R-054: `Scroll` carries the scrollbar and the momentum the CSS asked for.
  // Upstream's `overscroll-contain` only stops the scroll from chaining to the
  // carrier; there is no class channel for it here and the dialog clips its
  // own box (`max-h-full min-h-0 overflow-clip`, R-040), so nothing outside
  // can scroll with it.
  //
  // R-055: with `scroll="outside"` the body is an ordinary `View` and the
  // carrier around the dialog scrolls instead (R-029, the Backdrop's part).
  //
  // The two elements differ, and JSX builds an element tree as it is written:
  // writing both bodies and handing one to `<If>` inserts the same children
  // into two parents, and the second insert takes them away from the first.
  // A child function is the deferred form instead, so only the body that
  // mounts is built, and `props.children` is read once, at its placement
  // inside it.
  return () =>
    inside() ? (
      <Scroll
        {...viewProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        focusable={focusable()}
        class={classes()}
        style={local.style}
        onScroll={handleScroll}
      >
        {renderModalPartChildren(local.children)}
      </Scroll>
    ) : (
      <View
        {...viewProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        focusable={focusable()}
        class={classes()}
        style={local.style}
      >
        {renderModalPartChildren(local.children)}
      </View>
    );
}
