import type { Accessor } from "nsh";
import { context } from "nsh";

import type { meterVariants } from "./meter.styles";

/**
 * What one Meter root hands to its Output, Track and Fill.
 *
 * HeroUI's context carries the resolved `tv()` result and React Aria's render
 * props (`{ percentage, valueText }`); the parts read both without owning
 * either. Per D17 the values are accessors, so a `value` change moves the
 * output text and the fill width without rebuilding the tree.
 *
 * The context is internal — it is not exported from the package entry, exactly
 * like HeroUI's own `MeterContext`. A part rendered outside a root gets
 * `undefined` and falls back to the empty slot classes and a zero value, which
 * matches the upstream default (`createContext<MeterContext>({})`): it renders,
 * it simply has no meter to describe.
 */
export interface MeterContextValue {
  /** The root instance's variant table result, re-resolved when color/size change. */
  slots: Accessor<ReturnType<typeof meterVariants>>;

  /** The clamped value as 0–100. */
  percentage: Accessor<number>;

  /** The formatted value: `valueLabel` when non-empty, else the formatted number. */
  valueText: Accessor<string>;
}

/**
 * What a render prop receives. HeroUI's `MeterRenderProps` carries plain
 * values; per D17 they are accessors here, so the tree the function returns
 * follows the meter without being rebuilt.
 */
export interface MeterRenderProps {
  /** The value as a percentage between the minimum and the maximum. */
  percentage: Accessor<number>;

  /** A formatted version of the value. */
  valueText: Accessor<string>;
}

export const MeterContext = context<MeterContextValue | undefined>(undefined);
