import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import type { SurfaceContextValue } from "../surface";
import { SurfaceContext } from "../surface";
import { createModalPartOrder, ModalDialogContext } from "./create-modal-part-order";
import { ModalContext } from "./modal-context";
import { viewProps } from "./modal-dom-props";
import type { ModalPlacement, ModalSlots } from "./modal.styles";
import { modalPlacementClasses, modalVariants } from "./modal.styles";

/**
 * The props of `Modal.Dialog`: HeroUI's `ModalDialogProps`, which is React
 * Aria's `DialogProps` (`AriaDialogProps + StyleProps + SlotProps +
 * DOMRenderProps<'section'>`).
 */
export interface ModalDialogProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "role" | "style"> {
  children?: JSX.Element | ((values: { close: () => void }) => JSX.Element);

  /** Appended after the slot classes; later classes win. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  /** React Aria's role; NSH has no `dialog`, see port sheet §5.6. */
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
 * HeroUI's `DEFAULT_SURFACE_CONTEXT` (`modal.tsx:32`): a dialog is a raised
 * surface of its own, so a `Surface` inside it must not inherit the variant of
 * the card the modal was opened from.
 */
const DEFAULT_SURFACE_CONTEXT: SurfaceContextValue = { variant: () => "default" };

/** Modal.Dialog / ModalDialog: the card the modal shows. */
export function ModalDialog(props: ModalDialogProps): JSX.Element {
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

  const context = ModalContext();

  // Outside a Root the Dialog still renders, with the table's defaults and
  // `auto` placement, as upstream's empty context default does.
  const slots = (): ModalSlots => context?.slots() ?? modalVariants();
  const placement = (): ModalPlacement => context?.placement() ?? "auto";

  // A-004: the swipe channel the Backdrop installs. `swipe.panHandlers()`
  // resolves to an empty object whenever any of the four gates is off — the
  // spread mounts no listener at all, so the desktop never sees the path.
  const swipe = context?.swipe ?? null;

  // The card's height is the release threshold's unit (`dy ≥ card/2`); it is
  // reported through the same `onLayout` the caller's handler still gets.
  const handleLayout = (event: { bounds: Bounds }) => {
    swipe?.reportCardHeight(event.bounds.size.height);
    local.onLayout?.(event);
  };

  const close = () => context?.close();

  // R-032 `.modal__dialog` → `relative flex w-full flex-col`; R-033 →
  // `bg-overlay shadow-overlay outline-none`; R-034 → `rounded-3xl`;
  // R-035 → `p-6 pointer-events-auto`. The size and scroll halves are the
  // table's `dialog` variants, merged in by the Container's context.
  const classes = computed(() =>
    [slots().dialog(), local.className]
      .filter((part) => part !== undefined && part !== "")
      .join(" "),
  );

  // R-036 `auto` → `mt-auto sm:my-auto`;
  // R-037 `center` → `my-auto`;
  // R-038 `bottom` → `mt-auto`;
  // R-039 `top` → `mt-0`.
  const classList = computed(() => ({ [modalPlacementClasses[placement()]]: true }));

  // A-004: the claimed drag tracks the finger — the card follows it down
  // (`translate:[0, offset]`); at rest the offset is 0 and the transform is
  // the identity, so the desktop output changes in nothing but a property
  // that reads as no-op.
  const dragStyle = computed<ViewStyle | undefined>(() =>
    swipe !== null ? { translate: [0, swipe.offset()] } : undefined,
  );

  // R-058 `.modal__header + .modal__body` → `mt-2`;
  // R-059 `.modal__header + .modal__footer` → `mt-5`;
  // R-060 `.modal__body + .modal__footer` → `mt-5`.
  // NSH has no adjacent-sibling selector and no way for a parent to walk its
  // children, so the three parts register in the order they are written and
  // each asks for the part before it (port sheet §2, research 4.2).
  const partOrder = createModalPartOrder();

  const content = () => {
    const node = local.children;

    return typeof node === "function" && node.length >= 1
      ? (node as (values: { close: () => void }) => JSX.Element)({ close })
      : (node as JSX.Element);
  };

  return (
    <SurfaceContext.Provider value={DEFAULT_SURFACE_CONTEXT}>
      <ModalDialogContext.Provider value={partOrder}>
        <View
          // Upstream's `DialogPrimitive` is `DOMRenderProps<'section'>`, so
          // every caller prop reaches the section; `viewProps` drops only the
          // DOM-only names. `role` and `aria-label` are mapped above and are
          // therefore not in `rest`.
          {...viewProps(rest)}
          // A-004: the gesture seam lands after the caller's own props, the
          // same ordering Sheet.Dialog uses — `createPan` owns the responder
          // props on this card, and under every gate-off the spread is empty.
          {...(swipe?.panHandlers() ?? {})}
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          // NSH's `AccessibilityRole` has no `dialog`; an `alertdialog` still
          // becomes `alert`, the plain dialog has no role to land on (§5.6).
          role={local.role === "alertdialog" ? "alert" : "none"}
          accessibilityLabel={local["aria-label"]}
          class={classes()}
          classList={classList()}
          style={[dragStyle(), local.style]}
          onLayout={handleLayout}
        >
          {/*
            The provider exception in the common rules: the three spacing parts
            register into `partOrder` and the surfaces below read
            `SurfaceContext`, so `props.children` is read once, here at the
            placement inside both providers.
          */}
          {content()}
        </View>
      </ModalDialogContext.Provider>
    </SurfaceContext.Provider>
  );
}
