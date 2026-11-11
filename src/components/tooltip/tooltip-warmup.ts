/*
 * The shared half of React Aria's tooltip state machine
 * (`@react-stately/tooltip` `useTooltipTriggerState.ts`), ported from Kobalte's
 * `tooltip-root.tsx` (`tooltips`, `globalWarmedUp`, the cooldown timer).
 *
 * It lives at module level on purpose, and in this component's directory
 * (port sheet §5.4): "only one tooltip is open at a time" and "moving quickly
 * from one target to the next shows the next one without waiting for the
 * delay" are behaviors of the family, not of one instance. Written as a
 * primitive it would be one registry per instance and the behavior would be
 * lost. Nothing here is exported from the package: it holds no public state,
 * only the registry and the warm flag.
 */

/** The open tooltips, by id, each able to close itself at once. */
const openTooltips = new Map<number, () => void>();

let counter = 0;

/** React Aria's `globalWarmedUp`: a tooltip opened recently. */
let warmedUp = false;
let coolDownTimer: number | undefined;

/** A stable id for one root, used to find its entry among the open tooltips. */
export function nextTooltipId(): number {
  counter += 1;

  return counter;
}

/** Registers an open tooltip, so opening another one can close it at once. */
export function registerTooltip(id: number, close: () => void): void {
  openTooltips.set(id, close);
}

/** Drops a tooltip's entry: it closed, or its root unmounted. */
export function unregisterTooltip(id: number): void {
  openTooltips.delete(id);
}

/**
 * React Aria's `closeOpenTooltips`: only one tooltip shows at a time, so the
 * root that is opening closes every other one immediately, without an exit
 * animation (port sheet §5.4).
 */
export function closeOtherTooltips(id: number): void {
  for (const [otherId, close] of [...openTooltips]) {
    if (otherId === id) {
      continue;
    }

    openTooltips.delete(otherId);
    close();
  }
}

/** Whether a tooltip opened recently enough that the next one skips its delay. */
export function isTooltipWarmedUp(): boolean {
  return warmedUp;
}

/** Marks the family as warm, as React Aria does whenever a tooltip opens. */
export function warmUpTooltips(): void {
  warmedUp = true;

  if (coolDownTimer !== undefined) {
    clearTimeout(coolDownTimer);
    coolDownTimer = undefined;
  }
}

/**
 * React Aria's cooldown: after this long without a tooltip the next one waits
 * for the delay again (`max(500, closeDelay)`). Only a warm family cools down.
 */
export function scheduleTooltipCoolDown(delayMs: number): void {
  if (!warmedUp) {
    return;
  }

  if (coolDownTimer !== undefined) {
    clearTimeout(coolDownTimer);
  }

  coolDownTimer = setTimeout(() => {
    coolDownTimer = undefined;
    warmedUp = false;
  }, delayMs);
}
