import type { JSX, PressEvent } from "nsh";
import { split } from "nsh";

import type { CloseButtonRenderProps, CloseButtonRootProps } from "../close-button";
import { CloseButton } from "../close-button";
import { SheetContext } from "./sheet-context";
import type { SheetSlots } from "./sheet.styles";
import { sheetVariants, SHEET_CLOSE_TRIGGER_FOCUSED_CLASS } from "./sheet.styles";

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
 * Upstream renders its `CloseButton` with
 * `composeSlotClassName(slots.closeTrigger, className)` and
 * `mergeProps({onPress}, {onPress: closeSheet}).onPress`, i.e. the caller's
 * `onPress` runs first and the close follows on the same press. The order is
 * reproduced here; only `Sheet.Close`'s button channel is forced to close first
 * (port sheet §8 difference 7).
 *
 * R-040 is not repeated: `CloseButton` already paints `status-disabled` from its
 * own `isDisabled` / `aria-disabled` state, and a second copy here would fight
 * it (port sheet §4).
 */
export function SheetCloseTrigger(props: SheetCloseTriggerProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "onPress"]);
  const sheet = SheetContext();

  // Outside a Root the part still renders the table's default corner classes,
  // as the merged Modal / AlertDialog close triggers do.
  const slots = (): SheetSlots => sheet?.slots() ?? sheetVariants();

  // R-038: `.sheet__close-trigger` → the `closeTrigger` slot classes. R-041's
  // hover is part of that slot too (`hover:text-foreground`), so only the
  // caller's `className` is appended after it.
  //
  // R-039: `&:focus-visible` → the focus ring. The condition is "focused and the
  // keyboard was the last interaction", which is exactly the `isFocusVisible`
  // CloseButton publishes; reading it here is why this className is the render
  // prop form — the button re-evaluates it inside its own tracked class
  // computation, so the ring follows focus without a second modality state that
  // could disagree with the button's.
  const resolvedClassName = (values: CloseButtonRenderProps) =>
    [
      slots().closeTrigger(),
      values.isFocusVisible() ? SHEET_CLOSE_TRIGGER_FOCUSED_CLASS : undefined,
      local.className,
    ]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");

  // Upstream's merge order: the caller's `onPress`, then the close.
  const handlePress = (event: PressEvent) => {
    local.onPress?.(event);
    sheet?.close();
  };

  return (
    <CloseButton {...rest} className={resolvedClassName} onPress={handlePress}>
      {local.children}
    </CloseButton>
  );
}
