/*
 * `createPressFeedback(options)` — the factory half of the press-feedback seam
 * (adapt-sheets/pressable-feedback.md §1, §2 A-001). A B-档 component wires its
 * root view's `onPressDown`/`onPressUp`/`onLayout` to the three attachment
 * points and binds the returned channels; `PressableFeedback` is the same
 * wiring delivered as a component.
 *
 * What it owns:
 *
 * - **`isPressed`/`pressed` are the only canonical press state.** `pressDown`
 *   sets one and times the other to 1; `pressUp` reverses both. NSH fires
 *   `onPressUp` for every press end — release *and* cancel (a drag that
 *   becomes a scroll, a second finger, responder loss) — so end and cancel
 *   share this path on purpose (`H/types.d.ts:1453-1491`: touch-start precedes
 *   `onPressDown` by ~130 ms under scroll arbitration; `PressEvent` carries no
 *   pointer type or cancel flag).
 * - **`hitSlop`, the invisible-hit-area path.** tv() produces classes, not
 *   view props, so the touch-minimum expansion happens here: when `enabled`
 *   and `hitSlop` are on, a laid-out view smaller than the density's minimum
 *   target gets `(target - side) / 2` of slop per side. Under the default
 *   pointer environment `enabled` is false and the accessor answers
 *   `undefined` — a component on desktop pays nothing.
 * - **The derived channels.** `scale` is an `AnimatedValue` driven with the
 *   animation config's own timing so it is both bindable and probe-readable
 *   (`AnimatedValue.getValue()`); `highlightOpacity` is a `pressed`
 *   interpolation for the plain `[0 → peak]` fade.
 *
 * `PressEvent.position` at `pressDown` is the ripple's only origin source —
 * `pressOrigin` is exposed through `PressableFeedbackContext` for the Ripple
 * part. `bounds` is set by `layout(e)` off `onLayout`'s payload.
 */

import {
  type Accessor,
  type AnimatedNode,
  type AnimatedValue,
  type Bounds,
  computed,
  createAnimatedValue,
  type Edges,
  effect,
  type Point,
  type PressEvent,
  reduceMotion,
  type Size,
  signal,
} from "nsh";

import { Environment } from "../environment/environment";
import type { EnvironmentDensity } from "../../tokens/density";
import {
  DEFAULT_SCALE_TIMING,
  getAnimationState,
  getAnimationValueMergedConfig,
  getAnimationValueProperty,
} from "./press-feedback-animation";
import type { PressableFeedbackScaleAnimation } from "./press-feedback-types";

/**
 * The minimum side (points) a touch target should reach, per density preset.
 * Registered as a table so `density` reads once, at lookup time; all presets
 * map to 44 today — a finer mapping needs `src/tokens/density.ts` to grow a
 * `minHitTarget` query, which sheet §5 registers with the environment unit.
 */
export const MIN_HIT_TARGET_BY_DENSITY: Record<EnvironmentDensity, number> = {
  default: 44,
  compact: 44,
};

/** What `createPressFeedback` takes. */
export interface CreatePressFeedbackOptions {
  /**
   * The seam's gate. Callers pass `() => createInput()() === "touch"` (what
   * `PressableFeedback` defaults to) — the factory does not read `input`
   * itself because `enabled` is the caller's contract: a component may want
   * feedback under every input (`enabled: () => true`) or its own condition.
   * While false, `pressDown`/`pressUp` only forward `onPressChange` and
   * `hitSlop()` answers `undefined`.
   */
  enabled: Accessor<boolean>;

  /** Whether the `hitSlop` accessor computes an expansion at all. @default `() => true` */
  hitSlop?: Accessor<boolean>;

  /** The scale channel's configuration (`value`, `timingConfig`, `ignoreScaleCoefficient`). */
  animation?: PressableFeedbackScaleAnimation;

  /**
   * The density the hit-area minimum reads. Defaults to the environment's
   * own `density` accessor — resolved at factory time inside the caller's
   * owner scope, the same scope rule `createInteractionModality` follows.
   */
  density?: Accessor<EnvironmentDensity>;

  /** Called with the press flag after each `pressDown`/`pressUp`. */
  onPressChange?: (isPressed: boolean) => void;
}

/** What `createPressFeedback` returns: channels plus the three attachment points. */
export interface PressFeedback {
  /** The canonical press flag. */
  isPressed: Accessor<boolean>;

  /** The canonical animated channel: 1 while pressed, 0 otherwise. */
  pressed: AnimatedValue;

  /** The root view's measured size. */
  bounds: Accessor<Size>;

  /** Where the current press went down (`PressEvent.position`). */
  pressOrigin: Accessor<Point | null>;

  /**
   * The view-prop `hitSlop` a component binds as `hitSlop={feedback.hitSlop()}`:
   * `Partial<Edges>` padding to reach the minimum target, `undefined` while
   * disabled or unlaid-out.
   */
  hitSlop: Accessor<number | Partial<Edges> | undefined>;

