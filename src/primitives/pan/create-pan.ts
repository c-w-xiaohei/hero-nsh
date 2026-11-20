/*
 * `createPan` is the seam every new touch gesture goes through, and the only
 * place a gesture gate may live (mobile-port encapsulation §1 ②行为管线,
 * red line 4): a component that needs pan handlers spreads
 * `{...pan.panHandlers()}` on the view and never writes `PanResponder.create`
 * or a raw `onResponder*` predicate of its own.
 *
 * It wraps `PanResponder.create` and folds the three things a gesture needs
 * into accessors:
 *
 * - `panHandlers()` — the responder props for the gesture-holding view.
 *   `enabled()` is evaluated on every call and inside every callback, so a
 *   disabled pan resolves to an empty object (spread mounts no listener at
 *   all) and a mounted pan that turns off stops answering predicates; it is
 *   not a handler that stays and ignores. The gate is asymmetric on this
 *   host: a spread that mounted empty cannot gain listeners later (prop
 *   keys are fixed at mount), so `enabled` flipping on late only re-arms
 *   predicates that were mounted — a pan that must appear at runtime has
 *   to mount `enabled` from the start.
 * - `scrollProps()` — the props for the paired scroll view; today only
 *   `keyboardDismissMode`, empty when disabled or when no policy was given.
 * - `active()` — whether a gesture is claimed right now, for UI state.
 *
 * Claiming runs on `onMoveShouldSetPanResponder` / `…Capture` when a
 * `shouldClaim` predicate is given (the move decision is what a content
 * area needs to win touches over its own Scroll before the Scroll's native
 * claim), and on the `onStartShouldSetPanResponder` / `…Capture` pair when
 * it is not (press-and-claim semantics, the host default for a drag view).
 * `PanResponder`'s own move callbacks re-check `enabled()`, so an accessor
 * flip takes effect on the next event of the same gesture.
 *
 * `onDragEnd`'s third argument distinguishes the release from the
 * terminate: the responder system delivers both through the same end
 * channel a `PanEvent` reports as `cancelled`, and a release settles on a
 * snap point while a terminate cancels the drag back to rest.
 */

import { PanResponder, signal } from "nsh";
import type {
  Accessor,
  AnimatedValue,
  GestureResponderEvent,
  KeyboardDismissMode,
  PanActivation,
  PanEvent,
  ResponderGestureState,
  TouchProps,
} from "nsh";

/** The props `panHandlers()` spreads onto the gesture-holding view. */
export interface PanHandlers extends TouchProps {
  panActivation?: PanActivation;
  pan?: { x?: AnimatedValue; y?: AnimatedValue };
  onPanStart?: (e: PanEvent) => void;
  onPanEnd?: (e: PanEvent) => void;
}

/** The props `scrollProps()` spreads onto the paired scroll view. */
export interface PanScrollProps {
  keyboardDismissMode?: KeyboardDismissMode;
}

export interface CreatePanProps {
  /** Whether the gesture is attached. Reads per event, so flipping it gates the mounted pan. */
  enabled: Accessor<boolean>;

  /**
   * The move-time claim predicate, entered into the move responder pair.
   * Left out, the pan claims on press — the host's default for a drag view.
   */
  shouldClaim?: (e: GestureResponderEvent, g: ResponderGestureState) => boolean;

  /** The gesture was granted: the drag's first frame. */
  onDragStart?: (e: GestureResponderEvent, g: ResponderGestureState) => void;

  /** One frame of the drag, each move while the pan holds the touches. */
  onDrag?: (e: GestureResponderEvent, g: ResponderGestureState) => void;

  /**
   * The gesture ended: `terminated` is `false` on a release (settle where the
   * finger left it) and `true` on a terminate (another view or a native
   * gesture took the touches — cancel back to rest).
   */
  onDragEnd?: (
    e: GestureResponderEvent,
    g: ResponderGestureState,
    terminated: boolean,
  ) => void;

  /**
   * Another view asked for the touches mid-drag. The default keeps them
   * (`false`) — a claimed pan survives a scroll view's takeover request,
   * which is what the content-over-scroll claim is for; return `true` to
   * yield as the responder system otherwise does.
   */
  onTerminationRequest?: (e: GestureResponderEvent) => boolean;

  /** The native activation channel (`panActivation`): offset thresholds decided on the UI thread. */
  activation?: PanActivation;

  /** The UI-thread `pan` bindings toast / drawer consumers drive the AnimatedValues with. */
  pan?: { x?: AnimatedValue; y?: AnimatedValue };

  /** The `pan` channel's start / end events. `PanEvent.cancelled` marks a system cancel. */
  onPanStart?: (e: PanEvent) => void;
  onPanEnd?: (e: PanEvent) => void;

  /** The paired scroll view's keyboard policy, produced while the pan is enabled. */
  keyboardDismissMode?: KeyboardDismissMode;
}

/** What `createPan` returns. */
export interface Pan {
  /** Spread onto the view that holds the gesture: `{...pan.panHandlers()}` after the view's own props. */
  panHandlers: Accessor<PanHandlers>;

