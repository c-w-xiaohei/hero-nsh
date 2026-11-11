import type { JSX } from "nsh";
import { split, View } from "nsh";

import type { SheetPartDomProps } from "./sheet-dom-props";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";

/**
 * The props of `Sheet.Dialog`: HeroUI's `SheetDialogProps`, which is React
 * Aria's `SheetContent` (= `Dialog`) props minus `children`, plus
 * `className`, `style`, `slot`, `id` and the `role` / `aria-*` pair.
 */
export interface SheetDialogProps extends Omit<SheetPartDomProps, "role"> {
  /** React Aria's role; NSH has no `dialog` role, see port sheet §8. */
  role?: "alertdialog" | "dialog";

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Accepted, no effect: there is no id relation channel. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: there is no id relation channel. */
  "aria-describedby"?: string;
}

/**
 * Sheet.Dialog / SheetDialog: the panel itself (R-023 … R-028).
 *
 * Stub: the implemented part renders the slot's dialog classes, the detached
 * radius from the context, a `default` Surface context, and reports its natural
 * length to `SheetDetentContext()?.registerPanelLength` so the dismissal
 * threshold is 25% of the panel, as upstream measures it.
 */
export function SheetDialog(props: SheetDialogProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "role",
    "aria-label",
    "render",
    "slot",
  ]);

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local["aria-label"]}
      class={local.className}
      style={local.style}
    >
      {renderSheetPartChildren(local.children)}
    </View>
  );
}
