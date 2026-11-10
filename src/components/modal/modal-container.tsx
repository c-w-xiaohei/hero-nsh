import type { JSX, StyleProp, ViewStyle } from "nsh";
import { computed, View } from "nsh";

import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { ModalBackdropProps } from "./modal-backdrop";
import type { ModalContextValue } from "./modal-context";
import { createModalContextValue, ModalContext } from "./modal-context";
import type { ModalRenderValues } from "./modal-render-values";
import type { ModalPlacement, ModalVariants } from "./modal.styles";
import { modalEnteringClasses } from "./modal.styles";

/**
 * The props of `Modal.Container`: HeroUI's `ModalContainerProps`, which is
 * React Aria's inner `Modal` (the backdrop's props without `children` and
 * `className`) plus `placement`, `scroll` and `size`.
 */
export interface ModalContainerProps
  extends Omit<ModalBackdropProps, "children" | "className" | "style"> {
  children?: JSX.Element | ((values: ModalRenderValues) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** Where the dialog sits vertically. @default "auto" */
  placement?: ModalPlacement;

  /** Which element scrolls. @default "inside" */
  scroll?: ModalVariants["scroll"];

  /** The dialog's maximum width, or its full / cover box. @default "md" */
  size?: ModalVariants["size"];
}

/** Modal.Container / ModalContainer: the positioning wrapper for the dialog. */
export function ModalContainer(props: ModalContainerProps): JSX.Element {
  // Upstream merges its own `modalVariants({scroll, size})` over the root's
  // slots and hands the result down with `placement`; here the same merge is
  // `withOverrides`, so the Dialog (and the Body) read one table and no
  // dimension is duplicated (port sheet §2, `modal-context.ts`).
  const parent = ModalContext();

  // A Container written without a Root reads an empty context upstream (its
  // slots come from its own call, `placement` falls back to `auto`). Here the
  // fallback value keeps the subtree's `close` channel callable and treats the
  // card as open, so the entering classes still play.
  const base: ModalContextValue =
    parent ?? createModalContextValue({ isOpen: () => true, setOpen: () => {} });

  const contextValue = base.withOverrides({
    placement: () => props.placement,
    scroll: () => props.scroll,
    size: () => props.size,
  });

  // RAC reports the overlay's entering phase through the render props of the
  // inner Modal, and its CSS keys `data-entering` off the same state. NSH has
  // no animation events, so `createOverlayPresence` reproduces the first-frame
  // contract (research §10, port sheet §5.4).
  const presence = createOverlayPresence({
    isOpen: contextValue.isOpen,
    isEntering: () => props.isEntering,
    isExiting: () => props.isExiting,
  });

  const values: ModalRenderValues = {
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
    state: {
      isOpen: contextValue.isOpen,
      open: contextValue.open,
      close: contextValue.close,
      toggle: contextValue.toggle,
    },
  };

  // R-017 `.modal__container` → `flex flex-col items-center`; R-018 → the
  // `w-full min-w-0 flex-1` box; R-019 → `p-4 sm:w-fit sm:p-10`; R-020 →
  // `pointer-events-none`; R-030 / R-028 are the `full` / `outside` variants of
  // the same slot. All of them live in the table.
  const classes = computed(() =>
    [contextValue.slots().container(), props.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  // R-021 `[data-entering="true"]` → first frame `opacity-0 scale-105`;
  // R-022 `auto` → `translate-y-1`, dropped from `sm` up;
  // R-023 `top` → `-translate-y-1`;
  // R-024 `center` → no translation;
  // R-025 `bottom` → `translate-y-1`;
  // R-031 `full` uses the 100 series: the same offsets without the scale.
  // The classes come off one frame after they are laid out, which is what
  // turns them into the transition the `container` slot declares.
  const classList = computed(() => {
    const entering = modalEnteringClasses(
      contextValue.placement(),
      contextValue.size() === "full",
    );

    return entering === "" ? {} : { [entering]: presence.isEntering() };
  });

  const content = () => {
    const node = props.children;

    return typeof node === "function" && node.length >= 1
      ? (node as (values: ModalRenderValues) => JSX.Element)(values)
      : (node as JSX.Element);
  };

  return (
    <View
      ref={(node) => props.ref?.(node)}
      testID={props.testID}
      nativeID={props.id ?? props.nativeID}
      class={classes()}
      classList={classList()}
      style={props.style}
    >
      {/*
        The provider exception in the common rules: the subtree needs the merged
        dimensions, so `props.children` is read once, inside the Provider, at
        the placement (a computed created in the body would evaluate outside
        it).
      */}
      <ModalContext.Provider value={contextValue}>{content()}</ModalContext.Provider>
    </View>
  );
}
