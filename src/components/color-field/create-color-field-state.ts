/*
 * ColorField's hex value state, ported from React Aria (`useColorFieldState`)
 * with Kobalte's color model.
 *
 * The port sheet §2 fixes the model: the committed `Color | null` and the
 * input's text are two separate pieces of state. Typing edits only the text;
 * a commit (blur, Enter, a step) parses it and writes the value. Text the
 * hex grammar cannot accept is bounced back into the native input. The value
 * model itself is ColorSwatch's port of Kobalte's `colors/`, imported from
 * that component's public entry so this unit never copies it (port sheet §5).
 */

import type { Accessor } from "nsh";
import { computed, effect, signal, untracked } from "nsh";

import { createControllableSignal } from "../../primitives/create-controllable-signal";
import type { Color } from "../color-swatch";
import { parseColor } from "../color-swatch";

/* -------------------------------------------------------------------------------------------------
 * Validation
 * -----------------------------------------------------------------------------------------------*/

/** What `validate` may return upstream: `true` when valid, otherwise a message. */
export type ColorFieldValidationResult =
  | boolean
  | string
  | null
  | undefined
  | { message?: string | null };

/**
 * Normalizes a `validate` result into the messages the `FieldError` shows.
 * `true`, `null` and `undefined` pass; a non-empty string or `{ message }` is
 * one error each, as React Aria's `useFormValidationState` reports them.
 */
export function normalizeColorFieldValidation(
  result: ColorFieldValidationResult,
): string[] {
  if (result === true || result === false || result === null || result === undefined) {
    return [];
  }

  if (typeof result === "string") {
    return result.length > 0 ? [result] : [];
  }

  const message = result.message;

  return typeof message === "string" && message.length > 0 ? [message] : [];
}

/* -------------------------------------------------------------------------------------------------
 * Props and public state
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a ColorField root hands its state factory. `value` is controlled,
 * `defaultValue` is the uncontrolled start, and both take the string form
 * HeroUI accepts (`parseColor` normalizes it).
 */
export interface CreateColorFieldStateProps {
  value?: string | Color | null;
  defaultValue?: string | Color | null;
  onChange?: (color: Color | null) => void;
  validate?: (value: Color | null) => ColorFieldValidationResult;
}

/**
 * The state HeroUI's render props carry as `state` (React Aria's
 * `ColorFieldState`), accessorized per D17. The `FormValidationState` members
 * are narrowed to `isInvalid` + `validationErrors` (port sheet §8): NSH has no
 * form submission and no `ValidityState`.
 */
export interface ColorFieldState {
  /** The input's current text; the editable string while typing. */
  inputValue: Accessor<string>;

  /** The committed color; `null` is empty. */
  colorValue: Accessor<Color | null>;

  /** The value the field started with. */
  defaultColorValue: Accessor<Color | null>;

  /** Writes the committed color (the input's text follows it). */
  setColorValue: (value: Color | null) => void;

  /** Writes the input text, rejecting strings the hex grammar cannot accept. */
  setInputValue: (value: string) => void;

  /** Parses the text and commits it (blur and Enter). */
  commit: () => void;

  /** One step up: the next hex integer, or one channel step. */
  increment: () => void;
  decrement: () => void;

  /** End / Home: the largest / smallest value of this field. */
  incrementToMax: () => void;
  decrementToMin: () => void;

  /** Whether `value` could still become a hex color (a partial value counts). */
  validate: (value: string) => boolean;

  /** The committed value fails `validate`. */
  isInvalid: Accessor<boolean>;

  /** The messages `validate` returned for the committed value. */
  validationErrors: Accessor<readonly string[]>;
}

/**
 * What both state paths (hex and single channel) expose to the root. The
 * render-prop `state` is the public face; the other members are the wiring the
 * input, the keymap and the contexts read.
 */
export interface ColorFieldStateHandle {
  state: ColorFieldState;
  inputValue: Accessor<string>;
  setInputValue: (value: string) => void;
  commit: () => void;
  increment: () => void;
  decrement: () => void;
  incrementToMax: () => void;
  decrementToMin: () => void;
  colorValue: Accessor<Color | null>;
  validationErrors: Accessor<readonly string[]>;
}

/* -------------------------------------------------------------------------------------------------
 * Shared helpers
 * -----------------------------------------------------------------------------------------------*/

/**
 * HeroUI accepts a `Color` or a string everywhere a value goes; a string that
 * does not parse degrades to "no value", the way React Aria's `useColor`
 * does (port sheet §1.2), rather than throwing inside render.
 */
export function normalizeColorValue(
  value: string | Color | null | undefined,
): Color | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return parseColor(value);
  } catch {
    return null;
  }
}

/** The text HeroUI shows for a color: uppercase six-digit hex, empty when null. */
export function colorText(color: Color | null): string {
  return color ? color.toString("hex") : "";
}

/**
 * The hex grammar React Aria's `useColorFieldState.validate` accepts: an empty
 * string, or an optional `#` followed by at most six hex digits. A partial
 * value passes, so every keystroke on the way to a color is allowed.
 */
export function validateHexInput(value: string): boolean {
  return value === "" || /^#?[0-9a-f]{0,6}$/i.test(value);
}

/* -------------------------------------------------------------------------------------------------
 * The state factory
 * -----------------------------------------------------------------------------------------------*/

/**
 * Creates one ColorField's hex state. The committed color comes from
 * `createControllableSignal` (Kobalte's controlled / uncontrolled primitive),
 * the text is a local signal that follows the committed value except while the
 * user is editing, and a step commits immediately.
 */
