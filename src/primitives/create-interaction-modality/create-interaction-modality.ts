/*
 * There is no Kobalte primitive for this file: Kobalte relies on the browser's
 * `:focus-visible` and never tracks an interaction modality. This is the NSH
 * counterpart of React Aria's interaction modality store
 * (`@react-aria/interactions` `useFocusVisible` / `useInteractionModality`,
 * commit 675b4a11f4 of kobaltedev/kobalte's vendored react-spectrum tree),
 * rewritten for what NSH actually exposes:
 *
 * - a view hears presses (`onPressDown` / `onPress`) but has no `pointerdown`
 *   listener and no event for "the pointer went down anywhere";
 * - a view has no `keydown` listener at all; keys reach TypeScript through an
 *   input's `onKeyPress` or a `keymap.bind` command;
 * - focus on a view only arrives from the keyboard (Tab), because a click
 *   presses without focusing, and `focus-visible:` is the same as `focus:`.
 *   A text input is the exception: clicking it focuses it, so an input's
 *   `onFocus` does not prove the keyboard; wire its `onKeyPress` instead and
 *   leave `onFocus` to view focus stops, which a pointer press cannot focus.
 *
 * So the modality is tracked per owner from the events that owner receives,
 * not from document listeners. The root of a component wires its presses to
 * `setPointerModality`, its key commands / inputs to `setKeyboardModality`, and
 * its focus handler to `onFocus`, then reads `isKeyboard()` where a focus ring
 * should only show for keyboard navigation.
 */

import { type Accessor, computed, type PressEvent, signal } from "nsh";

/** How the user last interacted: `null` until the first interaction this owner saw. */
export type InteractionModality = "keyboard" | "pointer" | null;

/** What kind of pointer interacted, when the caller knows (NSH's `PressEvent` does not carry it). */
export type InteractionPointerType = "mouse" | "pen" | "touch" | null;

export interface CreateInteractionModalityProps {
  /** The modality before the user interacts (default `null`). */
  defaultModality?: Accessor<InteractionModality>;

  /** The pointer type before the user interacts (default `null`). */
  defaultPointerType?: Accessor<InteractionPointerType>;

  /**
   * Called when the modality becomes `keyboard` or `pointer`, never with the
   * same value twice in a row. A reset to `null` is not reported.
   */
  onChange?: (
    modality: Exclude<InteractionModality, null>,
    pointerType: InteractionPointerType,
  ) => void;
}

export interface InteractionModalityState {
  /** The last interaction's modality. */
  modality: Accessor<InteractionModality>;

  /** What kind of pointer interacted last, when known. */
  pointerType: Accessor<InteractionPointerType>;

  /** Whether the last interaction was the keyboard. */
  isKeyboard: Accessor<boolean>;

  /** Whether the last interaction was the pointer. */
  isPointer: Accessor<boolean>;

  /**
   * Records a pointer interaction (`onPressDown`, `onPress`, `onMouseEnter`).
   * `pointerType` defaults to `"mouse"`; a touch surface passes `"touch"`.
   */
  setPointerModality: (pointerType?: InteractionPointerType) => void;

  /**
   * Records a keyboard interaction (an input's `onKeyPress`, or an
   * `onKeyCommand` handler).
   */
  setKeyboardModality: () => void;

  /**
   * Records that the owner took the keyboard focus. Wire it on view focus
   * stops a pointer press cannot focus; for a text input use `onKeyPress`
   * (`setKeyboardModality`) instead, since a click focuses it too.
   */
  onFocus: () => void;

  /** Goes back to the default modality, as a closed layer does. */
  reset: () => void;
}

/**
 * Whether a press came from the keyboard (Return / Space activation) instead of
 * a pointer. React Aria's `useFocusVisible` sets the modality from the event
 * that caused it (`react-spectrum/packages/react-aria/src/interactions/
 * useFocusVisible.ts:86-100`); NSH's `PressEvent` has no `pointerType`, but a
 * keyboard activation reports `pagePosition` exactly `{ x: 0, y: 0 }` while a
 * real pointer press reports where it happened (measured headless and in
 * Chrome, research section 10 V4).
 */
export function isKeyboardPress(event: PressEvent): boolean {
  return event.pagePosition.x === 0 && event.pagePosition.y === 0;
}

/**
 * Tracks whether the user last interacted with the keyboard or the pointer, for
 * focus rings and other "keyboard only" affordances.
 */
export function createInteractionModality(
  props: CreateInteractionModalityProps = {},
): InteractionModalityState {
  const modality = signal<InteractionModality>(
    props.defaultModality?.() ?? null,
  );
  const pointerType = signal<InteractionPointerType>(
    props.defaultPointerType?.() ?? null,
  );

  const isKeyboard = computed(() => modality() === "keyboard");
  const isPointer = computed(() => modality() === "pointer");

  const change = (next: InteractionModality, nextPointerType: InteractionPointerType) => {
    pointerType.set(nextPointerType);

    if (modality() === next) {
      return;
    }

    modality.set(next);

    if (next !== null) {
      props.onChange?.(next, nextPointerType);
    }
  };

  const setPointerModality = (nextPointerType: InteractionPointerType = "mouse") => {
    change("pointer", nextPointerType ?? "mouse");
  };

  const setKeyboardModality = () => {
    change("keyboard", null);
  };

  const onFocus = () => {
    change("keyboard", null);
  };

  const reset = () => {
    change(props.defaultModality?.() ?? null, props.defaultPointerType?.() ?? null);
  };

  return {
    modality,
    pointerType,
    isKeyboard,
    isPointer,
    setPointerModality,
    setKeyboardModality,
    onFocus,
    reset,
  };
}
