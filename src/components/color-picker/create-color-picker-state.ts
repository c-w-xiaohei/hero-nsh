/*
 * React Stately's `useColorPickerState` in NSH form.
 *
 * Upstream (`@react-stately/useColorPickerState`) is a controlled/uncontrolled
 * value pair around a `Color`:
 *
 *     let [color, setColor] = useControlledState(props.value, props.defaultValue || null, props.onChange);
 *     return { color: color || null, setColor };
 *
 * `null` is a real state there: a picker with no `value` and no `defaultValue`
 * has no color at all, which is why the swatch picker's selected set is empty
 * rather than white. The setters accept a CSS string and parse it, so a caller
 * can write `onChange={(color) => setColor(color.toString("hex"))}` and feed it
 * back through `value`.
 *
 * Both components of this unit share this one factory (port sheet §5): the
 * identity of the value (`toString("hexa")` for a collection key) has to agree
 * between the picker's color and the swatch list's selected key, and two copies
 * would eventually disagree.
 */

import { type Accessor, computed } from "nsh";

import { createControllableSignal } from "../../primitives";
import type { Color } from "../color-swatch";
import { parseColor } from "../color-swatch";

/** A color prop: a CSS string, an already parsed `Color`, or `null` for "no color". */
export type ColorPickerColorValue = string | Color | null;

/**
 * Normalizes a color prop: `null`, `undefined` and `""` all mean "no color";
 * a string is parsed, a `Color` is used as it is (React Stately's
 * `parseColor(value)` branch).
 */
export function normalizeColorValue(
  value: ColorPickerColorValue | undefined,
): Color | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return typeof value === "string" ? parseColor(value) : value;
}

export interface CreateColorPickerStateProps {
  /** The controlled color; `undefined` leaves the state uncontrolled. */
  value?: Accessor<ColorPickerColorValue | undefined>;

  /** The initial color in uncontrolled mode; no default means "no color". */
  defaultValue?: Accessor<ColorPickerColorValue | undefined>;

  /** Called with the new `Color` on every change the state accepts. */
  onChange?: (color: Color) => void;
}

/**
 * The color state of ColorPicker and ColorSwatchPicker.
 *
 * `color` is `undefined` until the caller (or the user) picks one, exactly as
 * upstream's `color || null`; `setColor` takes the same three shapes the props
 * take and reports the parsed `Color` through `onChange`.
 */
export interface ColorPickerState {
  /** The current color, or `undefined` when the picker has none. */
  color: Accessor<Color | undefined>;

  /** Sets the color; a string is parsed and `null` clears it. */
  setColor: (value: ColorPickerColorValue | undefined) => void;
}

export function createColorPickerState(
  props: CreateColorPickerStateProps,
): ColorPickerState {
  // Parsing happens inside the computed, so the controlled signal's `Object.is`
  // check sees the same `Color` instance until the prop really changes.
  const controlledValue = computed(() => normalizeColorValue(props.value?.()));
  const initialValue = computed(() => normalizeColorValue(props.defaultValue?.()));

  const [color, setResolvedColor] = createControllableSignal<Color | undefined>({
    value: () => controlledValue(),
    defaultValue: () => initialValue(),
    // `null` is a state, not a color: only a real color is reported.
    onChange: (next) => {
      if (next !== undefined) {
        props.onChange?.(next);
      }
    },
  });

  const setColor = (value: ColorPickerColorValue | undefined) => {
    setResolvedColor(normalizeColorValue(value));
  };

  return { color, setColor };
}
