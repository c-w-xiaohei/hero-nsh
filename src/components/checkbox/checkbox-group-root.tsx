import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, signal, split, untracked, View } from "nsh";

import { DescriptionContext } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import { FieldsetContext } from "../fieldset/context";
import { FieldContext } from "../label/context";
import type { CheckboxGroupRenderProps } from "./checkbox-context";
import { CheckboxGroupContext, type CheckboxGroupContextValue } from "./checkbox-context";
import {
  checkboxGroupVariants,
  type CheckboxGroupVariant,
} from "./checkbox.styles";
import {
  createCheckboxGroupState,
  type CheckboxGroupValidationError,
} from "./create-checkbox-group-state";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

export type { CheckboxGroupRenderProps } from "./checkbox-context";

/* -------------------------------------------------------------------------------------------------
 * CheckboxGroup Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `CheckboxGroup.Root` / `CheckboxGroup`: HeroUI 3.2.7's
 * `CheckboxGroupProps`, which is React Aria Components' `CheckboxGroup` (a
 * `div` with `role="group"`) plus the `variant` dimension, expressed with
 * NSH's view host props.
 *
 * The DOM-only members upstream (`name`, `form`, `render`, `slot`, the
 * `aria-*` references) are accepted so code written against HeroUI keeps
 * compiling; the port sheet §1 says what each can and cannot do here.
 */
export interface CheckboxGroupRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  /**
   * The group's content: an element, or a render prop called once with the
   * group state (D17). Bare strings and numbers become `Text` at the placement.
   */
  children?: JSX.Element | ((values: CheckboxGroupRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: CheckboxGroupRenderProps) => string | undefined);

  /** Style of the group root; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: CheckboxGroupRenderProps) => StyleProp<ViewStyle>);

  /** The only variant dimension; inherited by items that set none. @default "primary" */
  variant?: CheckboxGroupVariant;

  /** The selected values, controlled. */
  value?: string[];

  /** The initial selected values, uncontrolled. */
  defaultValue?: string[];

  /** Called with the next values whenever the user changes the selection. */
  onChange?: (value: string[]) => void;

  /** Disables every item in the group. */
  isDisabled?: boolean;

  /** Keeps every item focusable while blocking value changes. */
  isReadOnly?: boolean;

  /** Marks the group required; the group's own Label shows the asterisk. */
  isRequired?: boolean;

  /** Marks the group invalid; a `FieldError` inside it shows its message. */
  isInvalid?: boolean;

  /** Runs whenever the selection changes; `true` means valid. */
  validate?: (
    value: string[],
  ) => true | string | CheckboxGroupValidationError | null | undefined;

  /** When the group's validation message appears: `native` after the first change, `aria` live. @default "native" */
  validationBehavior?: "native" | "aria";

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no DOM form ownership. */
  form?: string;

  /** The focus entered the group (React Aria's `useFocusWithin`). */
  onFocus?: () => void;

  /** The focus left the group: no item inside it is focused any more. */
  onBlur?: () => void;

  /** Both focus-within transitions, as `useFocusWithin` reports them. */
  onFocusChange?: (isFocused: boolean) => void;

  /** Names the group; it wins over the text the group Label registered. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-errormessage"?: string;

  /** An identifier for UI tests, on the group root. */
  testID?: string;

  /** The name other elements refer to; also set by `id`. */
  nativeID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** A hint shown while the pointer rests on the group. */
  tooltip?: JSX.Element;

  /** The group root was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** The group root's view. */
  ref?: (node: ViewRef) => void;

  /** NSH's accessible name for the group; `aria-label` is the HeroUI name. */
  accessibilityLabel?: string;

  /** Hides the group and its subtree from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;
}

function joinRegistered(values: readonly (() => string | undefined)[]): string | undefined {
  const text = values
    .map((value) => value())
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/**
 * `CheckboxGroup.Root` / `CheckboxGroupRoot`: a `role="group"` field root that
 * owns the selected values, the validation and the variant, and hands them to
 * every `Checkbox` inside it (port sheet §2).
 *
 * It is built on the core `View`, not on nsh/base: there is no
 * `CheckboxGroup` there at all (`base.d.ts` has only `RadioGroup` and
 * `ToggleGroup`), and neither of those can express "independent switches, an
 * array value, one variant handed down" (port sheet §3).
 */
