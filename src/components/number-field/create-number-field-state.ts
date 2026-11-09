/*
 * NumberField's value state, ported from React Aria (`useNumberFieldState`)
 * with Kobalte's arithmetic helpers.
 *
 * The port sheet §5 fixes the value model: the committed value is a `number`
 * (`NaN` means empty), the input's string exists only as its display form, and
 * typing edits the string without committing. `onChange` fires on blur, on
 * Enter, and on every step — never while the user types.
 *
 * Kobalte's `snapValueToStep`, `getPrecision` and `handleDecimalOperation` are
 * copied from `packages/utils/src/number.ts` (Apache-2.0 / MIT, itself from
 * react-spectrum). They live here instead of `src/primitives/` because the
 * common rules keep a batch unit's shared code in its own directory.
 */

import { NumberFormatter, NumberParser } from "@internationalized/number";
import type { Accessor } from "nsh";
import { announce, computed, effect, locale, signal, untracked } from "nsh";

import { createControllableSignal } from "../../primitives/create-controllable-signal";

/* -------------------------------------------------------------------------------------------------
 * Arithmetic (react-spectrum, via Kobalte)
 * -----------------------------------------------------------------------------------------------*/

/** Forces `value` into `[min, max]`. */
export function clamp(
  value: number,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Snaps `value` to the closest point of the step grid anchored at `min`, then
 * clamps it. A `NaN` bound means "unbounded", as in react-spectrum.
 */
export function snapValueToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const remainder = (value - (Number.isNaN(min) ? 0 : min)) % step;
  let snappedValue =
    Math.abs(remainder) * 2 >= step
      ? value + Math.sign(remainder) * (step - Math.abs(remainder))
      : value - remainder;

  if (!Number.isNaN(min)) {
    if (snappedValue < min) {
      snappedValue = min;
    } else if (!Number.isNaN(max) && snappedValue > max) {
      snappedValue = min + Math.floor((max - min) / step) * step;
    }
  } else if (!Number.isNaN(max) && snappedValue > max) {
    snappedValue = Math.floor(max / step) * step;
  }

  // Correct floating point behaviour by rounding to the step's precision.
  const string = step.toString();
  const index = string.indexOf(".");
  const precision = index >= 0 ? string.length - index : 0;

  if (precision > 0) {
    const pow = 10 ** precision;

    snappedValue = Math.round(snappedValue * pow) / pow;
  }

  return snappedValue;
}

/** How many decimals `n` carries in its shortest decimal form. */
export function getPrecision(n: number): number {
  let e = 1;
  let precision = 0;

  while (Math.round(n * e) / e !== n) {
    e *= 10;
    precision++;
  }

  return precision;
}

/**
 * Adds or subtracts on the scale both operands share, so `1.1 + 1` is `2.1`
 * rather than `2.1000000000000001`.
 */
export function handleDecimalOperation(
  operator: "-" | "+",
  value1: number,
  value2: number,
): number {
  let result = operator === "+" ? value1 + value2 : value1 - value2;

  if (
    Number.isFinite(value1) &&
    Number.isFinite(value2) &&
    (value2 % 1 !== 0 || value1 % 1 !== 0)
  ) {
    const offsetPrecision = getPrecision(value2);
    const valuePrecision = getPrecision(value1);
    const multiplier = 10 ** Math.max(offsetPrecision, valuePrecision);
    const multipliedOffset = Math.round(value2 * multiplier);
    const multipliedValue = Math.round(value1 * multiplier);
    const next =
      operator === "+"
        ? multipliedValue + multipliedOffset
        : multipliedValue - multipliedOffset;

    result = next / multiplier;
  }

  return result;
}

/* -------------------------------------------------------------------------------------------------
 * Props and public state
 * -----------------------------------------------------------------------------------------------*/

/** What `validate` may return upstream: `true` when valid, otherwise a message. */
export type NumberFieldValidationResult =
  | boolean
  | string
  | null
  | undefined
  | { message?: string | null };

