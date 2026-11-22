/*
 * The touch-claim ledger the Thumb's and Track's `createPan` gestures share
 * (adapt sheet A-003 / A-004, §2 说明).
 *
 * A tap on a slider part produces no move frame, so the move-claim
 * `shouldClaim` never grants it to the pan — and under touch the bare
 * `onResponder*` chain is gated off. The parts' `onTouchEnd` handlers
 * therefore commit taps themselves, but only when the touch was not claimed
 * by a pan on its way: this set is how the tap compensation tells a real tap
 * (commit) from the end of a drag (the pan already committed it).
 *
 * Identifiers are added at `onDragStart` (the pan's grant) and removed by the
 * parts' touch handlers when that finger lifts or cancels. They are keyed by
 * `TouchPoint.identifier`, not a single flag, so a second finger resting on
 * the track cannot masquerade as unclaimed while the first still drags.
 */

const claimedTouches = new Set<number>();

/** Marks a finger as pan-held; the pan's `onDragStart` calls this once. */
export function claimSliderTouch(identifier: number): void {
  claimedTouches.add(identifier);
}

/** Whether the finger was granted to a slider pan since it went down. */
export function sliderTouchClaimed(identifier: number): boolean {
  return claimedTouches.has(identifier);
}

/**
 * Clears a finger's claim. The touch handlers call this on `onTouchEnd`
 * (after reading `sliderTouchClaimed`) and `onTouchCancel`; `onTouchStart`
 * clears a reused identifier before the next gesture asks for it.
 */
export function releaseSliderTouch(identifier: number): void {
  claimedTouches.delete(identifier);
}
