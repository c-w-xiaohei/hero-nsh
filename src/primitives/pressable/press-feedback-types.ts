/*
 * The public type surface of the press-feedback seam: the props of
 * `PressableFeedback` and its `Scale`/`Highlight`/`Ripple` parts, the value
 * `PressableFeedbackContext` carries, and the `animation` prop shapes —
 * `PressableFeedbackRootAnimation`, `PressableFeedbackScaleAnimation`,
 * `PressableFeedbackHighlightAnimation`, `PressableFeedbackRippleAnimation` —
 * ported from `N/components/pressable-feedback/pressable-feedback.types.ts`.
 *
 * Two deliberate differences (sheet §7):
 *
 * - Every timing option is NSH's `TimingConfig` (`{ duration, easing,
 *   delay }`, `H/index.d.ts:1506`), not Reanimated's `WithTimingConfig`, and
 *   `SharedValue` is `createAnimatedValue`'s `AnimatedValue`.
 * - `asChild` is absent: NSH has no Slot/`cloneElement`, so the composition
 *   entry is the compound parts plus the context, not a merged child.
 */

import type {
  Accessor,
  AnimatedValue,
  Edges,
  JSX,
  Point,
  Size,
  TimingConfig,
  ViewProps,
  ViewRef,
} from "nsh";

import type {
  Animation,
  AnimationRoot,
  AnimationValue,
} from "./press-feedback-animation";

/* -------------------------------------------------------------------------------------------------
 * Animation prop shapes
 * -----------------------------------------------------------------------------------------------*/

/**
 * The scale channel's configuration, shared by the root's built-in scale and
 * `PressableFeedback.Scale`: `Animation` over `{ value, timingConfig,
 * ignoreScaleCoefficient }`.
 */
export type PressableFeedbackScaleAnimation = Animation<{
  /**
   * Scale when pressed, before the width coefficient adjusts it.
   * @default 0.985
   *
   * The actual scale is adjusted by the container's width so the same press
   * feels the same on different sizes: `1 - (1 - value) * coefficient` with
   * `coefficient = 300 / width` (a 150 pt box presses down to ~0.97, a 600 pt
   * box to ~0.9925), exactly as upstream's `pressable-feedback.animation.ts`.
   */
  value?: number;

  /** Timing of both the press-down and the release. @default `{ duration: 300, easing: easeOut }` */
  timingConfig?: TimingConfig;

  /** Uses `value` directly, ignoring the width coefficient. @default false */
  ignoreScaleCoefficient?: boolean;
}>;

/** The highlight overlay's configuration. */
export type PressableFeedbackHighlightAnimation = Animation<{
  /** The fade the overlay's `opacity` runs on press. */
  opacity?: AnimationValue<{
    /** `[unpressed, pressed]`; pressed gets `[0, x]` on release. @default `[0, 0.1]` */
    value?: [number, number];

    /** Timing of both directions (the upstream 200 ms). */
    timingConfig?: TimingConfig;
  }>;

  /** The overlay's background color (not animated on NSH). */
  backgroundColor?: AnimationValue<{
    /** @default the theme's `foreground` token (upstream: theme-aware gray) */
    value?: string;
  }>;
}>;

/** The ripple overlay's configuration. */
export type PressableFeedbackRippleAnimation = Animation<{
  /** The radial-gradient color the ripple draws. */
  backgroundColor?: AnimationValue<{
    /** @default the theme's `foreground` token */
    value?: string;
  }>;

  /** How long a `progress` segment lasts, diagonal-adjusted. */
  progress?: AnimationValue<{
    /**
     * Milliseconds of one segment before the diagonal coefficient scales it:
     * `clamp(base * diagonal / 450, minBaseDuration, base * 2)`.
     * @default 1000
     */
    baseDuration?: number;

    /** Lower bound of the adjusted duration. @default 750 */
    minBaseDuration?: number;

    /** Uses `baseDuration` directly, ignoring the diagonal coefficient. @default false */
    ignoreDurationCoefficient?: boolean;
  }>;

  /** The opacity stops `progress` interpolates through. */
  opacity?: AnimationValue<{
    /** `[start, peak, end]` on `progress` `[0, 1, 2]`. @default `[0, 0.1, 0]` */
    value?: [number, number, number];

    timingConfig?: TimingConfig;
  }>;

  /** The scale stops `progress` interpolates through. */
  scale?: AnimationValue<{
    /** `[start, peak, end]` on `progress` `[0, 1, 2]`. @default `[0, 1, 1]` */
    value?: [number, number, number];

    timingConfig?: TimingConfig;
  }>;
}>;

/**
 * The root's animation prop: `AnimationRoot` over `{ scale }`. `false` /
 * `"disabled"` turn off only the root's built-in scale; `"disable-all"` (also
 * a config's `state`) cascades to the Scale/Highlight/Ripple parts below.
 */
export type PressableFeedbackRootAnimation = AnimationRoot<{
  /** Configures the built-in scale the root applies to itself. */
  scale?: PressableFeedbackScaleAnimation;
}>;

/* -------------------------------------------------------------------------------------------------
 * Component props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `PressableFeedback`: the NSH view props upstream's
 * `AnimatedProps<PressableProps>` mapped onto, minus `children`/`class`/
 * `hitSlop` (the seam computes it — no `hitSlop` prop ever leaks to a caller),
 * plus `isDisabled`/`animation`/`isAnimatedStyleActive`/`enabled`.
 */