export function createColorFieldState(
  props: CreateColorFieldStateProps,
): ColorFieldStateHandle {
  // --- Committed value ------------------------------------------------------
  // `undefined` is the uncontrolled marker, exactly as `value` means in
  // HeroUI: an unparsable controlled string becomes "no value" instead.
  const controlledValue = computed<Color | null | undefined>(() => {
    const value = props.value;

    if (value === undefined) {
      return undefined;
    }

    return normalizeColorValue(value) ?? null;
  });

  const initialValue = (): Color | null => normalizeColorValue(props.defaultValue) ?? null;

  const [colorValueRaw, setColorValue] = createControllableSignal<Color | null>({
    value: () => controlledValue(),
    defaultValue: initialValue,
    onChange: (color) => props.onChange?.(color),
  });

  // `createControllableSignal` reports `undefined` until a value is set; an
  // empty color field is `null`, which is also what `onChange` reports.
  const colorValue = computed<Color | null>(() => colorValueRaw() ?? null);

  const defaultColorValue = (() => {
    const initial = initialValue();

    return initial ?? colorValue() ?? null;
  })();

  // --- Display text ---------------------------------------------------------
  // The text is not the value: the user edits it freely within the hex grammar
  // and only a commit turns it into a color.
  const inputValue = signal(colorText(colorValue()));

  // The text follows the committed value (an outside `value` change, a commit,
  // a step). The write is untracked so a user edit never feeds back into the
  // effect and never gets overwritten mid-typing.
  effect(() => {
    const color = colorValue();
    const next = colorText(color);

    untracked(() => {
      if (inputValue() !== next) {
        inputValue.set(next);
      }
    });
  });

  // --- Editing and rejection ------------------------------------------------
  // A rejected keystroke has to be pushed back into the native input: the
  // signal already holds the accepted text, so simply not writing leaves the
  // host showing the rejected text. Writing the rejected text once (a real
  // change, so a render runs) and restoring on the next pass is the same
  // two-step write NumberField uses for its parser rejections.
  const pendingRestore = signal<string | null>(null);

  effect(() => {
    const target = pendingRestore();

    if (target === null) {
      return;
    }

    pendingRestore.set(null);
    untracked(() => inputValue.set(target));
  });

  const setInputValue = (value: string) => {
    if (validateHexInput(value)) {
      inputValue.set(value);
      return;
    }

    const target = inputValue();

    if (value === target) {
      return;
    }

    pendingRestore.set(null);
    inputValue.set(value);
    pendingRestore.set(target);
  };

  // --- Parsing --------------------------------------------------------------
  /** Parses the text as a hex color; `undefined` when it is not one yet. */
  const parseText = (text: string): Color | undefined => {
    const trimmed = text.trim();

    if (trimmed === "" || !validateHexInput(trimmed)) {
      return undefined;
    }

    // The grammar accepts the `#`-less form ("0485F7"), which `parseColor`
    // does not, so the prefix is added here rather than in the grammar.
    const candidate = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

    try {
      return parseColor(candidate).toFormat("hex");
    } catch {
      return undefined;
    }
  };

  // --- Validation -----------------------------------------------------------
  const validationErrors = signal<readonly string[]>([]);

  const isInvalid = computed(() => validationErrors().length > 0);

  // --- Commands -------------------------------------------------------------
  const publish = (next: Color | null) => {
    setColorValue(next);
    inputValue.set(colorText(next));
    validationErrors.set(normalizeColorFieldValidation(props.validate?.(next)));
  };

  const commit = () => {
    const parsed = parseText(inputValue());
    const current = colorValue();
    // A text that is not a color ("", "#04") is not a value: the committed one
    // shows again, as React Aria's commit does (`setInputValue(colorValue …)`).
    const target = parsed ?? current;

    if (parsed) {
      if (!current || current.toString("hex") !== parsed.toString("hex")) {
        setColorValue(parsed);
      }

      inputValue.set(colorText(parsed));
    } else {
      inputValue.set(colorText(current));
    }

    validationErrors.set(normalizeColorFieldValidation(props.validate?.(target)));
  };

  // A field starts from 0: `increment` on an empty field gives "#000001", the
  // smallest color, mirroring React Aria's spin-button step from zero.
  const hexInt = (): number => colorValue()?.toHexInt() ?? 0;

  const fromHexInt = (value: number): Color => {
    const clamped = Math.max(0, Math.min(0xffffff, value));

    return parseColor(`#${clamped.toString(16).padStart(6, "0")}`);
  };

  const increment = () => publish(fromHexInt(hexInt() + 1));
  const decrement = () => publish(fromHexInt(hexInt() - 1));
  const incrementToMax = () => publish(fromHexInt(0xffffff));
  const decrementToMin = () => publish(fromHexInt(0));

  // --- Public surface -------------------------------------------------------
  const state: ColorFieldState = {
    inputValue,
    colorValue,
    defaultColorValue: () => defaultColorValue,
    setColorValue,
    setInputValue,
    commit,
    increment,
    decrement,
    incrementToMax,
    decrementToMin,
    validate: validateHexInput,
    isInvalid,
    validationErrors,
  };

  return {
    state,
    inputValue,
    setInputValue,
    commit,
    increment,
    decrement,
    incrementToMax,
    decrementToMin,
    colorValue,
    validationErrors,
  };
}

export type ColorFieldStateHandleResult = ReturnType<typeof createColorFieldState>;
