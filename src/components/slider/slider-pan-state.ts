/*
 * The slider's touch-claim ledger (adapt-sheets/slider.md §2 A-003 / A-004).
 *
 * Under a touch environment both drag views — Thumb and Track — mount a
 * `createPan` that claims on the first dominant move (`shouldClaim`). A bare
 * tap produces no move frame at all, so nothing claims it and the JS
 * responder chain (gated off under touch) cannot commit it either. The
 * tap-to-jump / tap compensation runs on `onTouchEnd`, but only when *this
 * touch* was never claimed by a pan — a claimed touch already committed its
 * release through `onDragEnd` → `handleRelease`.
 *
 * The ledger records claimed touches by `TouchPoint.identifier`, one entry
 * per finger, so a second finger does not inherit the first one's claim
 * (per-color-slider §7: a single boolean would false-positive on the second
 * touch of a two-finger gesture).
 *
 * It is a module-level shared set rather than a `SliderContextValue` field:
 * the sheet's conservative ruling keeps the context shape unchanged — a
 * touch inside the hitSlop overlap is always answered by exactly one pan
 * (deepest-view order puts the Thumb's above the Track's), so one ledger for
 * both parts suffices.
 */

/** Identifiers of the touches a Thumb or Track pan has claimed and not yet ended. */
const claimedTouches = new Set<number>();

/** A pan claimed this touch (`onDragStart`, after `beginDrag`/`beginJump` accepted it). */
export function claimSliderTouch(identifier: number): void {
  claimedTouches.add(identifier);
}

/** Whether a pan claims this touch — the `onTouchEnd` tap compensation must skip it. */
export function sliderTouchClaimed(identifier: number): boolean {
  return claimedTouches.has(identifier);
}

/** The touch ended or was cancelled: the ledger forgets it (`onTouchEnd` / `onTouchCancel`). */
export function releaseSliderTouch(identifier: number): void {
  claimedTouches.delete(identifier);
}
