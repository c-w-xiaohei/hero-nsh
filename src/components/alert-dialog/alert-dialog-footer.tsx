import type { JSX } from "nsh";
import { computed, split, View } from "nsh";

import { AlertDialogContext } from "./alert-dialog-context";
import type { AlertDialogPartDomProps } from "./alert-dialog-dom-props";
import { viewProps } from "./alert-dialog-dom-props";
import { AlertDialogDialogContext } from "./alert-dialog-part-order";
import { renderAlertDialogPartChildren } from "./alert-dialog-part-children";
import {
  alertDialogFooterAfterBodyClasses,
  alertDialogFooterAfterHeaderClasses,
  alertDialogVariants,
} from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.Footer`: HeroUI's
 * `AlertDialogFooterProps`, which is `HTMLAttributes<HTMLDivElement>`.
 */
export interface AlertDialogFooterProps extends AlertDialogPartDomProps {}

/**
 * AlertDialog.Footer / AlertDialogFooter: the dialog's action row.
 *
 * R-061 `.alert-dialog__footer` → `flex flex-row items-center justify-end
 * gap-2` and R-062 → `mt-0` are the slot table's `footer` entry. The part's own
 * job is the margin its predecessor carries: R-065 `.alert-dialog__header +
 * .alert-dialog__footer` → `mt-5` and R-066 `.alert-dialog__body +
 * .alert-dialog__footer` → `mt-5`, read from the Dialog's registration table
 * (port sheet §2). Both rules land on `mt-5` but they stay separate constants
 * because they are separate rules upstream.
 */
export function AlertDialogFooter(props: AlertDialogFooterProps): JSX.Element {
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

  const slots = () => context?.slots() ?? alertDialogVariants();

  // R-065 / R-066: the part registered immediately before this footer, read
  // once at registration. A footer written first, or outside a Dialog, gets no
  // margin.
  const previous = AlertDialogDialogContext()?.register("footer");

  const gap =
    previous === "header"
      ? alertDialogFooterAfterHeaderClasses
      : previous === "body"
        ? alertDialogFooterAfterBodyClasses
        : undefined;

  const classes = computed(() =>
    [slots().footer(), local.className, gap]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  return (
    <View
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