export interface PressableFeedbackProps
  extends Omit<ViewProps, "children" | "class" | "hitSlop"> {
  /** Ignores presses; `app.enabled` reports false. @default false */
  isDisabled?: boolean;

  children?: JSX.Element;

  /** Tailwind classes for the root view. */
  class?: string;

  /**
   * Animation configuration: `undefined`/`true` for the built-in scale, an
   * object `{ scale }` to configure it, `false`/`"disabled"` to switch the
   * built-in scale off (compose `PressableFeedback.Scale` on a child instead),
   * `"disable-all"` to cascade-disable every part's animation.
   */
  animation?: PressableFeedbackRootAnimation;

  /**
   * Whether the animated channels may write `scale`/`opacity` on the views
   * they own. `false` leaves every channel untouched so the caller can style
   * them; no second writer ever shares the same channel.
   * @default true
   */
  isAnimatedStyleActive?: boolean;

  /**
   * The seam's gate: whether press feedback runs at all. `Accessor<boolean>`
   * or a constant; the root defaults it to `input() === "touch"`, so under a
   * pointer environment the primitive is a zero-cost pass-through — the
   * desktop-zero-change guarantee. A component that wants feedback on every
   * input passes `enabled={true}` (or its own accessor).
   * @default () => input() === "touch"
   */
  enabled?: boolean | Accessor<boolean>;

  /** Forwarded to the root `View` as a callback, never a ref store. */
  ref?: (node: ViewRef) => void;
}

/** The props of `PressableFeedback.Scale`: a container whose `scale` presses follow. */
export interface PressableFeedbackScaleProps
  extends Omit<ViewProps, "children" | "class"> {
  children?: JSX.Element;

  /**
   * Tailwind classes. `scale`/`transform` are animation-owned while
   * `isAnimatedStyleActive` is on; write them only after setting it false.
   */
  class?: string;

  /** The scale channel's configuration. */
  animation?: PressableFeedbackScaleAnimation;

  /** `false` detaches the animated style from this part. @default true */
  isAnimatedStyleActive?: boolean;

  ref?: (node: ViewRef) => void;
}

/** The props of `PressableFeedback.Highlight`: an `inset-0` overlay fading in on press. */
export interface PressableFeedbackHighlightProps
  extends Omit<ViewProps, "children" | "class"> {
  /**
   * Tailwind classes. `opacity`/`backgroundColor` are animation-owned while
   * `isAnimatedStyleActive` is on.
   */
  class?: string;

  /** The overlay's configuration. */
  animation?: PressableFeedbackHighlightAnimation;

  /** `false` detaches the animated style from this part. @default true */
  isAnimatedStyleActive?: boolean;

  ref?: (node: ViewRef) => void;
}

/**
 * The props of `PressableFeedback.Ripple`: an `inset-0` overlay whose radial
 * gradient expands from the press point. The upstream `classNames`/`styles`
 * slot objects collapse into this part's own `class`/`style` — the overlay is
 * a single view here (sheet §7).
 */
export interface PressableFeedbackRippleProps
  extends Omit<ViewProps, "children" | "class"> {
  /** Tailwind classes of the overlay container. */
  class?: string;

  /** The ripple's configuration. */
  animation?: PressableFeedbackRippleAnimation;

  /** `false` detaches the animated style from this part. @default true */
  isAnimatedStyleActive?: boolean;

  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * What `PressableFeedback` provides to the parts under it — the one canonical
 * press state plus the geometry and the cascade flag they animate from —
 * plus the seam's computed `hitSlop` accessor so a part can report the same
 * hit expansion the root applies (the context reads it; callers never set it).
 */
export interface PressableFeedbackContextValue {
  /** The canonical press flag: true between `onPressDown` and `onPressUp`. */
  isPressed: Accessor<boolean>;

  /**
   * The canonical animated channel: `pressDown` times it to 1, `pressUp`
   * (end *and* cancel — the host does not distinguish them) to 0. Every part
   * derives its animation from this value or from `isPressed`, never from a
   * second press source.
   */
  pressed: AnimatedValue;

  /** The root view's measured size (0×0 until `onLayout` reports it). */
  bounds: Accessor<Size>;

  /**
   * Where the current press went down in the view (`PressEvent.position`),
   * recorded only while `enabled` holds and cleared on every `pressUp` —
   * null while the seam is gated off, so a gated press cannot start the
   * ripple below.
   */
  pressOrigin: Accessor<Point | null>;

  /** The root's built-in scale channel (the factory's `scale`). */
  scale: AnimatedValue;

  /**
   * The overlay opacity channel the Highlight part drives — owned by the
   * root so a part only ever has one writer, and probe-readable
   * (`AnimatedValue.getValue()`) where `viewStyle` cannot see a bound node.
   */
  highlightOpacity: AnimatedValue;

  /**
   * The ripple progress channel the Ripple part drives (0 idle → 1 expanded
   * → 2 faded), same ownership story as `highlightOpacity`.
   */
  rippleProgress: AnimatedValue;

  /** The root's effective gate (`enabled` and not `isDisabled`). */
  enabled: Accessor<boolean>;

  /** The computed `hitSlop` the root applies — the seam's only producer. */
  hitSlop: Accessor<number | Partial<Edges> | undefined>;

  /** `animation="disable-all"` (or `state`) cascaded from the root. */
  isAllAnimationsDisabled: Accessor<boolean>;
}

/** The compound `PressableFeedback` root with its parts attached. */
export type PressableFeedbackCompound = ((props: PressableFeedbackProps) => JSX.Element) & {
  Scale: (props: PressableFeedbackScaleProps) => JSX.Element;
  Highlight: (props: PressableFeedbackHighlightProps) => JSX.Element;
  Ripple: (props: PressableFeedbackRippleProps) => JSX.Element;
};
