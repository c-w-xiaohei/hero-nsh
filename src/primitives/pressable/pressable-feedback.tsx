/*
 * `PressableFeedback` — the component half of the press-feedback seam
 * (adapt-sheets/pressable-feedback.md §1, §2 A-003): an NSH `View` wired to
 * `createPressFeedback`, whose props are the upstream root's narrowed to what
 * NSH can host (`isDisabled`/`children`/`class`/`style`/`testID`/`nativeID`/
 * `onLayout`/`onPress`/`onPressDown`/`onPressUp`/`onLongPress`/`animation`/
 * `isAnimatedStyleActive`/`enabled` — no `hitSlop`, which the seam computes).
 *
 * The root's `enabled` defaults to `input() === "touch"` read once in the
 * component's owner scope: under the default pointer environment the gate is
 * closed, so the view is a plain press target with no hitSlop and no animated
 * channel — the desktop-zero-change half of the encapsulation model. An
 * `EnvironmentScope` (or a real touch host) opens it.
 *
 * `PressableFeedbackContext` is the library's usual `context<T>(default)` +
 * `.Provider` shape (`ButtonGroupContext`); it carries the canonical press
 * state the Scale/Highlight/Ripple parts read — a part outside a root gets
 * the default, which reports an unpressed, never-enabled seam.
 *
 * `asChild` is not implemented: NSH has no Slot/cloneElement. The composition
 * entry is `Scale`/`Highlight`/`Ripple` plus this context (sheet §5, §7).
 */

import {
  type Accessor,
  type Bounds,
  createAnimatedValue,
  type JSX,
  type PressEvent,
  type StyleProp,
  View,
  type ViewStyle,
  context,
  split,
} from "nsh";

import { createInput } from "../environment/create-input";
import {
  createPressFeedback,
  type PressFeedback,
} from "./press-feedback";
import { getRootAnimationState } from "./press-feedback-animation";
import type {
  PressableFeedbackCompound,
  PressableFeedbackContextValue,
  PressableFeedbackProps,
} from "./press-feedback-types";
import {
  PressableFeedbackHighlight,
  PressableFeedbackRipple,
  PressableFeedbackScale,
} from "./pressable-feedback-parts";

/** The seam's resting state: nothing pressed, nothing gated on, no slop. */
const RESTING_PRESS_FEEDBACK: PressableFeedbackContextValue = {
  isPressed: () => false,
  pressed: createAnimatedValue(0),
  bounds: () => ({ width: 0, height: 0 }),
  pressOrigin: () => null,
  scale: createAnimatedValue(1),
  highlightOpacity: createAnimatedValue(0),
  rippleProgress: createAnimatedValue(0),
  enabled: () => false,
  hitSlop: () => undefined,
  isAllAnimationsDisabled: () => false,
};

export const PressableFeedbackContext =
  context<PressableFeedbackContextValue>(RESTING_PRESS_FEEDBACK);

/**
 * `PressableFeedback` root: the `View` every press path flows through. Its
 * children sit inside `PressableFeedbackContext` so the parts read one
 * canonical state; `props.children` is read exactly once, inside the Provider
 * (the common-rules placement rule).
 */
function PressableFeedbackRoot(props: PressableFeedbackProps): JSX.Element {
  const [local, rest] = split(props, [
    "isDisabled",
    "children",
    "class",
    "style",
    "animation",
    "isAnimatedStyleActive",
    "enabled",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onLongPress",
    "onLayout",
    "ref",
  ] as const);

  // `createInput()` resolves against this component's owner, so a nested
  // `EnvironmentScope` the caller mounts wins — the same scope rule every
  // context-reading factory follows.
  const input = createInput();

  const gate: Accessor<boolean> = () =>
    local.enabled === undefined
      ? input() === "touch"
      : typeof local.enabled === "function"
        ? (local.enabled as Accessor<boolean>)()
        : local.enabled;

  const enabled = () => gate() && !(local.isDisabled ?? false);

  const {
    animationConfig: rootConfig,
    isAllAnimationsDisabled,
    isAnimationDisabled,
  } = getRootAnimationState(local.animation);

  const feedback = createPressFeedback({
    enabled,
    // The root's `animation.scale` configures the built-in scale channel
    // (`{ scale: {...} }` unwraps to the factory's scale animation);
    // `"disabled"`/`"disable-all"` pin it to 1 and stay off the style below.
    animation: rootConfig?.scale,
  });

  const contextValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled,
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => isAllAnimationsDisabled,
  };

  // `isAnimatedStyleActive` owns the channel entirely: while off, nothing
  // writes `style.scale` — the caller's `style` keeps the last word and never
  // races the animation (the two-writers ban, sheet §1 and action-list §4).
  const animatedStyleActive = () => local.isAnimatedStyleActive ?? true;

  const style = (): StyleProp<ViewStyle> => {
    const base = local.style;

    if (!animatedStyleActive() || isAnimationDisabled) {
      return base;
    }

    return [{ scale: feedback.scale }, base];
  };

  const handlePressDown = (event: PressEvent) => {
    feedback.pressDown(event);
    local.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    feedback.pressUp(event);
    local.onPressUp?.(event);
  };

  const handleLayout = (event: { bounds: Bounds }) => {
    feedback.layout(event);
    local.onLayout?.(event);
  };

  return (
    <PressableFeedbackContext.Provider value={contextValue}>
      <View
        {...rest}
        ref={(node) => local.ref?.(node)}
        class={local.class}
        style={style()}
        disabled={local.isDisabled ?? false}
        hitSlop={feedback.hitSlop()}
        onPress={local.onPress}
        onPressDown={handlePressDown}
        onPressUp={handlePressUp}
        onLongPress={local.onLongPress}
        onLayout={handleLayout}
      >
        {props.children}
      </View>
    </PressableFeedbackContext.Provider>
  );
}

/**
 * The compound part: `PressableFeedback` plus `Scale`, `Highlight` and
 * `Ripple`, the composition entry that replaces upstream's `asChild`.
 */
export const PressableFeedback = Object.assign(PressableFeedbackRoot, {
  Scale: PressableFeedbackScale,
  Highlight: PressableFeedbackHighlight,
  Ripple: PressableFeedbackRipple,
}) as PressableFeedbackCompound;

/** The factory's return type, re-exported next to the component it powers. */
export type { PressFeedback };
export type { PressableFeedbackContextValue };
