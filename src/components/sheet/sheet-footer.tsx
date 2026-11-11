import type { JSX } from "nsh";
import { split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";

/**
 * The props of `Sheet.Footer`: HeroUI's `ComponentPropsWithRef<"div">`.
 */
export interface SheetFooterProps extends SheetPartDomProps {}

/**
 * Sheet.Footer / SheetFooter: the action row (R-033).
 *
 * Stub: the slot classes and the row direction are the implemented part's.
 */
export function SheetFooter(props: SheetFooterProps): JSX.Element {
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
