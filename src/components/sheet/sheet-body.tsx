import type { JSX, ScrollEvent } from "nsh";
import { computed, split, Scroll } from "nsh";

import { SheetContentPanContext, SheetDetentContext } from "./create-sheet-detent";
import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { SheetContext } from "./sheet-context";
import { renderSheetPartChildren } from "./sheet-part-children";
import { sheetVariants } from "./sheet.styles";

/**
 * The props of `Sheet.Body`: HeroUI's `ComponentPropsWithRef<"div">`.
 * The caller's `onScroll` arrives through the parameter type below rather
 * than a declared member: upstream accepts every DOM handler, and the detent
 * only needs the key at the `split` seam to forward it.
 */
export interface SheetBodyProps extends SheetPartDomProps {}

/**
 * Sheet.Body / SheetBody: the scrolling area between the header and the footer.
 *
 * R-031 `.sheet__body` → `min-h-0 flex-auto basis-auto px-5 py-2` is the slot
 * table's `body` entry. Two of its upstream declarations have no class here:
 * `scrollbar` is `Scroll`'s own prop (on by default, so not written) and
 * `overflow-hidden` was the same property as the scroll container, so the part
 * renders a `Scroll` instead of a `View`.
 *
 * R-032 `.sheet__content[data-expanded] .sheet__body` → `overflow-y-auto` is
 * the structure change: a `Scroll` scrolls only when it is told to, so
 * `scrollable` follows the detent's `isExpanded()`. Before the sheet reaches
 * full length the body is frozen and the drag moves the sheet instead of the
 * content, which is exactly what the upstream selector was for.
 *
 * `flex-auto basis-auto` rather than `flex-1` is the content-driven-column rule
 * (skill §2): NSH's `flex-1` basis is a hard zero, so in a column whose height
 * comes from its content the body would collapse.
 */
export function SheetBody(
  props: SheetBodyProps & {
    /** Upstream's DOM `onScroll`: stripped from `rest` so the detent's offset
     * report can forward every event to the caller's handler after it runs. */
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
    "render",
    "slot",
    "onScroll",
  ]);

  const context = SheetContext();
  const detent = SheetDetentContext();
  // The paired-scroll props of `Sheet.Dialog`'s content-area gesture
  // (adapt-sheets/sheet-handoff.md A-006): the touch environment's keyboard
  // policy, empty under the default pointer environment.
  const contentPan = SheetContentPanContext();

  const slots = () => context?.slots() ?? sheetVariants();

  // Outside a `Sheet.Content` there is no detent and no clip box, so the body
  // keeps the scroll area `Scroll` gives by default instead of freezing.
  const scrollable = () => detent?.isExpanded() ?? true;

  const classes = computed(() =>
    [slots().body(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  return (
    <Scroll
      {...viewProps(rest)}
      {...(contentPan?.scrollProps() ?? {})}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      scrollable={scrollable()}
      class={classes()}
      style={local.style}
      // The offset is the content↔panel handoff's "at the top edge" input;
      // the caller's own `onScroll` still hears every event.
      onScroll={(event) => {
        detent?.reportScrollOffset(event.offset);
        local.onScroll?.(event);
      }}
    >
      {renderSheetPartChildren(local.children)}
    </Scroll>
  );
}
