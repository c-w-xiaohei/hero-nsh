/*
 * `PressableFeedback.Scale` / `.Highlight` / `.Ripple` — the compound parts of
 * the press-feedback seam (adapt-sheets/pressable-feedback.md §2 A-004). Each
 * reads `PressableFeedbackContext` and owns exactly one animation channel:
 *
 * - **`Scale`** drives a `scale` AnimatedValue toward `1 - (1 - value) *
 *   coefficient` while the root is pressed — the same width-coefficient
 *   formula the factory's default channel uses (`300 / width`, unclamped).
 * - **`Highlight`** fades an `absolute inset-0 pointer-events-none` overlay's
 *   `opacity` to the pressed end (`[0, 0.1]` by default).
 * - **`Ripple`** runs a single `progress` channel — 0→1 while the press
 *   expands from `pressOrigin`, →2 on release/cancel (expand + fade) — and
 *   derives `opacity`/`scale` as `progress.interpolate` nodes, the NSH
 *   equivalent of upstream's two-layer SharedValue ripple reduced to one
 *   layer (sheet §7).
 *
 * Every part resolves its own `animation` + the root's cascaded
 * `"disable-all"` + `reduceMotion()` into one disable flag: a disabled or
 * reduced channel holds its resting value instead of animating.
 * `isAnimatedStyleActive={false}` detaches the channel from the style, so a
 * caller's own `scale`/`opacity` never shares a channel with the animation —
 * the two-writers ban of action-list §4.
 */

import {
  type AnimatedValue,
  computed,
  createAnimatedValue,
  effect,
  type JSX,
  type Point,
  reduceMotion,
  signal,
  split,
  type StyleProp,
  type TimingConfig,
  View,
  type ViewStyle,
} from "nsh";

import { themeToken } from "../../theme";
import {
  getAnimationState,
  getAnimationValueMergedConfig,
  getAnimationValueProperty,
  getIsAnimationDisabledValue,
} from "./press-feedback-animation";
import type {
  PressableFeedbackHighlightProps,
  PressableFeedbackRippleProps,
  PressableFeedbackScaleProps,
} from "./press-feedback-types";
import { PressableFeedbackContext } from "./pressable-feedback";

const SCALE_COEFFICIENT_BASE = 300;
const RIPPLE_BASE_DIAGONAL = 450;
const RIPPLE_BASE_DURATION = 1000;
const RIPPLE_MIN_BASE_DURATION = 750;
const RIPPLE_CIRCLE_FACTOR = 1.25;

/**
 * Drives an animated channel by a computed target: retargets the timing when
 * the press, the layout or the reduce-motion preference changes, and holds
 * the resting value while `disabled`. `rest` is where a disabled channel
 * sits — scale rests at 1, overlays at 0. The `AnimatedValue` itself is the
 * caller's: the parts drive the root-owned channels so `viewStyle`-blind
 * hosts can probe them through the context.
 */
function driveFeedbackChannel(
  value: AnimatedValue,
  options: {
    target: () => number;
    timing: () => TimingConfig;
    disabled: () => boolean;
    rest: number;
  },
): void {
  effect(() => {
    if (options.disabled()) {
      value.set(options.rest);
      return;
    }

    if (reduceMotion()) {
      value.set(options.target());
      return;
    }

    void value.timing(options.target(), options.timing()).catch(() => undefined);
  });
}

/**
 * `PressableFeedback.Scale` — the container a caller wraps around the element
 * it wants to shrink under the press. Read from the root's context, so it
 * must sit inside a `PressableFeedback` (outside one it rests at scale 1).
 */
