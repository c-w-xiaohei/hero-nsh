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

/*
 * The thumb's slop-expanded hit area in surface (`pageX`/`pageY`)
 * coordinates, published by the thumb's `onTouchStart` — the one handler
 * guaranteed to run at finger-down, before any move-frame claim, and not
 * again while the finger is held, so the frame stays fixed for the gesture
 * that consults it.
 *
 * The track's `shouldClaim` consults it because the responder system's move
 * negotiation asks ancestor capture predicates before the target's own
 * (`onMoveShouldSetResponderCapture` walks outside-in, and it keeps asking
 * on every move frame): a drag that went down inside the thumb's hit area —
 * bounds plus `hitSlop`, whose expansion is itself part of the thumb's hit
 * test — would otherwise be stolen by the track's claim and committed as a
 * press-jump instead of the thumb's delta drag (measured on the headless
 * host: the track's pan claimed `app.drag("id:thumb")` while the thumb's
 * `panActive` stayed false).
 *
 * The check is geometric rather than an id comparison (`GestureResponderEvent
 * .target` is a numeric id a part cannot read its own side of), so it also
 * defers touches that went down on a view inside the thumb.
 */

let thumbHitArea: {
  x: number;
  y: number;
  width: number;
  height: number;
} | null = null;

/** Registers the thumb's slop-expanded frame in surface coordinates until touch end, cancel or unmount. */
export function setThumbHitArea(
  area: { x: number; y: number; width: number; height: number } | null,
): void {
  thumbHitArea = area;
}

/** Whether a surface-space point (`event.pageX - gesture.dx` of a claim) fell inside the thumb's expanded hit area. */
export function insideThumbHitArea(x: number, y: number): boolean {
  return (
    thumbHitArea !== null &&
    x >= thumbHitArea.x &&
    x <= thumbHitArea.x + thumbHitArea.width &&
    y >= thumbHitArea.y &&
    y <= thumbHitArea.y + thumbHitArea.height
  );
}
