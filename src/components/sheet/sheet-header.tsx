import type { JSX } from "nsh";
import { split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";

/**
 * The props of `Sheet.Header`: HeroUI's `ComponentPropsWithRef<"div">`.
 */
export interface SheetHeaderProps extends SheetPartDomProps {}

/**
 * Sheet.Header / SheetHeader: the column above the body (R-029).
 *
 * Stub: the core writes the layout and the state, the part implementers replace
 * this body. It reads `props.children` once, at the placement.
 */
export function SheetHeader(props: SheetHeaderProps): JSX.Element {
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
