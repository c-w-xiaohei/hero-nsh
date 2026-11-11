import type { JSX } from "nsh";
import { computed, split, Scroll } from "nsh";

import { SheetDetentContext } from "./create-sheet-detent";
import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { SheetContext } from "./sheet-context";
import { renderSheetPartChildren } from "./sheet-part-children";
import { sheetVariants } from "./sheet.styles";

/**
 * The props of `Sheet.Body`: HeroUI's `ComponentPropsWithRef<"div">`.
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
export function SheetBody(props: SheetBodyProps): JSX.Element {
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

  const context = SheetContext();
  const detent = SheetDetentContext();

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
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      scrollable={scrollable()}
      class={classes()}
      style={local.style}
    >
      {renderSheetPartChildren(local.children)}
    </Scroll>
  );
}
