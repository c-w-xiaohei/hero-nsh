import type { JSX } from "nsh";
import { split, View } from "nsh";

import type { CloseButtonRootProps } from "../close-button";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";

/**
 * The props of `Sheet.CloseTrigger`: HeroUI's `SheetCloseTriggerProps`, which is
 * `ComponentPropsWithRef<typeof CloseButton>` with `className` re-declared.
 * `CloseButton` already carries that surface (and the default close icon), so
 * the type reuses it.
 */
export interface SheetCloseTriggerProps extends Omit<CloseButtonRootProps, "className"> {
  /** Appended after the slot classes; later classes win. */
  className?: string;
}

/**
 * Sheet.CloseTrigger / SheetCloseTrigger: the corner close button (R-038 …
 * R-041, R-046).
 *
 * Stub: the implemented part renders the merged `CloseButton` with the slot
 * classes, closes on press, and calls the caller's `onPress` first — HeroUI's
 * `mergeProps` order for this part (port sheet §1.1).
 */
export function SheetCloseTrigger(props: SheetCloseTriggerProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className"]);

  // `CloseButton`'s children may be a render function; the stub has no render
  // values for it yet, so the implemented part is what calls it.
  const children = () =>
    typeof local.children === "function" ? null : renderSheetPartChildren(local.children);

  return (
    <View {...viewProps(rest)} class={local.className}>
      {children()}
    </View>
  );
}