export function PressableFeedbackScale(
  props: PressableFeedbackScaleProps,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "class",
    "style",
    "animation",
    "isAnimatedStyleActive",
    "ref",
  ] as const);

  const ctx = PressableFeedbackContext();

  const { animationConfig, isAnimationDisabled } = getAnimationState(
    local.animation,
  );

  const scaleValue = getAnimationValueProperty(
    animationConfig,
    "value",
    0.985,
  );
  const scaleTiming = getAnimationValueMergedConfig(
    animationConfig,
    "timingConfig",
    {
      duration: 300,
      easing: [0, 0, 0.58, 1] as [number, number, number, number],
    } as TimingConfig,
  );
  const ignoreScaleCoefficient = getAnimationValueProperty(
    animationConfig,
    "ignoreScaleCoefficient",
    false,
  );

  const disabled = () =>
    getIsAnimationDisabledValue({
      isAnimationDisabled,
      isAllAnimationsDisabled: ctx.isAllAnimationsDisabled(),
    });

  const scale = createAnimatedValue(1);
  driveFeedbackChannel(scale, {
    target: () => {
      if (!ctx.isPressed()) {
        return 1;
      }

      const width = ctx.bounds().width;
      const coefficient = ignoreScaleCoefficient
        ? 1
        : width > 0
          ? SCALE_COEFFICIENT_BASE / width
          : 1;

      return 1 - (1 - scaleValue) * coefficient;
    },
    timing: () => scaleTiming,
    disabled,
    rest: 1,
  });

  const style = (): StyleProp<ViewStyle> => {
    if ((local.isAnimatedStyleActive ?? true) === false || disabled()) {
      return local.style;
    }

    return [{ scale }, local.style];
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={local.class}
      style={style()}
    >
      {props.children}
    </View>
  );
}

/**
 * `PressableFeedback.Highlight` — the iOS-style dim overlay: an `inset-0`
 * view that ignores presses and fades to its pressed opacity on `isPressed`.
 */
export function PressableFeedbackHighlight(
  props: PressableFeedbackHighlightProps,
): JSX.Element {
  const [local, rest] = split(props, [
    "class",
    "style",
    "animation",
    "isAnimatedStyleActive",
    "ref",
  ] as const);

  const ctx = PressableFeedbackContext();

  const { animationConfig, isAnimationDisabled } = getAnimationState(
    local.animation,
  );

  const opacityValues = getAnimationValueProperty(
    animationConfig?.opacity,
    "value",
    [0, 0.1] as [number, number],
  );
  const opacityTiming = getAnimationValueMergedConfig(
    animationConfig?.opacity,
    "timingConfig",
    { duration: 200 },
  );
  const disabled = () =>
    getIsAnimationDisabledValue({
      isAnimationDisabled,
      isAllAnimationsDisabled: ctx.isAllAnimationsDisabled(),
    });

  const opacity = ctx.highlightOpacity;
  driveFeedbackChannel(opacity, {
    target: () => (ctx.isPressed() ? opacityValues[1] : opacityValues[0]),
    timing: () => opacityTiming,
    disabled,
    rest: opacityValues[0],
  });

  const style = (): StyleProp<ViewStyle> => {
    const backgroundColor = getAnimationValueProperty(
      getAnimationState(local.animation).animationConfig?.backgroundColor,
      "value",
      themeToken("foreground"),
    );
    if ((local.isAnimatedStyleActive ?? true) === false) {
      return [{ backgroundColor }, local.style];
    }

    // `disabled()` still binds `opacity`: the drive pins the channel at its
    // resting value, so the overlay sits invisible at rest instead of
    // falling back to the view's default opacity 1.
    return [{ backgroundColor, opacity }, local.style];
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={local.class}
      style={[
        {
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          pointerEvents: "none",
        },
        style(),
      ]}
    />
  );
}

/**
 * `PressableFeedback.Ripple` — the Android-style expanding circle: a radial
 * gradient centered on the press point whose `progress` runs 0→1 while the
 * press is held and →2 when it ends (end and cancel share `onPressUp` — the
 * same canonical rule the factory follows).
 */
