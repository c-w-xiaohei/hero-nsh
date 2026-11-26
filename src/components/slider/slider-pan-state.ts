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
 * press-jump instead of the thumb's delta drag (the same mechanism the
 * color-slider fix measured: the track's pan claimed `app.drag("id:thumb")`
 * while the thumb's `panActive` stayed false).
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

/*
 * The identifier half of the same deferral (the color-slider ledger it
 * mirrors): the thumb's `onTouchStart` records the finger it answered, the
 * touch handlers forget it at end or cancel. The geometric half above is
 * only as reliable as the host's `locationX`/`pageX` spaces — Android's
 * touch-start `locationX` arrives in surface coordinates, so
 * `pageX - locationX` is 0 and the published frame sits in the wrong space
 * (the color-slider steal the Android CI run measured: the track claimed an
 * `app.drag("id:thumb")`). A finger whose `onTouchStart` the thumb answered
 * is inside its slop-expanded hit test by definition, so the track consults
 * this set first and the frame stays the second line of defense.
 */

/** Identifiers of the touches a thumb answered `onTouchStart` for and has not seen end or cancel. */
const thumbTouches = new Set<number>();

/** A thumb answered this finger's `onTouchStart`: it went down inside that thumb's hit test. */
export function markThumbTouch(identifier: number): void {
  thumbTouches.add(identifier);
}

/** Whether this finger went down inside a thumb's hit test (slop included). */
export function thumbTouch(identifier: number): boolean {
  return thumbTouches.has(identifier);
}

/** The touch ended or was cancelled: forget the thumb-down mark. */
export function releaseThumbTouch(identifier: number): void {
  thumbTouches.delete(identifier);
}
