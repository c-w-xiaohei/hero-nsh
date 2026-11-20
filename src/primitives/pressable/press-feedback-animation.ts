/*
 * The `animation` prop's three-tier control flow, ported from heroui-native's
 * `helpers/internal/utils/animation.ts` (`getAnimationState`,
 * `getRootAnimationState`, `getIsAnimationDisabledValue` and the property
 * accessors they feed). Kept in this directory because nothing else in the
 * library speaks `Animation`/`AnimationRoot` yet: it is the press seam's own
 * machinery, not a shared public API.
 *
 * The upstream types are re-declared here so the Reanimated `WithTimingConfig`
 * never surfaces: timing options are NSH's `TimingConfig` (`{ duration,
 * easing, delay }`, `H/index.d.ts:1506`).
 *
 * - `true` or `undefined`: the default animation.
 * - `false` or `"disabled"`: that channel off.
 * - an object: a custom configuration, whose own `state?: "disabled" |
 *   "disable-all" | boolean` can still switch it off while keeping the config.
 */

import type { TimingConfig } from "nsh";

/**
 * The universal animation prop: the configuration one animatable channel
 * takes. `true`/`undefined` use the channel's defaults, `false`/`"disabled"`
 * turn it off, an object configures it (its own `state` can still disable).
 */
export type Animation<TConfig extends Record<string, unknown> = Record<string, unknown>> =
  | boolean
  | "disabled"
  | (TConfig & { state?: "disabled" | boolean });

/**
 * The root-level animation prop, with a cascading tier: `"disable-all"`
 * (the value or a config's `state`) turns off every animation under the root,
 * not only the root's own.
 */
export type AnimationRoot<TConfig extends Record<string, unknown> = Record<string, unknown>> =
  | boolean
  | "disabled"
  | "disable-all"
  | (TConfig & { state?: "disabled" | "disable-all" | boolean });

/** A granular configuration inside a channel's animation object. */
export type AnimationValue<TConfig extends Record<string, unknown> = Record<string, unknown>> = TConfig;

/** `isAnimationDisabled`: false/`"disabled"` or a config's own `state` off. */
export function isAnimationDisabled(
  animation: Animation | AnimationRoot | undefined,
): boolean {
  if (animation === false || animation === "disabled") {
    return true;
  }

  if (typeof animation === "object" && animation !== null && "state" in animation) {
    const state = animation.state;

    return state === false || state === "disabled";
  }

  return false;
}

/** `shouldDisableAll`: the root says every child animation stops too. */
export function shouldDisableAll(
  animation: AnimationRoot | undefined,
): boolean {
  if (animation === "disable-all") {
    return true;
  }

  if (typeof animation === "object" && animation !== null && "state" in animation) {
    return animation.state === "disable-all";
  }

  return false;
}

/** `getAnimationState`: the config object (kept even when off) and the flag. */
export function getAnimationState<TConfig extends Record<string, unknown>>(
  animation: Animation<TConfig> | undefined,
): { animationConfig: TConfig | undefined; isAnimationDisabled: boolean } {
  return {
    animationConfig:
      typeof animation === "object" && animation !== null
        ? (animation as TConfig)
        : undefined,
    isAnimationDisabled: isAnimationDisabled(animation),
  };
}

/** `getRootAnimationState`: the same plus the cascading flag. */
export function getRootAnimationState<TConfig extends Record<string, unknown>>(
  animation: AnimationRoot<TConfig> | undefined,
): {
  animationConfig: TConfig | undefined;
  isAnimationDisabled: boolean;
  isAllAnimationsDisabled: boolean;
} {
  const cascade = shouldDisableAll(animation);

  return {
    animationConfig:
      typeof animation === "object" && animation !== null
        ? (animation as TConfig)
        : undefined,
    isAnimationDisabled: isAnimationDisabled(animation) || cascade,
    isAllAnimationsDisabled: cascade,
  };
}

/** `getAnimationValueProperty`: a property of a channel's config, or `default`. */
export function getAnimationValueProperty<
  TConfig extends Record<string, unknown>,
  K extends keyof TConfig,
>(
  animationValue: TConfig | undefined,
  property: K,
  defaultValue: NonNullable<TConfig[K]>,
): NonNullable<TConfig[K]> {
  if (animationValue === undefined) {
    return defaultValue;
  }

  return (animationValue[property] ?? defaultValue) as NonNullable<TConfig[K]>;
}

/** `getAnimationValueMergedConfig`: a config object merged over its defaults. */
export function getAnimationValueMergedConfig<
  TConfig extends Record<string, unknown>,
  K extends keyof TConfig,
>(
  animationValue: TConfig | undefined,
  property: K,
  defaultValue: NonNullable<TConfig[K]>,
): NonNullable<TConfig[K]> {
  if (animationValue === undefined) {
    return defaultValue;
  }

  const value = animationValue[property];

  if (value === undefined || typeof value !== "object") {
    return defaultValue;
  }

  return { ...(defaultValue as object), ...(value as object) } as NonNullable<TConfig[K]>;
}

/** `getIsAnimationDisabledValue`: cascading disable wins over the own flag. */
export function getIsAnimationDisabledValue(options: {
  isAnimationDisabled: boolean;
  isAllAnimationsDisabled: boolean | undefined;
}): boolean {
  return (
    options.isAllAnimationsDisabled === true || options.isAnimationDisabled
  );
}

/** The default scale timing the upstream used (300 ms, `Easing.out(Easing.ease)`). */
export const DEFAULT_SCALE_TIMING: TimingConfig = {
  duration: 300,
  easing: [0, 0, 0.58, 1],
};
