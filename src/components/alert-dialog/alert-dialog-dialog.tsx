import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { AlertDialogContext } from "./alert-dialog-context";
import { viewProps } from "./alert-dialog-dom-props";
import {
  AlertDialogDialogContext,
  createAlertDialogPartOrder,
} from "./alert-dialog-part-order";
import type { AlertDialogSlots } from "./alert-dialog.styles";
import {
  alertDialogPlacementClasses,
  alertDialogSheetDialogClasses,
  alertDialogVariants,
} from "./alert-dialog.styles";

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
    "onLayout",
  ]);

  const context = AlertDialogContext();

  // Outside a Root the Dialog still renders, with the table's defaults and
  // `auto` placement, as upstream's empty context default does.
  const slots = (): AlertDialogSlots => context?.slots() ?? alertDialogVariants();
  const placement = () => context?.placement() ?? "auto";

  // A-003/A-004: the Backdrop's resolved presentation and its swipe channel.
  // Outside a Backdrop both stand at the defaults (`"panel"`, `null`) and the
  // spread below mounts nothing — the desktop paths are byte-identical.
  const presentation = () => context?.presentation() ?? "panel";
  const swipe = () => context?.swipe() ?? null;

  const close = () => context?.close();

  const classes = computed(() =>
    [
      slots().dialog(),
      presentation() === "sheet" ? alertDialogSheetDialogClasses : undefined,
      local.className,
    ]
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

  // A-004: the card's height is the half-height release threshold of the
  // swipe-dismiss, so every layout reports it to the channel the Backdrop
  // owns; the caller's `onLayout` runs after it, as before.
  const handleLayout = (event: { bounds: Bounds }) => {
    swipe()?.reportCardHeight(event.bounds.size.height);
    local.onLayout?.(event);
  };

  // A-004: the drag offset the Backdrop's pan writes becomes the card's
  // downward translate. At rest it is 0, which the style binds anyway so the
  // release back to rest renders without a remount.
  const dragStyle = (): ViewStyle | undefined => {
    const channel = swipe();

    return channel === null ? undefined : { translate: [0, channel.offset()] };
  };

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
        // A-004: the swipe-dismiss responder spreads here; the `createPan`
        // seam that produces it lives in `alert-dialog-backdrop.tsx` and
        // crosses through the context's `swipe` channel. Under any gated
        // configuration (pointer input, `isDismissable`/`isSwipeable` unset,
        // or a panel presentation) `panHandlers()` resolves to `{}` and no
        // listener exists — the gesture path is physically absent, not
        // registered-and-ignored.
        {...(swipe()?.panHandlers() ?? {})}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        // HeroUI always writes `role="alertdialog"`. NSH's `AccessibilityRole`
        // has no `alertdialog`; it becomes `alert`, and a caller's plain
        // `dialog` has no role to land on (port sheet §8).
        role={role() === "alertdialog" ? "alert" : "none"}
        accessibilityLabel={local["aria-label"]}
        class={classes()}
        classList={classList()}
        style={[dragStyle(), local.style]}
        onLayout={handleLayout}
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
