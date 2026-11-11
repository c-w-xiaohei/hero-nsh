import type { JSX, PressEvent, ViewProps, ViewRef } from "nsh";
import { computed, effect, Overlay, signal, split, View } from "nsh";

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
 * The carrier's alignment inside the overlay layer (port sheet §3): the panel
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
 * Sheet.Backdrop / SheetBackdrop: the overlay layer and the backdrop paint
 * (R-001 … R-007, R-042).
 *
 * The layer is an `Overlay` (nsh's own Sheet is built the same way,
 * `nsh_el_overlay.md`), not nsh/base `Dialog`: see the note at the return. In
 * it the paint layer and the carrier are siblings, so a press on the panel
 * cannot reach the paint layer that dismisses. The paint layer decides between
 * the variant class and `SHEET_BACKDROP_UNPAINTED` from the stack index (R-005 /
 * R-006), the `isDismissable` gate is ours rather than the native one, and the
 * enter / exit completions are HeroUI's `onAnimationEnd` (port sheet §2).
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
  // keeps a misplaced part harmless instead of mounting a second layer.
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

  // The upstream `hasOpened` / `hasExited` pair: the layer stays mounted
  // through its exit and, with `isExiting`, after it. Without `isExiting` a
  // closed sheet drops its subtree, as upstream's `return null` does.
  //
  // `hasOpened` also gates the retention, as upstream's `retentionProps`
  // (`{isExiting: hasOpened && isExiting}`) does: a sheet that was never opened
  // has nothing to retain, and retaining it would keep a hidden layer in the
  // host's overlay order — measured on the web target, where a second,
  // never-opened `isExiting` sheet swallowed every press meant for the open
  // sheet below it.
  let opened = ctx.isOpen();

  const presence = createOverlayPresence({
    durationMs: () => SHEET_EXIT_HOLD_MS,
    isOpen: ctx.isOpen,
    isEntering: () => local.isEntering,
    isExiting: () => local.isExiting === true && opened,
  });

  // HeroUI's `hasExited`, set when the exit finished. `presence.isPresent()`
  // owns the retention: with `isExiting` the layer outlives its exit, and
  // dropping the prop releases it.
  const hasExited = signal(false);
  const isMounted = () => presence.isPresent() || !hasExited();

  /**
   * HeroUI's `onAnimationEnd`, in two halves.
   *
   * React Aria's enter / exit animations have no NSH counterpart (`Overlay`
   * has no animation of its own), so each transition is completed here: the
   * enter after its starting classes come off, the exit when its hold releases,
   * and an unmount in the middle of an exit completes it too, as upstream's
   * `SheetLifecycle` does when the tree goes away (T-028). A reopen cancels the
   * pending half without reporting it (T-028 / T-030); the flags keep one
   * report per transition.
   *
   * The presence's own phase is not the clock for this: a retained sheet keeps
   * `isExiting` forced while it is closed, so the phase never ends.
   */
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

  /**
   * A closed layer is mounted while the presence retains it, but it must not be
   * on screen and must not take presses: upstream does exactly that, hiding the
   * overlay with `inert` / `aria-hidden` and suspending it while `isExiting`
   * keeps it (`heroui/packages/react/src/components/sheet/sheet.tsx:229-271`).
   * `hidden` is `display: none`: the consumer's subtree and its state stay
   * mounted (a view keeps its component tree), and nothing there is laid out,
   * painted or hit-tested, so the page underneath stays reachable — which is
   * upstream's `inert` and the whole point of "modal behavior ends with
   * `isOpen`". A retained close therefore keeps the typed value and the "Open
   * sheet" button behind the closed sheet still presses.
   */
  const isHiddenLayer = () => !ctx.isOpen();

  const overlayClasses = computed(() =>
    // R-003: the overlay's `z-50` is not written; an overlay is drawn above the
    // views around it, and the slot only carries a caller's composition.
    // `inset-0` makes it the window-sized layer the paint and the carrier fill.
    [
      "inset-0 flex flex-col",
      slots().overlay(),
      isHiddenLayer() ? "hidden pointer-events-none" : "",
    ]
      .filter((part) => part !== "")
      .join(" "),
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
      closeByUser();
    }
  };

  /**
   * A dismissal (a press on the paint layer, Escape, the back button) completes
   * the exit at once: there is no scroll timeline to run, and the close the app
   * sees is the same change, so leaving it to the hold timer would report the
   * exit a frame late. An app-driven close still waits for the hold (the effect
   * above).
   */
  const closeByUser = () => {
    ctx.close();
    reportExit();
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

  /**
   * Escape and the back button come from the overlay, not from a native
   * dialog: `onCancel` is the top overlay listening, which is exactly the stack
   * order a sheet needs, and it takes the key from the pages below. Gated the
   * same way the native flags were (T-007 / T-021).
   */
  const cancel = () => {
    if (ctx.isOpen() && closesOnEscape()) {
      closeByUser();
    }
  };

  return (
    <If when={isMounted()}>
      <SheetSwipeDirectionContext.Provider value={swipeDirection()}>
        {/*
          A sheet is an overlay, not a modal window: nsh's own `Sheet` is an
          `Overlay` plus a screen-blocking paint layer too (`nsh_el_overlay.md`,
          "to block the screen behind a popup, put a second overlay under it …
          that is how Sheet … work"), and nsh/base `Dialog` cannot carry the
          retention contract: it releases its presented children as soon as
          `open` turns false (measured), and while presented it makes the whole
          window modal, so the page behind a *retained* sheet could not be
          pressed any more — upstream ends modal behavior with `isOpen`
          (`sheet.tsx`: "Modal behavior still ends with `isOpen`"). The overlay
          changes nothing about the visible contract: the paint layer below
          still dims and dismisses, `Sheet.Content` still sits on its edge, and
          the panel is still above the page for presses and layout.
        */}
        <If when={ctx.isNested()}>
          <View
            class={
              isHiddenLayer()
                ? "absolute inset-0 hidden pointer-events-none"
                : "absolute inset-0"
            }
          >
            {layer()}
          </View>
        </If>
        <If when={!ctx.isNested()}>
          <Overlay class={overlayClasses()} onCancel={cancel}>
            {layer()}
          </Overlay>
        </If>
      </SheetSwipeDirectionContext.Provider>
    </If>
  );
}