export function CheckboxGroupRoot(props: CheckboxGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "variant",
    "value",
    "defaultValue",
    "onChange",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "validate",
    "validationBehavior",
    "name",
    "form",
    "onFocus",
    "onBlur",
    "onFocusChange",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "testID",
    "nativeID",
    "id",
    "tooltip",
    "onLayout",
    "ref",
    "accessibilityLabel",
    "accessibilityElementsHidden",
    "render",
    "slot",
  ] as const);

  // R-041 / R-043 / R-044: the group's own look comes from the variant table;
  // the variant carries no class (its visible effect lands on each item's
  // Control), so the table is consulted for the base slot only.
  const variant = computed<CheckboxGroupVariant | undefined>(() => local.variant);

  const state = createCheckboxGroupState({
    value: () => local.value,
    defaultValue: () => local.defaultValue,
    onChange: (value) => local.onChange?.(value),
    isDisabled: () => local.isDisabled,
    isReadOnly: () => local.isReadOnly,
    isRequired: () => local.isRequired,
    isInvalid: () => local.isInvalid,
    validate: () => local.validate,
    validationBehavior: () => local.validationBehavior,
  });

  // Fieldset sheet §5.2: a disabled `Fieldset` disables the whole group; the
  // group cannot re-enable itself with its own `false`.
  const fieldset = FieldsetContext();
  const isDisabled = computed(
    () => fieldset?.isDisabled() === true || local.isDisabled === true,
  );
  const isReadOnly = computed(() => local.isReadOnly === true);
  const isRequired = computed(() => local.isRequired === true);
  const isInvalid = state.isInvalid;

  // --- Focus within (React Aria's `useFocusWithin`) --------------------------
  // Each item's clickable face reports its focus here; the group is focused
  // while at least one item is. A token per item keeps a double report and an
  // unmount from unbalancing the count.
  const focusedTokens = signal<ReadonlySet<object>>(new Set());

  const setItemFocused = (token: object, focused: boolean) => {
    const current = focusedTokens();
    const had = current.has(token);

    if (focused === had) {
      return;
    }

    const next = new Set(current);

    if (focused) {
      next.add(token);
    } else {
      next.delete(token);
    }

    const wasFocused = current.size > 0;
    const isFocused = next.size > 0;

    focusedTokens.set(next);

    if (wasFocused === isFocused) {
      return;
    }

    local.onFocusChange?.(isFocused);

    if (isFocused) {
      local.onFocus?.();
    } else {
      local.onBlur?.();
    }
  };

  // --- Registered text (the stand-in for label for / aria-describedby) -------
  const labelTexts = signal<readonly (() => string | undefined)[]>([]);
  const descriptionTexts = signal<readonly (() => string | undefined)[]>([]);
  const errorTexts = signal<readonly (() => string | undefined)[]>([]);

  const registerLabel = (text: () => string | undefined) => {
    labelTexts.update((current) => [...current, text]);

    return () => {
      labelTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const registerDescription = (text: () => string | undefined) => {
    descriptionTexts.update((current) => [...current, text]);

    return () => {
      descriptionTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const registerErrorMessage = (text: () => string | undefined) => {
    errorTexts.update((current) => [...current, text]);

    return () => {
      errorTexts.update((current) => current.filter((entry) => entry !== text));
    };
  };

  const labelText = computed(() => joinRegistered(labelTexts()));
  const descriptionText = computed(() => joinRegistered(descriptionTexts()));
  const errorText = computed(() => joinRegistered(errorTexts()));

  const accessibilityLabel = computed(
    () => local.accessibilityLabel ?? local["aria-label"] ?? labelText(),
  );

  const accessibilityHint = computed(() => {
    const parts = [descriptionText(), errorText()].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );

    return parts.length > 0 ? parts.join(" ") : undefined;
  });

  // --- Contexts --------------------------------------------------------------
  const renderProps: CheckboxGroupRenderProps = {
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    state,
  };

  const contextValue: CheckboxGroupContextValue = {
    variant,
    state,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    // R-042: `.checkbox-group [data-slot="checkbox"] { @apply mt-4 }`. NSH has
    // no descendant selector, so the group hands the class to each item root,
    // the first one included, exactly as the stylesheet does.
    itemClass: () => "mt-4",
    setItemFocused,
  };

  const fieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel,
  };

  const descriptionState = {
    registerDescription,
  };

  const fieldErrorState = {
    isInvalid,
    validationErrors: state.validationErrors,
    registerErrorMessage,
  };

  // --- Classes ---------------------------------------------------------------
  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    [checkboxGroupVariants({ variant: variant() }), resolvedClassName() ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const accessibilityState = computed(() => ({ disabled: isDisabled() }));

  // The render-prop form of `children` is called once, untracked (D17); any
  // other value is content.
  const resolveChildren = (
    children: JSX.Element | ((values: CheckboxGroupRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() =>
          (children as (values: CheckboxGroupRenderProps) => JSX.Element)(renderProps),
        ),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  // The group provides four contexts, so `props.children` is read once, at the
  // placement inside them (common rules' provider exception): a `computed`
  // built in the body would be evaluated outside and the items would lose the
  // group state.
  return (
    <CheckboxGroupContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <DescriptionContext.Provider value={descriptionState}>
          <FieldErrorContext.Provider value={fieldErrorState}>
            <View
              {...rest}
              ref={(node) => local.ref?.(node)}
              role="group"
              testID={local.testID}
              nativeID={local.id ?? local.nativeID}
              tooltip={local.tooltip}
              accessibilityLabel={accessibilityLabel()}
              accessibilityHint={accessibilityHint()}
              accessibilityState={accessibilityState()}
              accessibilityElementsHidden={local.accessibilityElementsHidden}
              class={classes()}
              style={resolvedStyle()}
              onLayout={local.onLayout}
            >
              {resolveChildren(local.children)}
            </View>
          </FieldErrorContext.Provider>
        </DescriptionContext.Provider>
      </FieldContext.Provider>
    </CheckboxGroupContext.Provider>
  );
}