  /**
   * The scale channel: `1 - (1 - value) * coefficient` while pressed, 1
   * otherwise, animated with `timingConfig`. `value` defaults to 0.985 and
   * `coefficient` to `300 / width` (unclamped, as upstream; unmeasurable
   * widths treat it as 1). `reduceMotion` pins it to 1.
   */
  scale: AnimatedValue;

  /** `pressed` mapped through `[0, 0.1]`: the default highlight fade. */
  highlightOpacity: AnimatedNode;

  /** Wire to the view's `onPressDown`. */
  pressDown: (e: PressEvent) => void;

  /** Wire to the view's `onPressUp` — release and cancel alike. */
  pressUp: (e: PressEvent) => void;

  /** Wire to the view's `onLayout`; keeps `bounds`/`hitSlop`/`scale` honest. */
  layout: (e: { bounds: Bounds }) => void;
}

const DEFAULT_SCALE_VALUE = 0.985;
const SCALE_COEFFICIENT_BASE = 300;
const HIGHLIGHT_PEAK = 0.1;

/**
 * Builds the press-feedback seam for one pressable view. Must run inside a
 * component's owner scope: `signal`/`createAnimatedValue`/`computed`/`effect`
 * bind to the owner, and the default `density` reads `Environment()` there.
 */
export function createPressFeedback(
  options: CreatePressFeedbackOptions,
): PressFeedback {
  const { animationConfig, isAnimationDisabled } = getAnimationState(
    options.animation,
  );

  const scaleValue = getAnimationValueProperty(
    animationConfig,
    "value",
    DEFAULT_SCALE_VALUE,
  );
  const scaleTiming = getAnimationValueMergedConfig(
    animationConfig,
    "timingConfig",
    DEFAULT_SCALE_TIMING,
  );
  const ignoreScaleCoefficient = getAnimationValueProperty(
    animationConfig,
    "ignoreScaleCoefficient",
    false,
  );

  const density = options.density ?? Environment().density;
  const withHitSlop = options.hitSlop ?? (() => true);

  const isPressed = signal(false);
  const bounds = signal<Size>({ width: 0, height: 0 });
  const pressOrigin = signal<Point | null>(null);

  const pressed = createAnimatedValue(0);
  const scale = createAnimatedValue(1);

  // The coefficient mirrors upstream `pressable-feedback.animation.ts:87-93`:
  // containers narrower than 300 pt press deeper, wider ones shallower.
  const scaleTarget = computed(() => {
    if (reduceMotion() || isAnimationDisabled) {
      return 1;
    }

    const coefficient = ignoreScaleCoefficient
      ? 1
      : bounds().width > 0
        ? SCALE_COEFFICIENT_BASE / bounds().width
        : 1;

    return isPressed() ? 1 - (1 - scaleValue) * coefficient : 1;
  });

  // Both animated channels self-drive: the effect retargets the timing when
  // the press flag, the layout or the reduce-motion preference changes —
  // upstream's `useDerivedValue` semantics, and the reason a mid-press resize
  // still lands on the adjusted scale. `pressed` shares the scale timing so
  // the channels consumers bind stay in step.
  effect(() => {
    const target = scaleTarget();

    if (reduceMotion()) {
      scale.set(target);
    } else {
      void scale.timing(target, scaleTiming).catch(() => undefined);
    }
  });

  effect(() => {
    const target = isPressed() ? 1 : 0;

    if (reduceMotion()) {
      pressed.set(target);
    } else {
      void pressed.timing(target, scaleTiming).catch(() => undefined);
    }
  });

  const hitSlop = computed<number | Partial<Edges> | undefined>(() => {
    if (!options.enabled() || !withHitSlop()) {
      return undefined;
    }

    const { width, height } = bounds();

    if (width <= 0 || height <= 0) {
      return undefined;
    }

    const target = MIN_HIT_TARGET_BY_DENSITY[density()] ?? 44;
    const padX = Math.max(0, (target - width) / 2);
    const padY = Math.max(0, (target - height) / 2);

    if (padX === 0 && padY === 0) {
      return undefined;
    }

    return {
      top: padY,
      right: padX,
      bottom: padY,
      left: padX,
    };
  });

  const highlightOpacity = pressed.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isAnimationDisabled ? 0 : HIGHLIGHT_PEAK],
  });

  const pressDown = (event: PressEvent) => {
    pressOrigin.set(event.position);

    if (!options.enabled()) {
      options.onPressChange?.(false);
      return;
    }

    isPressed.set(true);
    options.onPressChange?.(true);
  };

  const pressUp = (_event: PressEvent) => {
    if (!options.enabled()) {
      options.onPressChange?.(false);
      return;
    }

    isPressed.set(false);
    pressOrigin.set(null);
    options.onPressChange?.(false);
  };

  const layout = (event: { bounds: Bounds }) => {
    bounds.set({
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
  };

  return {
    isPressed,
    pressed,
    bounds,
    pressOrigin,
    hitSlop,
    scale,
    highlightOpacity,
    pressDown,
    pressUp,
    layout,
  };
}
