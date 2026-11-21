import { context, createAnimatedValue, signal } from "nsh";
import type { Accessor } from "nsh";

import type { PressFeedback } from "../../primitives/pressable";

import {
  FALLBACK_CHECKBOX_CONTEXT,
  type CheckboxContextValue,
} from "../checkbox/checkbox-context";
import type { RadioGroupContextValue } from "../radio/radio-context";
import {
  FALLBACK_SWITCH_CONTEXT,
  type SwitchContextValue,
} from "../switch/switch-context";

/* -------------------------------------------------------------------------------------------------
 * ControlField context
 * -----------------------------------------------------------------------------------------------*/

/**
 * What `ControlField.Indicator`'s function children receive: the upstream
 * `ControlFieldRenderProps` (`control-field.types.ts:8-12`) as accessors, per
 * D17.
 */
export interface ControlFieldRenderProps {
  isSelected: Accessor<boolean | undefined>;
  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
}

/**
 * The live state one `ControlField` row hands to the parts inside it. It is the
 * port of upstream's `ControlFieldContextValue` (`control-field.types.ts:61-67`)
 * plus the channels NSH needs in place of what upstream reached by other means:
 *
 * - `isPressed` is the row-level press mirror. Upstream carries it as a
 *   `SharedValue<boolean>` the nested control's own animation reads; every
 *   accessor in NSH is already a `SharedValue`-shaped read, so the value is an
 *   `Accessor<boolean>` the adapted control contexts mirror — and, like
 *   upstream's `handlePressIn`, it follows the row's press in BOTH
 *   environments, independent of the touch-gated feedback seam (sheet §1).
 * - `isAllAnimationsDisabled` is the cascade `animation="disable-all"` sets
 *   (`getRootAnimationState`), provided for function children and consumers;
 *   the three adapted controls have no `animation` prop of their own, so the
 *   flag reaches them through this context only.
 * - `registerLabel` / `registerDescription` / `registerError` and the joined
 *   texts are the row's accessible-name channel, the same registration the
 *   field roots run (`switch-root.tsx`): a `Label` inside the row names it
 *   through `FieldContext`, and the texts the row exposes to the adapted
 *   controls' `ariaLabel` come back through here.
 *
 * The row's `onPress` is deliberately absent: the row is the only toggle
 * commit point, so the parts receive the flag (`isSelected`) and the commit
 * (`onSelectedChange`) but never a second activation path.
 */
/**
 * The touch-gated `createPressFeedback` seam, seen from inside the row — the
 * read half of what `PressableFeedbackContextValue` hands its parts
 * (`press-feedback-types.ts:251`), named `feedback` to keep it apart from the
 * row's own `isPressed` mirror. The press driver functions are deliberately
 * left out: the row's `View` owns the writers, consumers only read.
 *
 * `nsh/test` can reach neither a view's `hitSlop` prop nor an
 * `AnimatedValue`-bound style, so these channels are the seam's only
 * observable surface (sheet §5, M-001/M-002/M-013).
 */
export interface ControlFieldFeedbackChannels
  extends Omit<PressFeedback, "pressDown" | "pressUp" | "layout"> {
  /** The seam's effective gate (`input()==="touch"` and not `isDisabled`). */
  enabled: Accessor<boolean>;
}

export interface ControlFieldContextValue {
  /** The row's controlled selection flag, `undefined` while the caller drives none. */
  isSelected: Accessor<boolean | undefined>;

  /** The one commit channel: the row's prop, called with the next value. */
  onSelectedChange: ((isSelected: boolean) => void) | undefined;

  isDisabled: Accessor<boolean>;
  isInvalid: Accessor<boolean>;
  isRequired: Accessor<boolean>;

  /**
   * The row's own press state, mirrored on every press in both environments —
   * upstream's `SharedValue` semantics. The seam's gated flag lives at
   * `feedback.isPressed` instead.
   */
  isPressed: Accessor<boolean>;

  /** Writes the row's press mirror; the row and a Label inside it call it. */
  setPressed: (isPressed: boolean) => void;

  /** The row's touch-gated press-feedback channels (read-only). */
  feedback: ControlFieldFeedbackChannels;

  /** `animation="disable-all"` on the row, cascaded to consumers. */
  isAllAnimationsDisabled: Accessor<boolean>;

  /** The text every `Label` inside the row registered, joined with spaces. */
  labelText: Accessor<string | undefined>;

  /** The text every `Description` inside the row registered. */
  descriptionText: Accessor<string | undefined>;

  /** The text every visible `FieldError` inside the row registered. */
  errorText: Accessor<string | undefined>;

  /** A `Label` registers its text for the row's accessible name. */
  registerLabel: (text: () => string | undefined) => () => void;

  /** A `Description` registers its text. */
  registerDescription: (text: () => string | undefined) => () => void;

  /** A `FieldError` registers its visible message. */
  registerError: (text: () => string | undefined) => () => void;
}

/**
 * What a part sees outside a `ControlField` root: the resting state, as
 * `FALLBACK_CHECKBOX_CONTEXT` does for a lone Checkbox part. The row's context
 * is `context<T>(default)`, not `context<T | undefined>(undefined)`, so the
 * parts read it unconditionally.
 */
