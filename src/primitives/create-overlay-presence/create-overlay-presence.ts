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
  /** Whether the content is mounted (`isOpen || exiting || isExiting`). */
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

  const isPresent = computed(
    () => props.isOpen() || exiting() || forcedExiting(),
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
    let timer: number | undefined;

    if (skipNow) {
      hasOpened = hasOpened || open;
      enterStarted = false;
      exitStarted = false;
      entering.set(false);
      exiting.set(false);

      return;
    }

    if (open) {
      hasOpened = true;
      exitStarted = false;
      exiting.set(false);

      if (!enterStarted) {
        enterStarted = true;
        entering.set(true);
      }

      // R-005: the starting classes come off one frame after they are laid
      // out, which is what turns the change into a transition.
      frame = requestAnimationFrame(() => {
        enterStarted = false;
        entering.set(false);
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }

    entering.set(false);
    enterStarted = false;

    if (!hasOpened) {
      return;
    }

    if (!exitStarted) {
      exitStarted = true;
      exiting.set(true);
    }

    // R-010: hold the content for the exit, then release it. Reopening clears
    // this through the cleanup below and `open` above.
    timer = setTimeout(() => {
      exitStarted = false;
      exiting.set(false);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  });

  return { isPresent, isEntering, isExiting, finishEnter };
}
