import type { JSX, StyleProp, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { AlertDialogContextValue } from "./alert-dialog-context";
import { AlertDialogContext, createAlertDialogContextValue } from "./alert-dialog-context";
import type { AlertDialogPartDomProps } from "./alert-dialog-dom-props";
import { viewProps } from "./alert-dialog-dom-props";
import type { AlertDialogRenderValues } from "./alert-dialog-render-values";
import type { AlertDialogPlacement, AlertDialogSize } from "./alert-dialog.styles";
import { alertDialogEnteringClasses } from "./alert-dialog.styles";

/**
 * The props of `AlertDialog.Container`: HeroUI's `AlertDialogContainerProps`,
 * which is React Aria's inner `Modal` (the overlay's props without `children`
 * and `className`, minus the Backdrop's own ones) plus `placement` and `size`.
 */
export interface AlertDialogContainerProps
  extends Omit<AlertDialogPartDomProps, "children" | "className" | "style"> {
  children?: JSX.Element | ((values: AlertDialogRenderValues) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Where the dialog sits vertically. @default "auto" */
  placement?: AlertDialogPlacement;

  /** The dialog's maximum width, or its cover box. @default "md" */
  size?: AlertDialogSize;
}

/** AlertDialog.Container / AlertDialogContainer: the positioning wrapper. */
export function AlertDialogContainer(props: AlertDialogContainerProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "placement",
    "size",
    "render",
    "slot",
  ]);

  // Upstream merges its own `alertDialogVariants({size})` over the root's slots
  // and hands the result down with `placement`; here the same merge is
  // `withOverrides`, so the Dialog (and the spacing parts) read one table and no
  // dimension is duplicated (port sheet §2, `alert-dialog-context.ts`).
  const parent = AlertDialogContext();

  // A Container written without a Root reads an empty context upstream (its
  // slots come from its own call, `placement` falls back to `auto`). Here the
  // fallback value keeps the subtree's `close` channel callable and treats the
  // card as open, so the entering classes still play.
  const base: AlertDialogContextValue =
    parent ??
    createAlertDialogContextValue({ isOpen: () => true, setOpen: () => {} });

  const contextValue = base.withOverrides({
    placement: () => local.placement,
    size: () => local.size,
  });

  // RAC reports the overlay's entering phase through the render props of the
  // inner Modal, and its CSS keys `data-entering` off the same state. NSH has
  // no animation events, so `createOverlayPresence` reproduces the first-frame
  // contract (research §10, port sheet §5).
  const presence = createOverlayPresence({ isOpen: contextValue.isOpen });

  const values: AlertDialogRenderValues = {
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
    state: {
      isOpen: contextValue.isOpen,
      open: contextValue.open,
      close: contextValue.close,
      toggle: contextValue.toggle,
    },
  };

  // R-017 … R-020 live in the table's `container` slot.
  const classes = computed(() =>
    [contextValue.slots().container(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  // R-021 `[data-entering="true"]` → first frame `opacity-0 scale-105`;
  // R-022 `auto` → `translate-y-1`, dropped from `sm` up;
  // R-023 `top` → `-translate-y-1`;
  // R-024 `center` → no translation;
  // R-025 `bottom` → `translate-y-1`.
  // The classes come off one frame after they are laid out, which is what turns
  // them into the transition the `container` slot declares.
  const classList = computed(() => {
    const entering = alertDialogEnteringClasses(contextValue.placement() ?? "auto");

    return entering === "" ? {} : { [entering]: presence.isEntering() };
  });

  const content = () => {
    const node = local.children;

    return typeof node === "function" && node.length >= 1
      ? (node as (values: AlertDialogRenderValues) => JSX.Element)(values)
      : (node as JSX.Element);
  };

  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      classList={classList()}
      style={local.style}
    >
      {/*
        The provider exception in the common rules: the subtree needs the merged
        dimensions, so `props.children` is read once, inside the Provider, at
        the placement (a computed created in the body would evaluate outside
        it).
      */}
      <AlertDialogContext.Provider value={contextValue}>{content()}</AlertDialogContext.Provider>
    </View>
  );
}
