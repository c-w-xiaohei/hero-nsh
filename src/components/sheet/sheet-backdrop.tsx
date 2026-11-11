import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { computed, reduceMotion, signal, split, View } from "nsh";
import { Dialog } from "nsh/base";

import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import { SheetContext, SheetSwipeDirectionContext } from "./sheet-context";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";
import type { SheetPlacement, SheetSwipeDirection, SheetVariants } from "./sheet.styles";
import { SHEET_BACKDROP_UNPAINTED, sheetVariants } from "./sheet.styles";

/**
 * The props of `Sheet.Backdrop`: HeroUI's `SheetBackdropProps`, which is React
 * Aria's `SheetOverlay` props minus the ones the context owns, plus
 * `isExiting`, `variant` and `className`.
 *
 * `style` is *not* part of the surface: upstream omits it from
 * `ComponentPropsWithRef<typeof AriaSheetOverlay>`, so adding one here would
 * invent an API HeroUI does not have (port sheet §1).
 */
export interface SheetBackdropProps
  extends Omit<ViewProps, "children" | "class" | "ref" | "style"> {
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /**
   * Keep the backdrop mounted while the sheet is closed. The modal behavior
   * still ends with `isOpen`; use it to retain content through an exit.
   */
  isExiting?: boolean;

  /** The backdrop's paint. @default "opaque" */
  variant?: SheetVariants["backdrop"];

  /** Overrides the placement as the direction a swipe dismisses in (T-014). */
  swipeDirection?: SheetSwipeDirection;

  /** Whether a press outside closes it. @default true */
  isDismissable?: boolean;

  /** Whether Escape and the back button close it. @default false */
  isKeyboardDismissDisabled?: boolean;

  /** Forces the entering phase. */
  isEntering?: boolean;

  /** Accepted, no effect: the host owns the overlay's animation. */
  onEnter?: (element?: unknown) => void | Promise<void>;

  /** Accepted, no effect: the host owns the overlay's animation. */
  onExit?: (element?: unknown) => void | Promise<void>;

  /** Accepted, no effect: there is no DOM element to test. */
  shouldCloseOnInteractOutside?: (element?: unknown) => boolean;

  /** Accepted, no effect: deprecated upstream, and NSH has no portal. */
  UNSTABLE_portalContainer?: unknown;

  /** Forwarded as a callback to the overlay's root view. */
  ref?: (node: ViewRef) => void;

  /** Accepted, no effect: NSH has no DOM element to replace. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `data-${string}`]: unknown;
}

/**
 * The carrier's alignment inside the dialog layer (port sheet §3): the panel
 * hugs the edge it came from, so each placement is one axis plus one alignment.
 * `pointer-events-none` lets a press in the empty area fall through to the paint
 * layer below, while the panel itself (`Sheet.Content`'s `pointer-events-auto`)
 * stays a press target.
 */
function sheetCarrierClasses(placement: SheetPlacement): string {
  const layout =
    placement === "top"
      ? "flex-col justify-start"
      : placement === "left"
        ? "flex-row justify-start"
        : placement === "right"
          ? "flex-row justify-end"
          : "flex-col justify-end";

  return `relative flex-1 ${layout} pointer-events-none`;
}

/**
 * Sheet.Backdrop / SheetBackdrop: the modal layer and the backdrop paint
 * (R-001 … R-007, R-042).
 *
 * nsh/base `Dialog` is the window's single modal layer (port sheet §3, B1–B4);
 * inside it the paint layer and the carrier are siblings, so a press on the
 * panel cannot reach the paint layer that dismisses. The paint layer decides
 * between the variant class and `SHEET_BACKDROP_UNPAINTED` from the stack index
 * (R-005 / R-006), the `isDismissable` gate is ours rather than the native one,
 * and the dialog's open / close callbacks are HeroUI's `onAnimationEnd`
 * (port sheet §2).
 */
export function SheetBackdrop(props: SheetBackdropProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "isExiting",
    "variant",
    "swipeDirection",
    "isDismissable",
    "isKeyboardDismissDisabled",
    "isEntering",
    "onEnter",
    "onExit",
    "shouldCloseOnInteractOutside",
    "UNSTABLE_portalContainer",
    "onPress",
    "ref",
    "id",
    "nativeID",
    "render",
    "slot",
  ]);

  const ctx = SheetContext();

  // A Backdrop has no state of its own to reach without a Root above it
  // (upstream reads `useSheetContext()` unconditionally). Rendering nothing
  // keeps a misplaced part harmless instead of mounting a second modal layer.
  if (ctx === null) {
    return null;
  }

  // The backdrop's own axis over the root's, as HeroUI merges a second
  // `sheetVariants({backdrop, placement})` for this part.
  const slots = computed(() =>
    sheetVariants({ backdrop: local.variant, placement: ctx.placement() }),
  );

  const isDismissable = () => local.isDismissable ?? ctx.isDismissable();

  // HeroUI hands the Handle the overlay's own `swipeDirection` (a placement or
  // a whole axis), falling back to the placement (port sheet §2).
  const swipeDirection = (): SheetSwipeDirection => local.swipeDirection ?? ctx.placement();

  // The upstream `hasOpened` / `hasExited` pair: the dialog stays mounted
  // through its exit and, with `isExiting`, after it. Without `isExiting` a
  // closed sheet drops its subtree, as upstream's `return null` does.
  const presence = createOverlayPresence({
    isOpen: ctx.isOpen,
    isEntering: () => local.isEntering,
    isExiting: () => local.isExiting,
  });

  // HeroUI's `hasExited`, set by the overlay's own exit observer. The host
  // reports a close once the dialog has actually gone (`onClose`), which is
  // later than the presence primitive's fixed 100ms hold; waiting for it keeps
  // the exit animation whole and keeps `onAnimationEnd(false)` deliverable.
  // `presence.isPresent()` still owns the retention: with `isExiting` the
  // dialog outlives its exit, and dropping the prop releases it.
  const hasExited = signal(false);
  const isMounted = () => presence.isPresent() || !hasExited();

  const overlayClasses = computed(() =>
    // R-003: the overlay's `z-50` is not written; the Dialog is the window's
    // top modal layer, and the slot only carries a caller's composition.
    ["flex-1", slots().overlay()].filter((part) => part !== "").join(" "),
  );

  // R-004 the slot's `bg-transparent`, R-005 `bg-backdrop` and R-006 the blur
  // paint apply only to the bottom-most open sheet, so the stack index decides
  // last; a caller's `className` still wins over both.
  const paintClasses = computed(() =>
    [
      "absolute inset-0",
      slots().backdrop(),
      ctx.stackIndex() === 0 ? "" : SHEET_BACKDROP_UNPAINTED,
      local.className ?? "",
    ]
      .filter((part) => part !== "")
      .join(" "),
  );

  // HeroUI's overlay dismisses on a press outside, gated by `isDismissable`;
  // the native backdrop is off (`closeOnBackdropPress={false}`) so the gate is
  // the only channel. A caller's `onPress` runs first, as RAC merges them.
  const dismiss = (event: PressEvent) => {
    local.onPress?.(event);

    if (ctx.isOpen() && isDismissable()) {
      ctx.close();
    }
  };

  return (
    <If when={isMounted()}>
      <SheetSwipeDirectionContext.Provider value={swipeDirection()}>
        <Dialog
          open={ctx.isOpen()}
          // R-042: `prefers-reduced-motion` → no animation at all, the same
          // ruling as Modal. R-001's swipe-progress fade has no timeline here;
          // the native fade is what the backdrop gets.
          animation={reduceMotion() ? "none" : "fade"}
          closeOnBackdropPress={false}
          // Escape and the Android back button, unless the caller disabled
          // them (`isKeyboardDismissDisabled`); port sheet §1.1.
          closeOnEscape={!local.isKeyboardDismissDisabled}
          // The native swipe keeps working and is gated by `isDismissable`, as
          // upstream's `preventDismissal` does; its threshold is the host's
          // (30% / 800pt·s⁻¹) rather than HeroUI's (25% / 0.4px·ms⁻¹), which
          // Sheet.Handle's drag carries out (port sheet §8, item 8).
          closeOnSwipe={isDismissable()}
          // HeroUI's `onAnimationEnd`: the native enter finished. A reopen
          // clears `hasExited`, as upstream does during render.
          onOpen={() => {
            hasExited.set(false);
            ctx.animationEnd(true);
          }}
          // HeroUI's `onAnimationEnd(false)`: the exit finished, whether the
          // user or the app closed it.
          onClose={() => {
            hasExited.set(true);
            ctx.animationEnd(false);
          }}
          onOpenChange={(event) => {
            if (!event.open) {
              ctx.close();
            }
          }}
          class={overlayClasses()}
        >
          <View class="relative flex-1">
            <View
              {...viewProps(rest)}
              ref={(node) => local.ref?.(node)}
              nativeID={local.id ?? local.nativeID}
              focusable={false}
              class={paintClasses()}
              onPress={dismiss}
            />
            <View class={sheetCarrierClasses(ctx.placement())}>
              {renderSheetPartChildren(local.children)}
            </View>
          </View>
        </Dialog>
      </SheetSwipeDirectionContext.Provider>
    </If>
  );
}
