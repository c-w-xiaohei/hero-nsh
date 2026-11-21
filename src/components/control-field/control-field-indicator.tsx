import { computed, split, untracked, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { CheckboxContext } from "../checkbox/checkbox-context";
import { CheckboxControl } from "../checkbox/checkbox-control";
import { CheckboxIndicator } from "../checkbox/checkbox-indicator";
import { RadioGroupContext } from "../radio/radio-context";
import { RadioControl } from "../radio/radio-control";
import { RadioIndicator } from "../radio/radio-indicator";
import { RadioRoot } from "../radio/radio-root";
import { SwitchContext } from "../switch/switch-context";
import { SwitchControl } from "../switch/switch-control";
import { SwitchThumb } from "../switch/switch-thumb";
import {
  ControlFieldContext,
  controlFieldCheckboxContext,
  controlFieldRadioGroupContext,
  controlFieldSwitchContext,
  type ControlFieldRenderProps,
} from "./control-field-context";
import { controlFieldVariants } from "./control-field.styles";

/** The default control a `ControlField.Indicator` mounts for each variant. */
export type ControlFieldIndicatorVariant = "checkbox" | "radio" | "switch";

/**
 * The props of `ControlField.Indicator`: upstream's
 * `ControlFieldIndicatorProps` (`control-field.types.ts:47-56`) — `variant`
 * picks the default control when `children` is absent, and a function child
 * receives the row's render props.
 */
export interface ControlFieldIndicatorProps
  extends Omit<ViewProps, "children" | "class"> {
  /**
   * The control to render instead of the variant's default. A function
   * receives `{isSelected, isDisabled, isInvalid}`; a node renders as-is.
   * NSH has no `cloneElement`, so upstream's prop injection is a context —
   * the default pieces — or this render function (sheet §7).
   */
  children?: JSX.Element | ((values: ControlFieldRenderProps) => JSX.Element);

  /** Which default control to mount when `children` is absent. @default "switch" */
  variant?: ControlFieldIndicatorVariant;

  /** Appended to the slot's class; later classes win. */
  className?: string;

  /** The indicator's view. */
  ref?: (node: ViewRef) => void;
}

/**
 * The adapter between the row and the `switch` variant's default pair. The
 * context value is built in this component's owner scope (the `trackWidth`
 * channel is a signal inside it), so it lives in its own child component.
 */
function SwitchIndicator() {
  const field = ControlFieldContext();

  return (
    <SwitchContext.Provider value={controlFieldSwitchContext(field)}>
      {/* `testID`s name the default pieces: the adapted context's state is
          otherwise visible only through `viewStyle`'s backgroundColor — the
          only resolved style `nsh/test` can read (sheet §5). */}
      <SwitchControl testID="cf-switch-track">
        <SwitchThumb testID="cf-switch-thumb" />
      </SwitchControl>
    </SwitchContext.Provider>
  );
}

/** The `checkbox` variant's default pair. */
function CheckboxIndicatorPiece() {
  const field = ControlFieldContext();

  return (
    <CheckboxContext.Provider value={controlFieldCheckboxContext(field)}>
      <CheckboxControl testID="cf-checkbox-control">
        <CheckboxIndicator testID="cf-checkbox-indicator" />
      </CheckboxControl>
    </CheckboxContext.Provider>
  );
}

/** The `radio` variant's default piece: one `Radio` under the minimal group adapter. */
function RadioIndicatorPiece() {
  const field = ControlFieldContext();

  return (
    <RadioGroupContext.Provider value={controlFieldRadioGroupContext(field)}>
      {/* `value` is the constant the adapter's `selectedValue` answers with;
          the item never carries group semantics of its own. */}
      <RadioRoot value="control-field">
        <RadioControl testID="cf-radio-control">
          <RadioIndicator testID="cf-radio-indicator" />
        </RadioControl>
      </RadioRoot>
    </RadioGroupContext.Provider>
  );
}

/**
 * ControlField.Indicator / ControlFieldIndicator: the control slot. With no
 * `children` it mounts `variant`'s default piece under the adapted control
 * context; with a function child it runs the render prop with the row's state
 * accessors — the row and its inner control still toggle exactly once, because
 * the adapted piece's commit channels all point at the row's
 * `onSelectedChange` and its press channels are never fed a press of their own.
 */
export function ControlFieldIndicator(props: ControlFieldIndicatorProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "variant",
    "className",
    "ref",
  ] as const);

  const field = ControlFieldContext();
  const variant = () => local.variant ?? "switch";

  /** The variant's default piece, mounted when `children` is empty. */
  const defaultPiece = () => {
    const name = variant();
    if (name === "checkbox") {
      return <CheckboxIndicatorPiece />;
    }
    if (name === "radio") {
      return <RadioIndicatorPiece />;
    }

    return <SwitchIndicator />;
  };

  // `local.children` builds its views at read time under the reader's owner —
  // it is resolved inline at the View's children position, where the mount
  // already sits under the control-context Providers (same reason the row
  // resolves inline; an absent or empty children falls back to the variant's
  // default piece).
  const resolveChildren = (
    children: JSX.Element | ((values: ControlFieldRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      const renderProps: ControlFieldRenderProps = {
        isSelected: field.isSelected,
        isDisabled: field.isDisabled,
        isInvalid: field.isInvalid,
      };

      return untracked(() =>
        (children as (values: ControlFieldRenderProps) => JSX.Element)(renderProps),
      );
    }

    return (children as JSX.Element) ?? defaultPiece();
  };

  const classes = computed(() =>
    [controlFieldVariants().indicator(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={classes()}
    >
      {resolveChildren(local.children)}
    </View>
  );
}