/**
 * What a NumberField root hands its state factory. Every numeric member is
 * optional and means what HeroUI's `NumberFieldProps` means; `isFocused` is
 * NSH's own addition, used to decide whether a committed value is announced.
 */
export interface CreateNumberFieldStateProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  formatOptions?: Intl.NumberFormatOptions;
  commitBehavior?: "snap" | "validate";
  validate?: (value: number) => NumberFieldValidationResult;
  isDisabled?: boolean;
  isReadOnly?: boolean;
}

/**
 * The state HeroUI's render props carry as `state`, accessorized per D17.
 * The method names are React Aria's `NumberFieldState`.
 */
export interface NumberFieldState {
  /** The text the input shows; the editable string while typing. */
  inputValue: Accessor<string>;

  /** The committed value; `NaN` is empty. */
  numberValue: Accessor<number>;

  /** The value the field started with. */
  defaultNumberValue: Accessor<number>;

  /** The lower bound, `undefined` when unbounded. */
  minValue: Accessor<number | undefined>;

  /** The upper bound, `undefined` when unbounded. */
  maxValue: Accessor<number | undefined>;

  /** One increment stays inside the upper bound. */
  canIncrement: Accessor<boolean>;

  /** One decrement stays inside the lower bound. */
  canDecrement: Accessor<boolean>;

  /** Whether `value` could still become a valid number (partial input). */
  validate: (value: string) => boolean;

  /** Writes the input text, rejecting strings the format cannot produce. */
  setInputValue: (value: string) => void;

  /** Writes the committed value (and its text), as React Aria's setter does. */
  setNumberValue: (value: number) => void;

  /** Parses the text, applies the commit behavior, and reports the value. */
  commit: () => void;

