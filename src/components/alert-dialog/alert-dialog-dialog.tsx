import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { AlertDialogContext } from "./alert-dialog-context";
import { viewProps } from "./alert-dialog-dom-props";
import {
  AlertDialogDialogContext,
  createAlertDialogPartOrder,
} from "./alert-dialog-part-order";
import type { AlertDialogSlots } from "./alert-dialog.styles";
import { alertDialogPlacementClasses, alertDialogVariants } from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.Dialog`: HeroUI's `AlertDialogDialogProps`, which
 * is React Aria's `DialogProps` (`AriaDialogProps + StyleProps + SlotProps +
 * DOMRenderProps<'section'>`).
 */
export interface AlertDialogDialogProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "role" | "style"> {
  children?: JSX.Element | ((values: { close: () => void }) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** HeroUI fixes it at `alertdialog`; caller props spread after it win there too. */
  role?: "alertdialog" | "dialog";

  /** Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Accepted, no effect: there is no id relation channel. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: there is no id relation channel. */
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Forwarded as a callback to the dialog's view. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/**
 * AlertDialog.Dialog / AlertDialogDialog: the card the alert dialog shows.
 *
 * R-028 … R-034 and the size axis live in the table's `dialog` slot (merged in
 * by the Container's context); R-035 … R-038 are the placement classes this
 * part binds from the same context.
 */
export function AlertDialogDialog(props: AlertDialogDialogProps): JSX.Element {
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

  const context = AlertDialogContext();

  // Outside a Root the Dialog still renders, with the table's defaults and
  // `auto` placement, as upstream's empty context default does.
  const slots = (): AlertDialogSlots => context?.slots() ?? alertDialogVariants();
  const placement = () => context?.placement() ?? "auto";

  const close = () => context?.close();

  const classes = computed(() =>
    [slots().dialog(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  // R-035 `auto` → `mt-auto sm:my-auto`;
  // R-036 `center` → `my-auto`;
  // R-037 `bottom` → `mt-auto`;
  // R-038 `top` → `mt-0`.
  const classList = computed(() => ({ [alertDialogPlacementClasses[placement()]]: true }));

  // R-064 `.alert-dialog__header + .alert-dialog__body` → `mt-2`;
  // R-065 `.alert-dialog__header + .alert-dialog__footer` → `mt-5`;
  // R-066 `.alert-dialog__body + .alert-dialog__footer` → `mt-5`.
  // NSH has no adjacent-sibling selector and no way for a parent to walk its
  // children, so the three parts register in the order they are written and
  // each asks for the part before it (port sheet §2, research 4.2).
  const partOrder = createAlertDialogPartOrder();

  const content = () => {
    const node = local.children;

    return typeof node === "function" && node.length >= 1
      ? (node as (values: { close: () => void }) => JSX.Element)({ close })
      : (node as JSX.Element);
  };

  const role = () => local.role ?? "alertdialog";

  return (
    <AlertDialogDialogContext.Provider value={partOrder}>
      <View
        // Upstream's `DialogPrimitive` is `DOMRenderProps<'section'>`, so every
        // caller prop reaches the section; `viewProps` drops only the DOM-only
        // names. `role` and `aria-label` are mapped above and are therefore not
        // in `rest`.
        {...viewProps(rest)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        // HeroUI always writes `role="alertdialog"`. NSH's `AccessibilityRole`
        // has no `alertdialog`; it becomes `alert`, and a caller's plain
        // `dialog` has no role to land on (port sheet §8).
        role={role() === "alertdialog" ? "alert" : "none"}
        accessibilityLabel={local["aria-label"]}
        class={classes()}
        classList={classList()}
        style={local.style}
      >
        {/*
          The provider exception in the common rules: the three spacing parts
          register into `partOrder`, so `props.children` is read once, here at
          the placement inside the provider.
        */}
        {content()}
      </View>
    </AlertDialogDialogContext.Provider>
  );
}
