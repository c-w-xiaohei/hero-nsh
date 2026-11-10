import type { Accessor, JSX, ViewProps, ViewRef } from "nsh";
import { computed, createAnimatedValue, effect, reduceMotion, split, Text, View } from "nsh";

import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, GlobalDomProps } from "./input-otp-dom-props";
import { hostProps } from "./input-otp-dom-props";
import { InputOTPContext } from "./input-otp-context";

/** `ease-smooth`'s cubic bezier (`harness/nsh.json`), as the native animations take it. */
const EASE_SMOOTH: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/** CSS's `ease-out`, the caret's per-segment curve. */
const EASE_OUT: [number, number, number, number] = [0, 0, 0.58, 1];

/* -------------------------------------------------------------------------------------------------
 * InputOTP Slot
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `InputOTP.Slot`: HeroUI 3.2.7's `InputOTPSlotProps`, a `div`'s
 * intrinsic attributes plus the cell's `index`.
 *
 * `char`, `isActive` and `hasFakeCaret` are not props upstream either: React
 * reads them from `OTPInputContext.slots[index]`. Here the slot derives the
 * same three values from the root's code and active cells (port sheet §1.4).
 */
export interface InputOTPSlotProps
  extends Omit<ViewProps, "children" | "class" | "classList" | "style" | "ref" | "testID">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The cell's position. Past `maxLength` the cell stays empty and never active, as upstream. */
  index: number;

  /**
   * Accepted, no effect: upstream spreads the caller's props on the `div` and
   * then overwrites the children with the character and the caret (port sheet
   * §1.4).
   */
  children?: JSX.Element;

  /** Appended after the cell's slot classes; later classes win. */
  className?: string;

  /** Style of the cell; the transition's property list is written after it (R-011). */
  style?: ViewProps["style"];

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to (NSH's counterpart of a DOM id). */
  nativeID?: string;

  /** The accessible name. */
  "aria-label"?: string;

  /** The accessible name through NSH's own prop, below `aria-label`. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no tab order on plain views. */
  tabIndex?: number;

  /** Accepted, no effect: views take presses through `onPress`. */
  onClick?: unknown;

  /** Accepted, no effect, as `onClick`. */
  onDoubleClick?: unknown;

  /** Accepted, no effect, as `onClick`. */
  onMouseDown?: unknown;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Forwarded to the `View` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `InputOTP.Slot` / `InputOTPSlot`: one cell. The box is a view whose state
 * classes come from the root's context (active / filled / disabled / invalid,
 * R-013 … R-016 and R-027); the character and the fake caret are real child
 * views mounted only while they apply, as upstream's two conditional `div`s.
 */
