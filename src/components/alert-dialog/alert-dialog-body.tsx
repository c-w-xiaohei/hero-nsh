import type { JSX } from "nsh";
import { computed, split, Scroll } from "nsh";

import { AlertDialogContext } from "./alert-dialog-context";
import type { AlertDialogPartDomProps } from "./alert-dialog-dom-props";
import { viewProps } from "./alert-dialog-dom-props";
import { AlertDialogDialogContext } from "./alert-dialog-part-order";
import { renderAlertDialogPartChildren } from "./alert-dialog-part-children";
import { alertDialogBodyAfterHeaderClasses, alertDialogVariants } from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.Body`: HeroUI's
 * `AlertDialogBodyProps`, which is `HTMLAttributes<HTMLDivElement>`.
 */
export interface AlertDialogBodyProps extends AlertDialogPartDomProps {
  /** A DOM tab stop upstream; a view is one through `focusable` (below). */
  tabIndex?: number;
}

/**
 * AlertDialog.Body / AlertDialogBody: the dialog's content area.
 *
 * R-057 … R-059 live in the table's `body` slot, with `flex-auto` in place of
 * `flex-1` (style skill §2). R-060 (`overflow-y-auto`, the scrollbar and the
 * touch momentum) has no class channel in NSH — `overflow-auto` and `scrollbar`
 * are not utilities and `Scroll` is an element — so the body is a `Scroll`.
 *
 * R-064 `.alert-dialog__header + .alert-dialog__body` → `mt-2`: the body asks
 * the Dialog's registration table which part was written before it.
 */
export function AlertDialogBody(props: AlertDialogBodyProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "tabIndex",
    "focusable",
    "render",
    "slot",
  ]);

  const context = AlertDialogContext();

  const slots = () => context?.slots() ?? alertDialogVariants();

  // R-064, through the order the Dialog hands down (port sheet §2).
  const previous = AlertDialogDialogContext()?.register("body");

  // HeroUI's fixture gives the body `tabIndex={0}` to make the scrolling area
  // focusable. A view is a tab stop through `focusable`, so a non-negative
  // `tabIndex` maps to it; a caller's own `focusable` still decides when no
  // `tabIndex` is given.
  const focusable = () =>
    local.tabIndex === undefined ? local.focusable : local.tabIndex >= 0;

  const classes = computed(() =>
    [
      slots().body(),
      local.className,
      previous === "header" ? alertDialogBodyAfterHeaderClasses : undefined,
    ]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  // R-060: the `Scroll` element carries the scrollbar and the momentum the CSS
  // asked for. Upstream's `overscroll-contain` only stops the scroll from
  // chaining to the carrier; the dialog clips its own box (R-033), so nothing
  // outside can scroll with it.
  return (
    <Scroll
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      focusable={focusable()}
      class={classes()}
      style={local.style}
    >
      {renderAlertDialogPartChildren(local.children)}
    </Scroll>
  );
}