export function PressableFeedbackRipple(
  props: PressableFeedbackRippleProps,
): JSX.Element {
  const [local, rest] = split(props, [
    "class",
    "style",
    "animation",
    "isAnimatedStyleActive",
    "ref",
    "testID",
  ] as const);

  const ctx = PressableFeedbackContext();

  const { animationConfig, isAnimationDisabled } = getAnimationState(
    local.animation,
  );

  const disabled = () =>
    getIsAnimationDisabledValue({
      isAnimationDisabled,
      isAllAnimationsDisabled: ctx.isAllAnimationsDisabled(),
    });

  const opacityValues = getAnimationValueProperty(
    animationConfig?.opacity,
    "value",
    [0, 0.1, 0] as [number, number, number],
  );
  const scaleValues = getAnimationValueProperty(
    animationConfig?.scale,
    "value",
    [0, 1, 1] as [number, number, number],
  );

  const progress = ctx.rippleProgress;
  const origin = signal<Point>({ x: 0, y: 0 });
  // Mount runs the press effect once with `pressOrigin` null — the release
  // branch must not fire there; it only fires after a press that started.
  let wasPressed = false;

  // The diagonal-adjusted segment duration, upstream's
  // `getAdjustedDuration()` (base 1000 over a 450 pt diagonal, bounded at
  // 750..2000 ms).
  const segmentDuration = () => {
    const base = getAnimationValueProperty(
      animationConfig?.progress,
      "baseDuration",
      RIPPLE_BASE_DURATION,
    );
    const min = getAnimationValueProperty(
      animationConfig?.progress,
      "minBaseDuration",
      RIPPLE_MIN_BASE_DURATION,
    );
    const ignore = getAnimationValueProperty(
      animationConfig?.progress,
      "ignoreDurationCoefficient",
      false,
    );

    const { width, height } = ctx.bounds();
    const diagonal = Math.sqrt(width * width + height * height);
    const coefficient = ignore || diagonal <= 0 ? 1 : diagonal / RIPPLE_BASE_DIAGONAL;

    return Math.min(Math.max(base * coefficient, min), base * 2);
  };

  // `pressOrigin` is the press edge the factory records on `onPressDown`:
  // non-null starts a segment to 1 from the recorded point, back-to-null
  // completes a press that started to 2. `reduceMotion` lands each segment
  // instantly. The seam's own gate (`ctx.enabled`) sits beside the animation
  // tier in this check — not in `disabled()` — because `disabled` also picks
  // the unbound resting style; a gated seam still binds `opacity` at rest so
  // the overlay stays invisible, it just never runs (sheet §1 pointer 下全部
  // 静止 / M-017). The factory records `pressOrigin` only while enabled, so
  // this guard also wipes a segment an `enabled` flip stranded mid-press.
  effect(() => {
    const point = ctx.pressOrigin();
    const duration = segmentDuration();

    if (disabled() || !ctx.enabled()) {
      wasPressed = false;
      progress.set(0);
      return;
    }

    if (point !== null) {
      wasPressed = true;
      origin.set(point);
      progress.set(0);
      if (reduceMotion()) {
        progress.set(1);
      } else {
        void progress.timing(1, { duration }).catch(() => undefined);
      }
    } else if (wasPressed) {
      wasPressed = false;
      if (reduceMotion()) {
        progress.set(2);
      } else {
        void progress.timing(2, { duration }).catch(() => undefined);
      }
    }
  });

  const opacity = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: opacityValues,
  });
  const rippleScale = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: scaleValues,
  });

  // The circle covers the container's diagonal so the expansion always
  // reaches the corners, centered on the recorded press point.
  const geometry = computed(() => {
    const { width, height } = ctx.bounds();
    const radius = Math.sqrt(width * width + height * height) * RIPPLE_CIRCLE_FACTOR;
    const center = origin();

    return {
      left: center.x - radius,
      top: center.y - radius,
      width: radius * 2,
      height: radius * 2,
      borderRadius: radius,
    };
  });

  const style = (): StyleProp<ViewStyle> => {
    const backgroundColor = getAnimationValueProperty(
      getAnimationState(local.animation).animationConfig?.backgroundColor,
      "value",
      themeToken("foreground"),
    );
    const circle = {
      position: "absolute" as const,
      ...geometry(),
      backgroundImage: `radial-gradient(circle at center, ${backgroundColor} 30%, transparent 70%)`,
    };

    if ((local.isAnimatedStyleActive ?? true) === false) {
      return [circle, local.style];
    }

    // `disabled()` still binds the interpolated channels: `progress` is
    // pinned at 0, so `opacity`/`rippleScale` land on their resting values
    // and the circle stays invisible instead of rendering at default
    // opacity (sheet §1: a gated seam binds the resting style).
    return [{ ...circle, opacity, scale: rippleScale }, local.style];
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={local.class}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <View testID={local.testID} style={style()} />
    </View>
  );
}
