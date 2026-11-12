/*
 * No Kobalte counterpart: Kobalte delegates open/close presence to
 * `solid-presence`, and HeroUI to React Aria's `useEnterAnimation` /
 * `useExitAnimation` (`packages/react/src/utils/use-overlay-exit-hold.ts`),
 * both of which observe real animation events. NSH has no `animationstart` /
 * `animationend` event and no computed style, so this primitive reproduces the
 * contract with what NSH does have: a frame boundary and a timer.
 *
 * The contract, from HeroUI's popover CSS (`packages/styles/components/
 * popover.css`):
 * - enter: 150ms from `opacity: 0; transform: scale(0.9)` (+ a 0.25rem
 *   translation by placement) to the resting state;
 * - exit: 100ms to `opacity: 0; transform: scale(0.95)`, keeping the content
 *   mounted for that time;
 * - reopening during the exit cancels it without rebuilding the content.
 */

import type { Accessor } from "nsh";
import { computed, effect, signal } from "nsh";

export interface CreateOverlayPresenceProps {
  /** The open state the presence follows. */
  isOpen: Accessor<boolean>;

  /** How long the exit keeps the content mounted (default 100ms, R-010). */
  durationMs?: Accessor<number | undefined>;

  /**
   * `shouldSkipAnimation`: no enter and no exit phase, so a close unmounts at
   * once. A reopen while mounted plays no enter animation either.
   */
  skip?: Accessor<boolean | undefined>;

  /** A caller forcing the enter state (`isEntering` prop). */
  isEntering?: Accessor<boolean | undefined>;

  /** A caller forcing the exit state and keeping the content (`isExiting` prop). */
  isExiting?: Accessor<boolean | undefined>;
}

export interface CreateOverlayPresenceResult {
  /**
   * Whether the content is mounted: open, or held from the moment it opened
   * until the exit hold ends (never re-derived from `isOpen` alone, so the
   * close cannot drop the subtree before the exit classes are applied).
   */
  isPresent: Accessor<boolean>;

  /** Whether the enter starting classes apply. */
  isEntering: Accessor<boolean>;

  /** Whether the exit classes apply. */
  isExiting: Accessor<boolean>;

  /** Ends the enter phase now, instead of on the next frame. */
  finishEnter: () => void;
}

export function createOverlayPresence(
  props: CreateOverlayPresenceProps,
): CreateOverlayPresenceResult {
  const skip = () => props.skip?.() === true;
  const forcedEntering = () => props.isEntering?.() === true;
  const forcedExiting = () => props.isExiting?.() === true;

  // The first render must already carry the enter starting classes, before any
  // effect runs: a frame-based effect would paint the resting state once.
  const entering = signal(props.isOpen() && !skip() && !forcedExiting());
  const exiting = signal(false);

  // `held` is what keeps the subtree mounted across a close. It goes true while
  // the content is open (an effect, so before any close can arrive) and only
  // goes false when the exit hold ends. Deriving presence from it directly,
  // instead of from `exiting`, is what makes the close atomic: `isOpen` turning
  // false leaves `held` already true, so the same render keeps the one Overlay
  // and Dialog subtree and the exit classes land on the node that is on screen.
  // HeroUI does the same synchronously during render in `useOverlayExitHold`
  // (`packages/react/src/utils/use-overlay-exit-hold.ts`: `isOpen !== prevOpen`
  // sets `isExiting` in the same render pass).
  const held = signal(props.isOpen());

  const isPresent = computed(
    () => props.isOpen() || forcedExiting() || (!skip() && held()),
  );

  const isEntering = computed(
    () => forcedEntering() || (!skip() && entering()),
  );

  const isExiting = computed(
    () => forcedExiting() || (!skip() && exiting()),
  );

  const finishEnter = () => {
    entering.set(false);
  };

  // Plain flags, not signals: the effect decides what to schedule, and reading
  // its own output signals would make it rerun on every phase change.
  let hasOpened = props.isOpen();
  let enterStarted = props.isOpen() && !skip() && !forcedExiting();
  let exitStarted = false;

  effect(() => {
    const open = props.isOpen();
    const skipNow = skip();
    const duration = props.durationMs?.() ?? 100;

    let frame: number | undefined;
    let inner: number | undefined;
    let timer: number | undefined;

    if (skipNow) {
      hasOpened = hasOpened || open;
      enterStarted = false;
      exitStarted = false;
      entering.set(false);
      exiting.set(false);
      held.set(false);

      return;
    }

    if (open) {
      hasOpened = true;
      exitStarted = false;
      exiting.set(false);

      // A reopen during the exit hold finds the content still mounted, so it
      // plays no enter phase: React Aria's `useEnterAnimation` only runs on a
      // mount, and the retained node already has a state to transition from.
      const wasMounted = held();

      held.set(true);

      if (!enterStarted && !wasMounted) {
        enterStarted = true;
        entering.set(true);
      }

      // R-005: the starting classes come off after the off-screen state has
      // been painted, which is what turns the change into a transition. The
      // first frame can still be the one that paints the mount, so the second
      // one is where the flip is safe on every host.
      frame = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          enterStarted = false;
          entering.set(false);
        });
      });

      return () => {
        cancelAnimationFrame(frame);
        if (inner !== undefined) cancelAnimationFrame(inner);
      };
    }

    entering.set(false);
    enterStarted = false;

    if (!hasOpened) {
      held.set(false);

      return;
    }

    if (!exitStarted) {
      exitStarted = true;
      exiting.set(true);
    }

    // R-010: hold the content for the exit, then release it. Reopening clears
    // this through the cleanup below and `open` above; `held` stays true across
    // the whole hold so the subtree is never rebuilt.
    timer = setTimeout(() => {
      // Release the mount before the classes: the node goes away in the same
      // commit, so the exit fill cannot paint the resting opacity for a frame
      // (HeroUI pins the opacity for the same reason in `useOverlayExitHold`).
      exitStarted = false;
      held.set(false);
      exiting.set(false);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  });

  return { isPresent, isEntering, isExiting, finishEnter };
}