export function InputOTPSlot(props: InputOTPSlotProps): JSX.Element {
  const [local, rest] = split(props, [
    "index",
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "aria-label",
    "accessibilityLabel",
    "tabIndex",
    "onClick",
    "onDoubleClick",
    "onMouseDown",
    "render",
    "slot",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Read once in the body: the root whose cell this is, if any.
  const ctx = InputOTPContext();

  const index = () => local.index;

  // `OTPInputContext.slots[index]`: past `maxLength` there is no entry, so the
  // cell is empty and never active even when a controlled code is longer.
  const inRange = computed(() => {
    const at = index();

    return at >= 0 && at < (ctx?.maxLength() ?? 0);
  });

  const char = computed<string | undefined>(() => {
    if (!inRange()) {
      return undefined;
    }

    return ctx?.value()[index()];
  });

  const isActive = computed(() => inRange() && (ctx?.activeSlots().includes(index()) ?? false));

  const hasFakeCaret = computed(() => isActive() && char() === undefined);

  const secondary = computed(() => (ctx?.variant() ?? "primary") === "secondary");

  const classes = computed(() => joinClassNames(ctx?.slots.slot() ?? "", local.className));

  // R-011: `.input-otp__slot`'s three transitioned properties, inline; reduced
  // motion turns the list off. The duration and the curve stay in the class.
  const style = computed<ViewProps["style"]>(() => [
    local.style,
    {
      transitionProperty: reduceMotion()
        ? "none"
        : "background-color, border-color, box-shadow",
    },
  ]);

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      // A fixed test identity, not a public prop (port sheet §4b).
      testID="input-otp-slot"
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      classList={{
        // R-013: `[data-active="true"]` → `z-10 bg-field-focus` plus
        // `status-focused-field` (`focus-field-ring`).
        "z-10 bg-field-focus ring-2 ring-focus ring-offset-0 outline-none": isActive(),
        // R-014: `[data-filled="true"]` → `bg-field-focus`.
        "bg-field-focus": char() !== undefined,
        // R-015: `[data-disabled="true"]` → `status-disabled`, as literals.
        "opacity-50 cursor-not-allowed pointer-events-none": ctx?.isDisabled() ?? false,
        // R-016: `status-invalid-field`'s unfocused half and the focus fill.
        // The focused half (`ring-2 ring-danger`) never applies: the focus is
        // always on the covering input, so the cell is never `:focus-within`.
        "outline-1 outline-danger outline-solid bg-field-focus": ctx?.isInvalid() ?? false,
        // R-027: secondary's active / filled fill, after R-013 / R-014 so it
        // wins over `bg-field-focus`.
        "bg-default": secondary() && (isActive() || char() !== undefined),
      }}
      style={style()}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
    >
      <If when={char() !== undefined}>
        <InputOTPSlotValue char={char} class={ctx?.slots.slotValue() ?? ""} />
      </If>
      <If when={hasFakeCaret()}>
        <InputOTPSlotCaret class={ctx?.slots.caret() ?? ""} />
      </If>
    </View>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Slot internals: the character and the fake caret
 * -----------------------------------------------------------------------------------------------*/

/**
 * The cell's character, mounted only while the cell has one (R-018, R-028).
 *
 * Upstream animates `.input-otp__slot-value` with the `slot-value-in` keyframes:
 * `0% { opacity: 0; transform: translateY(8px) scale(.8) }`,
 * `100% { opacity: 1; transform: none }`, 250ms, `ease-smooth`, `both`, and
 * `motion-reduce:animate-none`. NSH has no custom keyframes, so the same
 * numbers run on three animated values, played when the view mounts: a
 * replaced character keeps the view and does not replay, exactly as upstream.
 */
function InputOTPSlotValue(props: {
  char: Accessor<string | undefined>;
  class: string;
}): JSX.Element {
  const opacity = createAnimatedValue(1);
  const offsetY = createAnimatedValue(0);
  const scale = createAnimatedValue(1);

  effect(() => {
    if (reduceMotion()) {
      opacity.set(1);
      offsetY.set(0);
      scale.set(1);

      return;
    }

    opacity.set(0);
    offsetY.set(8);
    scale.set(0.8);

    void opacity.timing(1, { duration: 250, easing: EASE_SMOOTH });
    void offsetY.timing(0, { duration: 250, easing: EASE_SMOOTH });
    void scale.timing(1, { duration: 250, easing: EASE_SMOOTH });

    return () => {
      void opacity.stop();
      void offsetY.stop();
      void scale.stop();
    };
  });

  return (
    <View
      // A fixed test identity, not a public prop (port sheet §4b).
      testID="input-otp-slot-value"
      class={props.class}
      style={{ opacity, translate: [0, offsetY], scale }}
    >
      <Text>{props.char() ?? ""}</Text>
    </View>
  );
}

/**
 * The fake caret, mounted only in the active empty cell, as upstream's
 * `{hasFakeCaret && isActive ? <div/> : null}`.
 *
 * R-021: `.input-otp__caret`'s `caret-blink 1.2s ease-out infinite` — opaque at
 * 0%, transparent at 20%, transparent at 50%, opaque at 70% and 100%. The
 * native animation takes those offsets directly, so the blink keeps upstream's
 * timing; `motion-reduce` stays at the first frame.
 */
function InputOTPSlotCaret(props: { class: string }): JSX.Element {
  const opacity = createAnimatedValue(1);

  effect(() => {
    if (reduceMotion()) {
      opacity.set(1);

      return;
    }

    opacity.set(1);
    void opacity.keyframes(
      [
        { offset: 0, value: 1 },
        { offset: 0.2, value: 0 },
        { offset: 0.5, value: 0 },
        { offset: 0.7, value: 1 },
        { offset: 1, value: 1 },
      ],
      { duration: 1200, easing: EASE_OUT, iterations: "infinite" },
    );

    return () => {
      void opacity.stop();
    };
  });

  return (
    <View
      // A fixed test identity, not a public prop (port sheet §4b).
      testID="input-otp-caret"
      class={props.class}
      style={{ opacity }}
    />
  );
}
