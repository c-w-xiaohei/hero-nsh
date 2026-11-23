import { context } from "nsh";
import type { Accessor, ViewRef } from "nsh";

import type { InteractionModalityState } from "../../primitives/create-interaction-modality";
import type { PanHandlers } from "../../primitives/pan";
import type { PressFeedback } from "../../primitives/pressable";
import type { SliderState } from "./create-slider-state";
import type { sliderVariants } from "./slider.styles";
import type { Orientation } from "./slider.utils";

/**
 * The render prop values of `SliderRoot` (HeroUI 3.2.7's
 * `SliderRenderProps`), as accessors per D17. `isDisabled` and `orientation`
 * are accessors too; `state` is the value state the parts share.
 */
export interface SliderRenderProps {
  orientation: Accessor<Orientation>;
  isDisabled: Accessor<boolean>;
  state: SliderState;
}

/** `SliderTrackRenderProps`: the root's, plus the track's hover state. */
export interface SliderTrackRenderProps extends SliderRenderProps {
  isHovered: Accessor<boolean>;
}

/** `SliderThumbRenderProps`: the thumb's own interaction state. */
export interface SliderThumbRenderProps {
  state: SliderState;
  isDragging: Accessor<boolean>;
  isHovered: Accessor<boolean>;
  isFocused: Accessor<boolean>;
  isFocusVisible: Accessor<boolean>;
  isDisabled: Accessor<boolean>;
}

/**
 * What the root hands to Output, Track, Fill, Thumb, Steps, Marks and Mark.
 *
 * HeroUI's context carries the resolved slot table and the RAC render state;
 * NSH adds the few things a browser gave the upstream parts for free:
 *
 * - `trackSize`: the track's laid-out size, which converts a pointer delta in
 *   points into a value percent. Upstream reads `getBoundingClientRect()`.
 * - `hasMarks`: whether any `Slider.Marks` is mounted. Upstream asks the CSS
 *   `:has(> .slider__marks)`; NSH has no `:has`, so `Marks` registers itself
 *   here (port sheet R-054 / R-056).
 * - `registerThumb` / `focusThumb`: RAC finds the hidden input by DOM id; NSH
 *   keeps a map of thumb views so a track press can focus the closest one.
 * - `modality`: one interaction-modality owner per slider, so a keyboard
 *   focus shows the ring and a pointer press does not.
 * - `ariaLabel` / `labelText`: the two sources of the accessible name a thumb
 *   falls back to, after its own `aria-label` and its own `Label`.
 *
 * Not exported from the package entry: HeroUI does not export its context.
 */
export interface SliderContextValue {
  slots: Accessor<ReturnType<typeof sliderVariants>>;
  state: SliderState;
  orientation: Accessor<Orientation>;
  isDisabled: Accessor<boolean>;
  isRtl: Accessor<boolean>;
  hasMarks: Accessor<boolean>;
  registerMarks: () => () => void;
  registerThumb: (index: number, node: ViewRef) => () => void;
  focusThumb: (index: number) => void;
  trackSize: Accessor<{ width: number; height: number }>;
  setTrackSize: (size: { width: number; height: number }) => void;
  modality: InteractionModalityState;
  ariaLabel: Accessor<string | undefined>;
  labelText: Accessor<string | undefined>;
}

export const SliderContext = context<SliderContextValue | undefined>(undefined);

/**
 * The mobile seams one part mounted, offered to that part's own subtree so a
 * fixture probe can observe them (adapt-sheets/slider.md §4's `CtxProbe`
 * surface — the same carrier the color-slider precedent names
 * `ColorSliderPanContext`, widened to carry the press-feedback seam the same
 * part also runs). `SliderContextValue` itself is unchanged: the seams are
 * self-contained in each part's closure, so they never join the shared
 * context's field set.
 *
 * `pan.panHandlers()` is live — it re-reads `enabled()` on every call, which
 * is what makes `Object.keys(...).length === 0` the pointer-environment
 * negative assertion (`M-012`).
 */
export interface SliderSeam {
  /** The shared seam gate: `input() === "touch" && !isDisabled()`. */
  enabled: Accessor<boolean>;

  /** The part's `createPan` surface: handlers plus the claimed flag. */
  pan: {
    panHandlers: Accessor<PanHandlers>;
    active: Accessor<boolean>;
  };

  /** The part's `createPressFeedback` seam (only `hitSlop`/`layout` are wired). */
  feedback: PressFeedback;
}

/**
 * `SliderSeamContext` is provided by `Slider.Thumb` and `Slider.Track`
 * around their own children only; `undefined` outside them. It is not
 * exported from the package entry, like `SliderContext` — the fixture
 * imports the context file directly (the switch fixture precedent).
 */
export const SliderSeamContext = context<SliderSeam | undefined>(undefined);
