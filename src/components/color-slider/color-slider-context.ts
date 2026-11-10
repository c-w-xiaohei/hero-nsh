import type { Accessor, ViewRef } from "nsh";
import { context } from "nsh";

import type { InteractionModalityState } from "../../primitives/create-interaction-modality";
import type { Color } from "../color-swatch";
import { parseColor } from "../color-swatch";
import type { ColorSliderState } from "./create-color-slider-state";
import type { colorSliderVariants } from "./color-slider.styles";

/** The two layouts HeroUI's `orientation` prop selects. */
export type ColorSliderOrientation = "horizontal" | "vertical";

/**
 * The `state` a render prop receives. HeroUI hands React Aria's
 * `ColorSliderState` (port sheet §1 / §8: a subset here), so D17 turns its
 * members into accessors — and the object itself into one, because the whole
 * state is what a function child reads.
 *
 * Both spellings work and mean the same: `state.value()` reads the value
 * reactively, `state().value` a snapshot with a plain `Color`. A render prop
 * that is called once (`untracked`) cannot keep a bare `.value` up to date, so
 * the accessor form is the one to use inside JSX.
 */
export interface ColorSliderStateSnapshot {
  /** The current color, in the resolved color space. */
  value: Color;

  /** The color the track draws (port sheet §2). */
  getDisplayColor(): Color;

  /** The channel value. */
  getThumbValue(): number;

  /** The channel value as a 0–1 fraction. */
  getThumbPercent(): number;

  /** The formatted value plus its hue / color name. */
  getThumbValueLabel(index: number): string;

  getThumbMinValue(): number;

  getThumbMaxValue(): number;
}

/** `state` in a render prop: callable for a snapshot, with accessors on it. */
export interface ColorSliderStateAccessor {
  (): ColorSliderStateSnapshot;

  /** The current color, in the resolved color space. */
  value: Accessor<Color>;

  /** The color the track draws. */
  displayColor: Accessor<Color>;

  getDisplayColor: () => Color;

  getThumbValue: () => number;

  getThumbPercent: () => number;

  getThumbValueLabel: (index: number) => string;

  getThumbMinValue: () => number;

  getThumbMaxValue: () => number;
}

/** What the Root, Output and Track render props receive (D17: accessors). */
export interface ColorSliderRenderProps {
  /** The layout. */
  orientation: Accessor<ColorSliderOrientation>;

  /** The effective disabled state. */
  isDisabled: Accessor<boolean>;

  /** The slider's state, as above. */
  state: ColorSliderStateAccessor;
}

/** What only the Track's render prop adds. */
export interface ColorSliderTrackRenderProps extends ColorSliderRenderProps {
  /** The pointer rests on the track or a view inside it. */
  isHovered: Accessor<boolean>;
}

/** What the Thumb's render prop receives (React Aria's `ColorThumbRenderProps`). */
export interface ColorSliderThumbRenderProps {
  /** The color the thumb paints (React Aria's `state.getDisplayColor()`). */
  color: Accessor<Color>;

  /** This thumb is being dragged. */
  isDragging: Accessor<boolean>;

  /** The pointer rests on the thumb. */
  isHovered: Accessor<boolean>;

  /** The thumb has the keyboard focus. */
  isFocused: Accessor<boolean>;

  /** The focus came from the keyboard, so the ring shows. */
  isFocusVisible: Accessor<boolean>;

  /** The whole slider is disabled. */
  isDisabled: Accessor<boolean>;
}

/** The measured size of the track, in points (`onLayout`'s `bounds.size`). */
export interface ColorSliderTrackSize {
  width: number;
  height: number;
}

/**
 * What one ColorSlider root hands to its Output, Track and Thumb.
 *
 * HeroUI's context carries the channel, the resolved `tv()` result and React
 * Aria's render props; the parts read them without owning any state. The
 * registration channels stand in for the upstream `:has(...)` selectors
 * (port sheet §2, R-005 / R-009 / R-011 / R-053 / R-056 / R-058).
 *
 * The context is internal, exactly like HeroUI's own `ColorSliderContext`: a
 * part rendered outside a root gets `undefined` and falls back to the slot
 * classes and an empty state, which renders but describes nothing.
 */
export interface ColorSliderContextValue {
  /** The root's resolved variant table. */
  slots: {
    base: () => string;
    output: () => string;
    track: () => string;
    thumb: () => string;
  };

  orientation: Accessor<ColorSliderOrientation>;

  isDisabled: Accessor<boolean>;

  /** Whether the rendered layout is right-to-left (`locale()`, port sheet §2). */
  rtl: Accessor<boolean>;

  /** A `Label` inside the root registered itself (its text may be empty). */
  hasLabel: Accessor<boolean>;

  /** An `Output` is mounted inside the root. */
  hasOutput: Accessor<boolean>;

  /** The one thumb's state. */
  state: ColorSliderState;

  /** The same state, shaped as the render prop's `state`. */
  publicState: ColorSliderStateAccessor;

  /** The keyboard / pointer modality, shared so a Track press can record a pointer. */
  modality: InteractionModalityState;

  /** The track's measured size; the thumb's drag delta is relative to it. */
  trackSize: Accessor<ColorSliderTrackSize>;

  setTrackSize: (size: ColorSliderTrackSize) => void;

  /** Called by an output on creation; the returned function unregisters it. */
  registerOutput: () => () => void;

  /** Called by a thumb's ref, so a Track press can focus it. */
  registerThumb: (node: ViewRef | undefined) => void;

  /** Gives the thumb the keyboard focus (`ref.focus()`). */
  focusThumb: () => void;

  /** The accessible name: the registered Label's text, then the root's `aria-label`. */
  accessibleName: Accessor<string | undefined>;
}

export const ColorSliderContext = context<ColorSliderContextValue | undefined>(
  undefined,
);

/** Type-only alias so `colorSliderVariants`'s slot shape stays in one place. */
export type ColorSliderSlots = ReturnType<typeof colorSliderVariants>;

/**
 * The `state` a part rendered outside a root exposes. Upstream's context
 * default is `{}`, so such a part renders with no slider to describe; this
 * keeps a render prop that reads `state` from throwing, with the same zero
 * values the rest of a detached part shows.
 */
const MISSING_COLOR = parseColor("#000000");

export const EMPTY_COLOR_SLIDER_STATE: ColorSliderStateAccessor = Object.assign(
  (): ColorSliderStateSnapshot => ({
    value: MISSING_COLOR,
    getDisplayColor: () => MISSING_COLOR,
    getThumbValue: () => 0,
    getThumbPercent: () => 0,
    getThumbValueLabel: () => "",
    getThumbMinValue: () => 0,
    getThumbMaxValue: () => 0,
  }),
  {
    value: () => MISSING_COLOR,
    displayColor: () => MISSING_COLOR,
    getDisplayColor: () => MISSING_COLOR,
    getThumbValue: () => 0,
    getThumbPercent: () => 0,
    getThumbValueLabel: () => "",
    getThumbMinValue: () => 0,
    getThumbMaxValue: () => 0,
  },
);
