import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { computed, effect, reduceMotion, signal, split, View } from "nsh";
import { Dialog } from "nsh/base";

import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { SheetPhase } from "./sheet-context";
import {
  SheetContext,
  SheetPhaseContext,
  SheetSwipeDirectionContext,
} from "./sheet-context";
import { viewProps } from "./sheet-dom-props";
import { renderSheetPartChildren } from "./sheet-part-children";
import type { SheetPlacement, SheetSwipeDirection, SheetVariants } from "./sheet.styles";
import { SHEET_BACKDROP_UNPAINTED, sheetVariants } from "./sheet.styles";

/**
 * The exit hold, in milliseconds: one display frame. See the note at the
 * presence call — the exit this side can observe is a frame boundary.
 */
const SHEET_EXIT_HOLD_MS = 16;

/**
 * How many display frames the enter takes before it completes.
 *
 * HeroUI's overlay enters over 150ms, which NSH's hosts do not report; a frame
 * is the boundary the presence primitive already uses for the enter's starting
 * classes. Nine frames, not one: the completion has to land after the turn that
 * cancels it, so an opening that closes on the next turn reports only its exit
 * (T-029 / T-030), while a sheet that stays open still reports its enter within
 * the turn that opened it (T-011).
 */
const SHEET_ENTER_FRAMES = 9;

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

  /**
   * HeroUI's `isDismissable` is React Aria's `preventDismissal`, and that one
   * disables BOTH dismissals: `react-spectrum/packages/react-aria-components/
   * src/Sheet.tsx` spreads it into `isDismissable={!preventDismissal}` and
   * `isKeyboardDismissDisabled={preventDismissal}`. A sheet with
   * `isDismissable={false}` therefore ignores Escape as well (T-007 / T-021),
   * on top of the caller's own `isKeyboardDismissDisabled`.
   */
  const closesOnEscape = () => isDismissable() && !local.isKeyboardDismissDisabled;

  // HeroUI hands the Handle the overlay's own `swipeDirection` (a placement or
  // a whole axis), falling back to the placement (port sheet §2).
  const swipeDirection = (): SheetSwipeDirection => local.swipeDirection ?? ctx.placement();

  // The upstream `hasOpened` / `hasExited` pair: the dialog stays mounted
  // through its exit and, with `isExiting`, after it. Without `isExiting` a
  // closed sheet drops its subtree, as upstream's `return null` does.
  const presence = createOverlayPresence({
    durationMs: () => SHEET_EXIT_HOLD_MS,
    isOpen: ctx.isOpen,
    isEntering: () => local.isEntering,
    isExiting: () => local.isExiting,
  });

  // HeroUI's `hasExited`, set when the exit finished. `presence.isPresent()`
  // owns the retention: with `isExiting` the dialog outlives its exit, and
  // dropping the prop releases it.
  const hasExited = signal(false);
  const isMounted = () => presence.isPresent() || !hasExited();

  /**
   * HeroUI's `onAnimationEnd`, in two halves.
   *
   * The native layer reports its enter through `onOpen` (`Dialog`'s "it
   * finished appearing"), but an app-driven `open={false}` reaches it as a
   * state change rather than as a dismissal, and the host reports no `onClose`
   * for it (measured on the headless engine: a sheet closed through `isOpen`
   * stayed at `[true]` for T-024, while T-011's Escape — a native dismissal —
   * did report `false`). React Aria's enter / exit animations have no NSH
   * counterpart either, so each transition is completed here instead: the
   * enter after its starting classes come off, the exit when its hold releases,
   * and an unmount in the middle of an exit completes it too, as upstream's
   * `SheetLifecycle` does when the tree goes away (T-028). A reopen cancels the
   * pending half without reporting it (T-028 / T-030); the flags keep one
   * report per transition.
   *
   * The presence's own phase is not the clock for this: a retained sheet keeps
   * `isExiting` forced while it is closed, so the phase never ends.
   */
  let opened = ctx.isOpen();
  let enterReported = false;
  let exitReported = false;
  let enterFrame: number | undefined;
  let exitTimer: number | undefined;

  const cancelEnter = () => {
    if (enterFrame !== undefined) cancelAnimationFrame(enterFrame);

    enterFrame = undefined;
  };

  const cancelExit = () => {
    if (exitTimer !== undefined) clearTimeout(exitTimer);

    exitTimer = undefined;
  };

  const reportExit = () => {
    if (exitReported) return;

    exitReported = true;
    hasExited.set(true);
    ctx.animationEnd(false);
  };

  effect(() => {
    const open = ctx.isOpen();

    if (open) {
      opened = true;
      cancelExit();
      exitReported = false;
      hasExited.set(false);

      if (!enterReported) {
        enterReported = true;

        let frames = 0;
        const tick = () => {
          frames += 1;

          if (frames >= SHEET_ENTER_FRAMES) {
            enterFrame = undefined;
            ctx.animationEnd(true);

            return;
          }

          enterFrame = requestAnimationFrame(tick);
        };

        enterFrame = requestAnimationFrame(tick);
      }

      return;
    }

    cancelEnter();
    enterReported = false;

    // A sheet that never opened has nothing to report, and one whose exit is
    // already scheduled or reported keeps that single completion.
    if (!opened || exitReported || exitTimer !== undefined) return;

    exitTimer = setTimeout(() => {
      exitTimer = undefined;
      reportExit();
    }, SHEET_EXIT_HOLD_MS);
  });

  // Unmounting during the exit completes it: the content the exit was holding
  // is gone, which is what upstream's `onExitComplete` reports when the tree
  // releases mid-animation (T-028's unmount case).
  effect(() => () => {
    const wasExiting = opened && !ctx.isOpen() && exitTimer !== undefined;

    cancelEnter();
    cancelExit();

    if (wasExiting) reportExit();
  });

  // HeroUI's render props read `isEntering` / `isExiting` off React Aria's
  // `SheetOverlay`, which is this dialog: the presence is the same phase the
  // Backdrop mounts and retains by, so it is published here for `Sheet.Content`
  // (port sheet §2). Built once — the accessors inside it are what updates.
  const phase: SheetPhase = {
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
  };

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

  /**
   * The layer's inside: the paint and the carrier. A function because each
   * branch below places it once (the children read happens at its placement).
   */
  const layer = () => (
    <SheetPhaseContext.Provider value={phase}>
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
    </SheetPhaseContext.Provider>
  );

  return (
    <If when={isMounted()}>
      <SheetSwipeDirectionContext.Provider value={swipeDirection()}>
        {/*
          A sheet opened from inside another one is not a second native Dialog:
          the host presents one modal layer per window, and a nested one opened
          its state without ever showing a panel (measured on T-010 / T-023 —
          the trigger toggled, the mounted layer never saw it). It draws as the
          parent dialog's own overlay layer instead, which is what a sheet
          inside a sheet looks like anyway.
        */}
        <If when={ctx.isNested()}>
          <View class="absolute inset-0">{layer()}</View>
        </If>
        <If when={!ctx.isNested()}>
          <Dialog
            open={ctx.isOpen()}
            // R-042: `prefers-reduced-motion` → no animation at all, the same
            // ruling as Modal. R-001's swipe-progress fade has no timeline here;
            // the native fade is what the backdrop gets.
            animation={reduceMotion() ? "none" : "fade"}
            closeOnBackdropPress={false}
            // Escape and the Android back button, unless the caller disabled
            // them (`isKeyboardDismissDisabled`) or the sheet is not dismissable
            // at all; port sheet §1.1, T-007 / T-021.
            closeOnEscape={closesOnEscape()}
            // The handle drag is the sheet's swipe here, and it settles through
            // `sheetDismissTarget` before closing; the host's own gesture cannot
            // tell the panel from the Body inside it, so a drag in the Body (a
            // scroll area, T-020) would dismiss the sheet. Off, with the drag
            // channel the only swipe (port sheet §8).
            closeOnSwipe={false}
            // A reopen clears `hasExited`, as upstream does during render; the
            // report itself is the effect's enter.
            onOpen={() => {
              hasExited.set(false);
            }}
            // HeroUI's `onAnimationEnd(false)` through a native dismissal (Escape,
            // the back button, a swipe the host played): it arrives at once, so
            // the exit is complete. An app-driven close is the effect's exit.
            onClose={() => {
              reportExit();
            }}
            onOpenChange={(event) => {
              if (!event.open) {
                ctx.close();
              }
            }}
            class={overlayClasses()}
          >
            {layer()}
          </Dialog>
        </If>
      </SheetSwipeDirectionContext.Provider>
    </If>
  );
}