const RESTING_CONTROL_FIELD: ControlFieldContextValue = {
  isSelected: () => undefined,
  onSelectedChange: undefined,
  isDisabled: () => false,
  isInvalid: () => false,
  isRequired: () => false,
  isPressed: () => false,
  setPressed: () => {},
  feedback: {
    isPressed: () => false,
    pressed: createAnimatedValue(0),
    scale: createAnimatedValue(1),
    highlightOpacity: createAnimatedValue(0),
    hitSlop: () => undefined,
    pressOrigin: () => null,
    bounds: () => ({ width: 0, height: 0 }),
    enabled: () => false,
  },
  isAllAnimationsDisabled: () => false,
  labelText: () => undefined,
  descriptionText: () => undefined,
  errorText: () => undefined,
  registerLabel: () => () => {},
  registerDescription: () => () => {},
  registerError: () => () => {},
};

export const ControlFieldContext =
  context<ControlFieldContextValue>(RESTING_CONTROL_FIELD);

/* -------------------------------------------------------------------------------------------------
 * Control-context adapters
 * -----------------------------------------------------------------------------------------------*/

/**
 * The row's state re-expressed as each nested control's own context. NSH has
 * no `cloneElement`, so upstream's `enhancedChildren` prop injection
 * (`control-field.tsx:157-173`) becomes a provider that rewrites the context
 * the default piece reads: selection and flags flow down, the commit flows up
 * through `state`, and every interaction channel the row does not feed is
 * pinned to its resting value so the piece never activates on its own —
 * the row stays the only toggle commit point (sheet §1, action-list §3.2).
 */

/** `checkbox`: a `CheckboxContext` over the row, for `Checkbox.Control`+`Checkbox.Indicator`. */
export function controlFieldCheckboxContext(
  field: ControlFieldContextValue,
): CheckboxContextValue {
  const setSelected = (isSelected: boolean) => field.onSelectedChange?.(isSelected);

  return {
    ...FALLBACK_CHECKBOX_CONTEXT,
    isSelected: () => field.isSelected() === true,
    isDisabled: field.isDisabled,
    isInvalid: field.isInvalid,
    isRequired: field.isRequired,
    // The row's press mirror stands in for both press signals (upstream's
    // SharedValue semantics: the nested control reads the row's press).
    isPressed: field.isPressed,
    isActive: field.isPressed,
    // Not a focus stop: the row's press is the only activation.
    focusable: () => false,
    state: {
      isSelected: () => field.isSelected() === true,
      setSelected,
      toggle: () => field.onSelectedChange?.(!(field.isSelected() === true)),
    },
    labelText: field.labelText,
    descriptionText: field.descriptionText,
    errorText: field.errorText,
  };
}

/** `switch`: a `SwitchContext` over the row, for `Switch.Control`+`Switch.Thumb`. */
export function controlFieldSwitchContext(
  field: ControlFieldContextValue,
): SwitchContextValue {
  const setSelected = (isSelected: boolean) => field.onSelectedChange?.(isSelected);
  // The track reports its width so the thumb can position itself; the channel
  // is the part pair's private signal, created in the indicator's owner scope.
  const trackWidth = signal(0);

  return {
    ...FALLBACK_SWITCH_CONTEXT,
    isSelected: () => field.isSelected() === true,
    isDisabled: field.isDisabled,
    isInvalid: field.isInvalid,
    isRequired: field.isRequired,
    isPressed: field.isPressed,
    isActive: field.isPressed,
    focusable: () => false,
    state: {
      isSelected: () => field.isSelected() === true,
      setSelected,
      toggle: () => field.onSelectedChange?.(!(field.isSelected() === true)),
    },
    labelText: field.labelText,
    descriptionText: field.descriptionText,
    errorText: field.errorText,
    trackWidth,
    setTrackWidth: (width: number) => trackWidth.set(width),
  };
}

/**
 * The value one `Radio` item registers against, when the item sits inside a
 * `ControlField` instead of a group: `state.selectedValue` mirrors the row's
 * flag, `select` commits `true` through the row, and `isTabStop` is always
 * false — the row keeps the only activation, so the item is display-only
 * (sheet §5: no independent radio-group semantics).
 */
export function controlFieldRadioGroupContext(
  field: ControlFieldContextValue,
): RadioGroupContextValue {
  const VALUE = "control-field";

  const selected = () => field.isSelected() === true;

  return {
    variant: () => "primary",
    orientation: () => "vertical",
    state: {
      selectedValue: () => (selected() ? VALUE : null),
      setSelectedValue: (value: string | null) => {
        if (value !== null) {
          field.onSelectedChange?.(true);
        }
      },
      defaultSelectedValue: () => (selected() ? VALUE : null),
      lastFocusedValue: () => null,
      setLastFocusedValue: () => {},
      isDisabled: field.isDisabled,
      isReadOnly: () => false,
      isRequired: field.isRequired,
      isInvalid: field.isInvalid,
    },
    isDisabled: field.isDisabled,
    isReadOnly: () => false,
    isRequired: field.isRequired,
    isInvalid: field.isInvalid,
    validationErrors: () => [],
    itemClass: () => undefined,
    registerItem: () => () => {},
    isTabStop: () => false,
    setItemFocused: () => {},
    select: (value: string) => {
      if (value !== null && value !== undefined) {
        field.onSelectedChange?.(true);
      }
    },
    requestFocus: () => {},
  };
}