  /** Spread onto the scroll view the gesture pairs with (e.g. `Sheet.Body`'s `Scroll`). */
  scrollProps: Accessor<PanScrollProps>;

  /** Whether the pan currently holds a claimed gesture. */
  active: Accessor<boolean>;
}

export type PanProps = CreatePanProps;

/**
 * One gesture seam: claim, per-frame drag, and the release / terminate end,
 * all gated by `enabled`. See the file header for the seams and the claim
 * split.
 */
export function createPan(props: CreatePanProps): Pan {
  const active = signal(false);
  // `shouldClaim` decides on move — the content-over-scroll claim. Without it
  // the pan claims on press, as a drag handle does.
  const claimsOnMove = props.shouldClaim !== undefined;

  const end = (
    e: GestureResponderEvent,
    g: ResponderGestureState,
    terminated: boolean,
  ) => {
    // Only a gesture this pan granted ends here — a mounted-activation claim
    // with `enabled()` false never set `active`, so there is nothing to end.
    if (!active()) return;

    active.set(false);
    props.onDragEnd?.(e, g, terminated);
  };

  const responder = PanResponder.create({
    // Predicates re-read `enabled()` per event: a mounted pan whose
    // `enabled` accessor flipped stops claiming on the next touch.
    ...(claimsOnMove
      ? {
          onMoveShouldSetPanResponder: (e, g) =>
            props.enabled() && props.shouldClaim!(e, g),
          onMoveShouldSetPanResponderCapture: (e, g) =>
            props.enabled() && props.shouldClaim!(e, g),
        }
      : {
          onStartShouldSetPanResponder: () => props.enabled(),
          onStartShouldSetPanResponderCapture: () => props.enabled(),
          // Once a press claimed, the move pair keeps the gesture: a pan
          // claimed on press must not lose it to a child on the first frame.
          onMoveShouldSetPanResponder: () => props.enabled(),
          onMoveShouldSetPanResponderCapture: () => props.enabled(),
        }),
    // Lifecycle callbacks always run once the gesture is claimed — a gesture
    // that started must end even if `enabled` flipped mid-drag, or `active`
    // and the consumer's drag state would stick.
    //
    // The grant re-checks `enabled()` but not `shouldClaim`: the gesture
    // state's travel is reset at the grant on this host, so a displacement
    // predicate re-evaluated here reads a smaller move than the one that
    // claimed and vetoes its own claim — leaving the responder granted to a
    // view that reports nothing, a dead hold that steals the gesture from
    // the child that owned it (measured: a Handle drag stole one frame,
    // then cancelled). A `panActivation` grant that never asked the move
    // predicates is vetoed by `enabled()` alone; the direction conditions
    // `shouldClaim` carries must live in the activation offsets.
    onPanResponderGrant: (e, g) => {
      if (!props.enabled()) return;

      active.set(true);
      props.onDragStart?.(e, g);
    },
    // `active()` rather than `enabled()`: a legitimately claimed gesture
    // keeps reporting even if a signal inside `enabled` flips mid-drag (a
    // scroll offset leaving `atTop` is exactly that), and a claim the grant
    // vetoed reports nothing at all.
    onPanResponderMove: (e, g) => {
      if (!active()) return;

      props.onDrag?.(e, g);
    },
    onPanResponderRelease: (e, g) => end(e, g, false),
    onPanResponderTerminate: (e, g) => end(e, g, true),
    // A claimed pan keeps its touches: the responder system's default
    // (`true`) lets a Scroll view — even a `scrollable={false}` one — take a
    // JS-claimed gesture back on the next frame, which is what makes the
    // content-over-scroll claim meaningless. An explicit
    // `onTerminationRequest` is the opt-in back to yielding; a real system
    // cancel still arrives through `onPanResponderTerminate` either way.
    onPanResponderTerminationRequest: (e) =>
      props.onTerminationRequest?.(e) ?? false,
    // Keep native scroll views from taking the touches back once the claim
    // lands (the responder grant's documented contract): without it the
    // host hands a JS-claimed gesture to the Scroll on the next frame.
    onShouldBlockNativeResponder: () => true,
  });

  const panHandlers = (): PanHandlers => {
    if (!props.enabled()) {
      // Nothing to spread: the view mounts no responder path at all.
      return {};
    }

    return {
      ...responder.panHandlers,
      ...(props.activation !== undefined ? { panActivation: props.activation } : {}),
      ...(props.pan !== undefined ? { pan: props.pan } : {}),
      ...(props.onPanStart !== undefined ? { onPanStart: props.onPanStart } : {}),
      ...(props.onPanEnd !== undefined ? { onPanEnd: props.onPanEnd } : {}),
    };
  };

  const scrollProps = (): PanScrollProps =>
    props.enabled() && props.keyboardDismissMode !== undefined
      ? { keyboardDismissMode: props.keyboardDismissMode }
      : {};

  return { panHandlers, scrollProps, active };
}
