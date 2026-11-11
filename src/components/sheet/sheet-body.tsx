import type { JSX } from "nsh";
import { split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";

/**
 * The props of `Sheet.Body`: HeroUI's `ComponentPropsWithRef<"div">`.
 */
export interface SheetBodyProps extends SheetPartDomProps {}

/**
 * Sheet.Body / SheetBody: the scrolling area (R-031, R-032).
 *
 * Stub: the implemented part renders a `Scroll` with
 * `scrollable={SheetDetentContext()?.isExpanded()}` and the slot classes.
 */
export function SheetBody(props: SheetBodyProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
  ]);

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={local.className}
      style={local.style}
    >
      {renderSheetPartChildren(local.children)}
    </View>
  );
}
