import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { AlertDialogContext } from "./alert-dialog-context";
import type { AlertDialogPartDomProps } from "./alert-dialog-dom-props";
import { viewProps } from "./alert-dialog-dom-props";
import { AlertDialogDialogContext } from "./alert-dialog-part-order";
import { renderAlertDialogPartChildren } from "./alert-dialog-part-children";
import { alertDialogVariants } from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.Header`: HeroUI's
 * `AlertDialogHeaderProps`, which is `HTMLAttributes<HTMLDivElement>`.
 */
export interface AlertDialogHeaderProps extends AlertDialogPartDomProps {}

/**
 * AlertDialog.Header / AlertDialogHeader: the header row holding the icon and
 * title.
 *
 * R-044 `.alert-dialog__header` → `flex flex-col gap-3 mb-0` lives in the slot
 * table; R-045 (`.alert-dialog__header > .modal__icon`) has no descendant
 * selector in NSH and no bottom margin to undo, so the gap is the whole
 * spacing. What this part adds is its place in the Dialog's registration
 * table: a Body or Footer written after it asks for the part before it and gets
 * `mt-2` / `mt-5` (R-064, R-065).
 */
export function AlertDialogHeader(props: AlertDialogHeaderProps): JSX.Element {
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

  const context = AlertDialogContext();

  // Outside a Root the part still renders with the table's defaults, as the
  // rest of the family does.
  const slots = () => context?.slots() ?? alertDialogVariants();

  // The registration is what R-064 `.alert-dialog__header +
  // .alert-dialog__body` → `mt-2` and R-065 `.alert-dialog__header +
  // .alert-dialog__footer` → `mt-5` read. It belongs in the body of the part
  // (not a computed) because the table records the order in which the parts
  // mount, and removes this entry on unmount.
  AlertDialogDialogContext()?.register("header");

  const classes = computed(() =>
    [slots().header(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  return (
    <View
      // Upstream spreads every caller prop onto the div; the ones NSH models
      // (`testID`, `accessibilityLabel`, `onLayout`, `focusable`, `onPress` …)
      // reach the view, the DOM-only ones are dropped by `viewProps`.
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {renderAlertDialogPartChildren(local.children)}
    </View>
  );
}
