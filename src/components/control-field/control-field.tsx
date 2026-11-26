import { computed, signal, split, untracked, View } from "nsh";
import type { Accessor, Bounds, JSX, PressEvent, ViewProps, ViewRef } from "nsh";

import { createInput } from "../../primitives/environment";
import {
  createPressFeedback,
  getRootAnimationState,
} from "../../primitives/pressable";
import { DescriptionContext } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import { FieldContext } from "../label/context";
import { ControlFieldContext, type ControlFieldContextValue, type ControlFieldRenderProps } from "./control-field-context";
import { controlFieldVariants } from "./control-field.styles";

/**
 * The props of `ControlField` / `ControlFieldRoot`: upstream's
 * `ControlFieldProps` (`control-field.types.ts:16-42`) on NSH's view host
 * props, with `children` narrowed to an element or a render function of the
 * row's state — upstream accepts the same union, and the function form is the
 * replacement for the `cloneElement` injection NSH cannot run (sheet §7).
 *
 * A `PressableProps` upstream, so the pressable view props travel through
 * `rest` to the row `View` (`onLongPress`, `tooltip`, `role`, …). `hitSlop`
 * stays off the public surface: the press-feedback seam computes it.
 */
export interface ControlFieldRootProps
  extends Omit<ViewProps, "children" | "class" | "hitSlop"> {
  /** The row's content, or a render function of `{isSelected, isDisabled, isInvalid}`. */
  children?: JSX.Element | ((values: ControlFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Whether the control is selected. */
  isSelected?: boolean;

  /** Called with the next value on a completed row press; the row is the only commit point. */
  onSelectedChange?: (isSelected: boolean) => void;

  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;

  /**
   * `getRootAnimationState` input, the upstream `AnimationRootDisableAll`
   * narrowed to the value that exists there: `"disable-all"` cascades through
   * `ControlFieldContext.isAllAnimationsDisabled` and switches the row's own
   * press-feedback animation channel off. The canonical `isPressed` mirror
   * and `onSelectedChange` are unaffected (the contract surface, M-036).
   */
  animation?: "disable-all";

  /** Names the row; wins over the text a `Label` inside registers. */
  "aria-label"?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** The row's view, as NSH forwards refs (a callback). */
  ref?: (node: ViewRef) => void;
}

function joinRegistered(values: readonly (() => string | undefined)[]): string | undefined {
  const text = values
    .map((value) => value())
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/**
 * ControlField.Root / ControlFieldRoot: the pressable settings row heroui-native
 * builds around a nested control (`control-field.tsx:52-143`). The row owns the
 * press lifecycle and is the only commit point — a completed press reports
 * `onPress` and then calls `onSelectedChange(!isSelected)` exactly once, while
 * the indicator's default control is state-fed through an adapted context and
 * never activates on its own (sheet §1).
 *
 * Divergence goes through the seams only: the `input` axis of
 * `controlFieldVariants` sets the touch minimum row height, and
 * `createPressFeedback` — gated on `input() === "touch"` — owns the invisible
 * hit-area expansion (`hitSlop`). Under the default pointer environment the
 * gate is closed, so the row pays nothing; its press mirror (`isPressed`)
 * still follows every press, as upstream's `SharedValue` did.
 */
export function ControlFieldRoot(props: ControlFieldRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "isSelected",
    "onSelectedChange",
    "isDisabled",
    "isInvalid",
    "isRequired",
    "animation",
    "id",
    "nativeID",
    "testID",
    "role",
    "tooltip",
    "focusable",
    "onPress",
    "onPressDown",
    "onPressUp",
    "onLongPress",
    "onLayout",
    "onFocus",
    "onBlur",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "accessibilityElementsHidden",
    "aria-label",
    "render",
    "ref",
  ] as const);

  const input = createInput();

  const isDisabled = () => local.isDisabled === true;
  const isInvalid = () => local.isInvalid === true;
  const isRequired = () => local.isRequired === true;
  const isSelected: Accessor<boolean | undefined> = () => local.isSelected;

  // The `animation` prop's three-tier flow (`control-field.animation.ts`):
  // `"disable-all"` cascades; the canonical press state is not an animation.
  const { isAllAnimationsDisabled, isAnimationDisabled } =
    getRootAnimationState(local.animation);

  // The row's press mirror: unconditional, both environments — upstream's
  // `isPressed` SharedValue is set on `handlePressIn`/`handlePressOut`
  // regardless of platform. The touch-gated `feedback` seam below is a
  // different channel (its `isPressed` stays down under pointer).
  const pressed = signal(false);

  // The hit-area path and the canonical feedback channels. `"disable-all"`
  // maps to `"disabled"` here: the row binds `scale` on its own style, so the
  // channel must rest at 1 — while `isPressed`/`hitSlop` keep working, since
  // they are the contract surface, not animation (sheet A-002).
  const enabled = () => input() === "touch" && !isDisabled();
  const feedback = createPressFeedback({
    enabled,
    animation: isAnimationDisabled ? "disabled" : undefined,
  });

  /* --- The one toggle commit --------------------------------------------- */
  const toggle = () => {
    if (isDisabled() || local.onSelectedChange === undefined || local.isSelected === undefined) {
      return;
    }

    local.onSelectedChange(!local.isSelected);
  };

  const handlePressDown = (event: PressEvent) => {
    feedback.pressDown(event);
    pressed.set(true);
    local.onPressDown?.(event);
  };

  const handlePressUp = (event: PressEvent) => {
    feedback.pressUp(event);
    pressed.set(false);
    local.onPressUp?.(event);
  };

  // Sheet M-007: `onPress` completes before the selection write — the same
  // order `switch-root`'s `focusField` keeps (`press`, then `toggle`).
  const handlePress = (event: PressEvent) => {
    local.onPress?.(event);
    toggle();
  };

  /* --- The label's press, standing in for `<label for>` ------------------- */
  let rowNode: ViewRef | undefined;

  // A `Label` inside the row reports its held press here (the field's own
  // press signals, exactly as `switch-root`'s `pressFieldStart/Up`), and the
  // completed press through `focusField`: upstream's `<label for>` focuses the
  // control and activates it, which for this row is focus + the single toggle.
  const pressFieldStart = (_event: PressEvent) => {
    if (isDisabled()) {
      return;
    }

    pressed.set(true);
  };

  const pressFieldUp = (_event: PressEvent) => {
    pressed.set(false);
  };

  const focusField = (event?: PressEvent) => {
    pressed.set(false);

    if (isDisabled()) {
      return;
    }

    if (event) {
      local.onPress?.(event);
    }

    toggle();
    rowNode?.focus();
  };

  /* --- Registered texts (the row's accessible name) ------------------------ */
  const labelTexts = signal<readonly (() => string | undefined)[]>([]);
  const descriptionTexts = signal<readonly (() => string | undefined)[]>([]);
  const errorTexts = signal<readonly (() => string | undefined)[]>([]);

  const register =
    (registry: typeof labelTexts) =>
    (text: () => string | undefined) => {
      registry.update((current) => [...current, text]);

      return () => {
        registry.update((current) => current.filter((entry) => entry !== text));
      };
    };

  const registerLabel = register(labelTexts);
  const registerDescription = register(descriptionTexts);
  const registerError = register(errorTexts);

  const labelText = computed(() => joinRegistered(labelTexts()));
  const descriptionText = computed(() => joinRegistered(descriptionTexts()));
  const errorText = computed(() => joinRegistered(errorTexts()));

  /* --- Contexts ------------------------------------------------------------ */
  const renderProps: ControlFieldRenderProps = {
    isSelected,
    isDisabled,
    isInvalid,
  };

  const fieldValue: ControlFieldContextValue = {
    isSelected,
    onSelectedChange: local.onSelectedChange,
    isDisabled,
    isInvalid,
    isRequired,
    isPressed: pressed,
    setPressed: (value) => pressed.set(value),
    // The seam's read half: the row's `View` keeps the writers (pressDown /
    // pressUp / layout), consumers only observe the channels — the same
    // split `PressableFeedbackContextValue` makes.
    feedback: {
      isPressed: feedback.isPressed,
      pressed: feedback.pressed,
      scale: feedback.scale,
      highlightOpacity: feedback.highlightOpacity,
      hitSlop: feedback.hitSlop,
      pressOrigin: feedback.pressOrigin,
      bounds: feedback.bounds,
      enabled,
    },
    isAllAnimationsDisabled: () => isAllAnimationsDisabled,
    labelText,
    descriptionText,
    errorText,
    registerLabel,
    registerDescription,
    registerError,
  };

  // `FieldContext` is what a `Label` / the group contexts read for the field
  // state and the `<label for>` stand-ins (`focusField`, `pressFieldStart/Up`);
  // `registerLabel` names the row.
  const fieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel,
    focusField,
    pressFieldStart,
    pressFieldUp,
  };

  const descriptionState = {
    registerDescription,
  };

  const fieldErrorState = {
    isInvalid,
    // A toggle field stacks the error under the label (`isToggleField`,
    // `field-error/context.ts`).
    isToggleField: () => true,
    registerErrorMessage: registerError,
  };

  /* --- Children, read once at the placement --------------------------------- */
  // `local.children` builds its views at read time under the reader's owner —
  // it must be read inline at the View's children position, where the mount
  // already sits under the Providers; reading it inside a `computed` would
  // build the parts under this component's own owner, above the Provider
  // (the same reason `switch-root` resolves inline).
  const resolveChildren = (
    children: JSX.Element | ((values: ControlFieldRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      // The render function runs untracked, per D17; its subtree still reads
      // the accessors it received reactively.
      return untracked(() =>
        (children as (values: ControlFieldRenderProps) => JSX.Element)(renderProps),
      );
    }

    return children as JSX.Element;
  };

  const classes = computed(() =>
    [
      controlFieldVariants({ input: input() }).root(),
      local.className ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const handleLayout = (event: { bounds: Bounds }) => {
    feedback.layout(event);
    local.onLayout?.(event);
  };

  return (
    <ControlFieldContext.Provider value={fieldValue}>
      <FieldContext.Provider value={fieldState}>
        <DescriptionContext.Provider value={descriptionState}>
          <FieldErrorContext.Provider value={fieldErrorState}>
            <View
              {...rest}
              ref={(node) => {
                rowNode = node;
                local.ref?.(node);
              }}
              testID={local.testID}
              nativeID={local.id ?? local.nativeID}
              role={local.role}
              tooltip={local.tooltip}
              // A real row keeps a focus stop so `focusField` (and a
              // touchscreen's focus search) can land on it; `focusable` is
              // a caller prop either way.
              focusable={local.focusable ?? true}
              disabled={isDisabled()}
              accessibilityLabel={
                local["aria-label"] ?? local.accessibilityLabel ?? labelText()
              }
              accessibilityHint={local.accessibilityHint}
              accessibilityState={{
                selected: isSelected() === true,
                disabled: isDisabled(),
                ...local.accessibilityState,
              }}
              accessibilityElementsHidden={local.accessibilityElementsHidden}
              class={classes()}
              classList={{
                "opacity-50": isDisabled(),
              }}
              // `scale` is bound unconditionally: the factory pins it to 1
              // while the channel is disabled (`animation="disable-all"`,
              // `reduceMotion`), and the seam is the channel's only writer.
              style={[{ scale: feedback.scale }, local.style]}
              hitSlop={feedback.hitSlop()}
              onPress={handlePress}
              onPressDown={handlePressDown}
              onPressUp={handlePressUp}
              onLongPress={local.onLongPress}
              onFocus={local.onFocus}
              onBlur={local.onBlur}
              onLayout={handleLayout}
            >
              {resolveChildren(local.children)}
            </View>
          </FieldErrorContext.Provider>
        </DescriptionContext.Provider>
      </FieldContext.Provider>
    </ControlFieldContext.Provider>
  );
}
