/*
 * The single production point of device truth. Everything in the library that
 * needs "is this a touch device", "is the window compact" or "which density
 * preset is mounted" reads it here: `Environment` is a `context<T>` like
 * `ButtonGroupContext`, whose value is three accessors the rest of the code
 * consumes — `input` for the tv() `input` axis and gesture gating, `width` for
 * `createPresentation`'s short-side rule, `density` for the tv() `density`
 * axis.
 *
 * `platform` and `windowSize()` are read in this directory only, to produce
 * the default value. Components never read them: a component that read the
 * host directly would bypass `EnvironmentScope` injection and re-create the
 * `if (platform)` scatter this seam exists to close. Tests and mixed devices
 * (a touchscreen laptop) mount `EnvironmentScope` to override fields; nothing
 * else may produce a second source of truth.
 *
 * What is NOT here: `keyboard`. Per-event modality stays in
 * `create-interaction-modality` — it changes press by press, while `input`
 * describes the device the session runs on. A touch screen with a keyboard
 * attached still reports `input: "touch"`; a keyboard event still flips the
 * modality.
 */

import { context, platform, windowSize, type Accessor } from "nsh";

import type { EnvironmentDensity } from "../../tokens/density";

/** What pressed the device the session runs on: a mouse-class pointer or touch. */
export type EnvironmentInput = "pointer" | "touch";

/**
 * The device size class, iOS-trait / Android `sw<short>dp` semantics. `"compact"`
 * when the window's shorter side is under 640 points (a phone either way,
 * a tablet split, a floating window), `"regular"` otherwise.
 */
export type EnvironmentWidth = "compact" | "regular";

/** The shorter-side threshold, in points, of the width class. */
export const COMPACT_WIDTH_MAX = 640;

/** The device information one subtree agrees on. */
export interface EnvironmentValue {
  /**
   * `"pointer" | "touch"`. A touch press toggles a multiple selection, a
   * pan listener is only registered under `touch`, and a styles table's
   * `input` axis reads it. Defaults to `platform.desktop === false` —
   * NSH's own definition of touch: iOS, Android, and a browser in a mobile
   * idiom.
   */
  input: Accessor<EnvironmentInput>;

  /**
   * The size class from the window's shorter side: `"compact"` under
   * `COMPACT_WIDTH_MAX` points, `"regular"` at it. Reactive — it follows a
   * resized window or a rotation; `createPresentation` snapshots it at open
   * time exactly so a rotation cannot swap a container mid-open.
   */
  width: Accessor<EnvironmentWidth>;

  /**
   * The mounted density preset name, a member of `EnvironmentDensity`.
   * Defaults to `"default"`; an app mounts another through `EnvironmentScope`.
   */
  density: Accessor<EnvironmentDensity>;
}

/** The width class of a window, as `EnvironmentValue.width` computes it. */
export function environmentWidth(size: {
  width: number;
  height: number;
}): EnvironmentWidth {
  return Math.min(size.width, size.height) < COMPACT_WIDTH_MAX
    ? "compact"
    : "regular";
}

/**
 * The environment one subtree shares, from `context`. The default derives
 * `input` from `platform.desktop` and `width` from `windowSize()` — the two
 * reads the encapsulation model allows, performed only in this directory —
 * and pins `density` to `"default"` until a scope mounts another preset.
 */
export const Environment = context<EnvironmentValue>({
  input: (): EnvironmentInput => (platform.desktop ? "pointer" : "touch"),
  width: (): EnvironmentWidth => environmentWidth(windowSize()),
  density: (): EnvironmentDensity => "default",
});
