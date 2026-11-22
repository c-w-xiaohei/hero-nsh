/*
 * The swipe-dismiss numeric policies of the toast (adapt sheet A-001), kept
 * free of any host — like `sheet.utils.ts` — so a test can drive them without
 * mounting a view.
 *
 * Upstream for the gesture itself is heroui-native's `toast.animation.ts`:
 * a vertical pan on every toast, direct translation toward the dismiss edge,
 * a 40-point rubber band against it, dismissal past 50 points of travel or
 * 500 points per second of release velocity. Where that file animates the
 * toast off-screen with `withDecay`, the port freezes the release offset and
 * lets the existing exit transition carry the row out, so the release values
 * these helpers decide are all that reach the view.
 */

/** Native `dismissThreshold`: travel past which the release closes the toast. */
export const TOAST_DISMISS_DISTANCE = 50;

/** Native `velocityThreshold`: release velocity past which the swipe closes the toast. */
export const TOAST_DISMISS_VELOCITY = 500;

/** Native `rubberEffectDistance`: the counter-direction travel cap. */
export const TOAST_RUBBER_MAX = 40;

/**
 * The screen direction the dismiss swipe takes: `-1` (up) for a `top` edge,
 * `+1` (down) for `bottom` (placement defaults to `bottom`). The horizontal
 * alignment is normalized away — `top start`, `top` and `top end` all dismiss
 * upward — so the sign reads the same provider edge the stack renders against.
 */
export function toastSwipeSign(placement: string | undefined): -1 | 1 {
  return placement !== undefined && placement.startsWith("top") ? -1 : 1;
}

/**
 * The counter-direction travel's visual offset. Native interpolates the drag
 * over the screen height onto 40 points and clamps; the rubber band therefore
 * slows with distance and stops dead at `TOAST_RUBBER_MAX`. `travel` is the
 * drag's magnitude against the dismiss direction (positive), `maxDistance`
 * the screen's length on the swipe axis.
 */
export function toastRubberOffset(travel: number, maxDistance: number): number {
  const distance = Math.abs(travel);

  if (distance === 0 || !(maxDistance > 0)) {
    return 0;
  }

  return Math.min(TOAST_RUBBER_MAX, (distance * TOAST_RUBBER_MAX) / maxDistance);
}

/**
 * Whether the release dismisses the toast. The dismiss direction is read off
 * the travel itself, exactly as native reads `translationY`'s sign — a
 * velocity-only check would dismiss a release whose finger travelled
 * backwards at speed, which native sends back to rest. `travel` and
 * `velocity` are signed along the swipe axis (multiplied by `toastSwipeSign`
 * at the call site): travel positive means toward the edge.
 */
export function toastDismissTarget(travel: number, velocity: number): boolean {
  return (
    travel > 0 &&
    (travel > TOAST_DISMISS_DISTANCE || Math.abs(velocity) > TOAST_DISMISS_VELOCITY)
  );
}