  increment: () => void;
  decrement: () => void;
  incrementToMax: () => void;
  decrementToMin: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * The state factory
 * -----------------------------------------------------------------------------------------------*/

/**
 * Creates one NumberField's value state. The formatter and parser follow the
 * user's locale and `formatOptions`, the text follows the committed value
 * (unless the user is editing), and an edit the parser cannot accept is pushed
 * back into the native input.
 *
 * `isFocused` decides whether a step is announced: React Aria only announces a
 * value change the user is looking at.
 */
export function createNumberFieldState(
  props: CreateNumberFieldStateProps,
  isFocused: Accessor<boolean>,
) {
  // --- Effective bounds and step -------------------------------------------
  const minValue = computed<number | undefined>(() => props.minValue);

  const maxValue = computed<number | undefined>(() => props.maxValue);

  const commitBehavior = computed<"snap" | "validate">(
    () => props.commitBehavior ?? "snap",
  );

  // The percent style measures in fractions, so one "step" of a percent field
  // is one percentage point unless the caller says otherwise.
  const clampStep = computed(() => {
    const step = props.step;

    if (typeof step === "number" && !Number.isNaN(step)) {
      return step;
    }

    return props.formatOptions?.style === "percent" ? 0.01 : 1;
  });

  // --- Formatting -----------------------------------------------------------
  const formatter = computed(() => new NumberFormatter(locale(), props.formatOptions));

  const parser = computed(() => new NumberParser(locale(), props.formatOptions));

  const format = (value: number): string =>
    Number.isNaN(value) ? "" : formatter().format(value);

  // --- Committed value ------------------------------------------------------
  // The port sheet's "initial snap" only applies to the uncontrolled start
  // value and only when the caller gave a step: a controlled `value` is what
  // the parent says, and a default with no step must keep its decimals
  // (`defaultValue={1.1}` shows "1,1", not "1").
  const initialNumberValue = (() => {
    const start = props.defaultValue;

    if (typeof start !== "number" || Number.isNaN(start)) {
      return NaN;
    }

    const min = props.minValue;
    const max = props.maxValue;
    const step = props.step;

    if (step === undefined || Number.isNaN(step)) {
      return clamp(start, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY);
    }

    return snapValueToStep(start, min ?? NaN, max ?? NaN, step);
  })();

  const [numberValueRaw, setNumberValueRaw] = createControllableSignal<number>({
    value: () => props.value,
    defaultValue: () => initialNumberValue,
    onChange: (value) => props.onChange?.(value),
  });

  // `createControllableSignal` reports `undefined` until a value is set; an
  // empty number field is `NaN`, which is also what `onChange` reports.
  const numberValue = computed<number>(() => numberValueRaw() ?? NaN);

  // --- Display text ---------------------------------------------------------
  // `text` is the input's text, not the value: the user edits it freely (within
  // the parser's partial grammar) and only a commit turns it into a value.
  const text = signal(format(numberValue()));

  // The text follows the committed value, the locale and the format options.
  // The write is untracked so a user edit never feeds back into the effect.
  effect(() => {
    const value = numberValue();
    const current = formatter();

    untracked(() => {
      const next = Number.isNaN(value) ? "" : current.format(value);

      if (text() !== next) {
        text.set(next);
      }
    });
  });

  // --- Editing and rejection ------------------------------------------------
  // Upstream's controlled React input bounces an edit the parser refuses; NSH's
  // input keeps what the user typed until the app writes another value. Writing
  // the accepted text once is not enough — the signal already holds it, and the
  // host holds the rejected text, so no update runs. The two-step write below
  // adopts the host's text first and restores the accepted text in the effect
  // that follows the render pass (the same trick as nsh-base's NumberInput).
  const pendingRestore = signal<string | null>(null);

  effect(() => {
    const target = pendingRestore();

    if (target === null) {
      return;
    }

    pendingRestore.set(null);
    untracked(() => text.set(target));
  });

  /** Whether `value` could become a number of this format. */
  const validatePartial = (value: string): boolean =>
    parser().isValidPartialNumber(value, minValue(), maxValue());

  const restoreInput = (typed: string) => {
    const target = text();

    if (typed === target) {
      return;
    }

    // The order matters: adopt the host's text (a real change, so a render
    // runs), then restore on the next pass.
    pendingRestore.set(null);
    text.set(typed);
    pendingRestore.set(target);
  };

  const setInputValue = (value: string) => {
    if (validatePartial(value)) {
      text.set(value);
      return;
    }

    restoreInput(value);
  };

  // --- Validation -----------------------------------------------------------
  const validationErrors = signal<readonly string[]>([]);

  const normalizeValidation = (result: NumberFieldValidationResult): string[] => {
    if (result === true || result === false || result === null || result === undefined) {
      return [];
    }

    if (typeof result === "string") {
      return result.length > 0 ? [result] : [];
    }

    const message = result.message;

    return typeof message === "string" && message.length > 0 ? [message] : [];
  };

  /**
   * The caller's `validate` first; in `"validate"` commit mode an out-of-range
   * or off-grid committed value is an error of the field itself (the mode that
   * keeps the typed value instead of clamping it).
   */
  const validateNumber = (value: number): string[] => {
    const custom = normalizeValidation(props.validate?.(value));

    if (custom.length > 0) {
      return custom;
    }

    if (commitBehavior() !== "validate" || Number.isNaN(value)) {
      return [];
    }

    const min = minValue();
    const max = maxValue();

    if (min !== undefined && value < min) {
      return [`Value must be greater than or equal to ${format(min)}`];
    }

    if (max !== undefined && value > max) {
      return [`Value must be less than or equal to ${format(max)}`];
    }

    const step = props.step;

    if (step !== undefined && step > 0) {
      const base = min ?? 0;
      const remainder = Math.abs((value - base) % step);

      if (remainder > 1e-9 && Math.abs(remainder - step) > 1e-9) {
        return ["Invalid value"];
      }
    }

    return [];
  };

  // --- Writing a committed value -------------------------------------------
  /** Snaps `value` onto the step grid and into the bounds (commit `"snap"`). */
  const snapToBounds = (value: number): number => {
    if (Number.isNaN(value)) {
      return value;
    }

    return snapValueToStep(
      value,
      minValue() ?? NaN,
      maxValue() ?? NaN,
      clampStep(),
    );
  };

  /**
   * Commits `next`: writes the value, refreshes the text from the effective
   * value (a controlled parent may ignore the change) and re-runs validation.
   */
  const publish = (next: number) => {
    const previous = numberValue();

    setNumberValueRaw(next);
    validationErrors.set(validateNumber(next));
    text.set(format(numberValue()));

    // A step announces the new value while the field has the focus
    // (`useNumberField`'s announce on a value change).
    if (!Object.is(previous, next) && isFocused()) {
      announce(text());
    }
  };

  // --- Commands -------------------------------------------------------------
  const commit = () => {
    const current = text();
    const before = format(numberValue());

    let next: number;

    if (current.trim() === "") {
      next = NaN;
    } else {
      const parsed = parser().parse(current);

      if (Number.isNaN(parsed)) {
        // An unparsable string is not a value: show the committed one again.
        text.set(before);
        return;
      }

      next = commitBehavior() === "snap" ? snapToBounds(parsed) : parsed;
    }

    setNumberValueRaw(next);
    validationErrors.set(validateNumber(next));
    text.set(format(numberValue()));

    // A blur commit announces only when the visible text really changed.
    if (text() !== before) {
      announce(text());
    }
  };

  /**
   * The value one step away in `direction`: snap the current value onto the
   * grid, use it when it already moved that way, otherwise add or subtract one
   * step from the precision-safe sum. An empty field starts at the lower bound
   * (or 0).
   */
  const stepFrom = (direction: 1 | -1): number => {
    const current = numberValue();
    const min = minValue() ?? NaN;
    const max = maxValue() ?? NaN;
    const step = clampStep();

    if (Number.isNaN(current)) {
      const base = snapValueToStep(
        Number.isNaN(min) ? 0 : min,
        min,
        max,
        step,
      );

      return direction > 0
        ? snapValueToStep(base + step, min, max, step)
        : base;
    }

    const snapped = snapValueToStep(current, min, max, step);

    if (
      (direction > 0 && snapped > current) ||
      (direction < 0 && snapped < current)
    ) {
      return snapped;
    }

    return snapValueToStep(
      handleDecimalOperation(direction > 0 ? "+" : "-", current, step),
      min,
      max,
      step,
    );
  };

  const canStep = (direction: 1 | -1): boolean => {
    if (props.isDisabled === true || props.isReadOnly === true) {
      return false;
    }

    const current = numberValue();

    if (Number.isNaN(current)) {
      return true;
    }

    const next = stepFrom(direction);

    return direction > 0 ? next > current : next < current;
  };

  const increment = () => {
    if (props.isDisabled === true || props.isReadOnly === true) {
      return;
    }

    publish(stepFrom(1));
  };

  const decrement = () => {
    if (props.isDisabled === true || props.isReadOnly === true) {
      return;
    }

    publish(stepFrom(-1));
  };

  const incrementToMax = () => {
    const max = maxValue();

    if (max === undefined || props.isDisabled === true || props.isReadOnly === true) {
      return;
    }

    publish(snapToBounds(max));
  };

  const decrementToMin = () => {
    const min = minValue();

    if (min === undefined || props.isDisabled === true || props.isReadOnly === true) {
      return;
    }

    publish(snapToBounds(min));
  };

  // --- Public surface -------------------------------------------------------
  const canIncrement = computed(() => canStep(1));
  const canDecrement = computed(() => canStep(-1));

  const state: NumberFieldState = {
    inputValue: text,
    numberValue,
    defaultNumberValue: () => initialNumberValue,
    minValue,
    maxValue,
    canIncrement,
    canDecrement,
    validate: validatePartial,
    setInputValue,
    setNumberValue: publish,
    commit,
    increment,
    decrement,
    incrementToMax,
    decrementToMin,
  };

  return {
    state,
    text,
    setInputValue,
    commit,
    numberValue,
    minValue,
    maxValue,
    canIncrement,
    canDecrement,
    increment,
    decrement,
    incrementToMax,
    decrementToMin,
    validationErrors,
    format,
  };
}

export type NumberFieldStateHandle = ReturnType<typeof createNumberFieldState>;
