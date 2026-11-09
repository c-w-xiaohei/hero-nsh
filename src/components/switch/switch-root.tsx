import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, effect, signal, split, View } from "nsh";

import { createInteractionModality } from "../../primitives/create-interaction-modality";
import { createToggleState } from "../../primitives/create-toggle-state";
import { DescriptionContext } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import { FieldContext } from "../label/context";
import { renderChildren } from "./render-children";
import {
  type SwitchContextValue,
  type SwitchFieldRenderProps,
  SwitchContext,
  type SwitchToggleState,
} from "./switch-context";
import { switchVariants } from "./switch.styles";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * A validation error, as React Aria's `validate` returns it
 * (`@react-types/shared`): a string is the message, an object carries it in
 * `message`. NSH has no DOM `ValidityState`, so this is the only shape the
 * field can surface.
 */
export interface SwitchValidationError {
  key?: string;
  message?: string;
}

export type {
  SwitchFieldRenderProps,
  SwitchToggleState,
} from "./switch-context";

/** @deprecated Use {@link SwitchFieldRenderProps} for the root render prop, or {@link SwitchButtonRenderProps} for the content. */
export type SwitchRenderProps = SwitchFieldRenderProps;

/* -------------------------------------------------------------------------------------------------
 * Switch Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Switch.Root`: HeroUI 3.2.7's `SwitchRootProps`, which is React
 * Aria Components' `SwitchField` plus the `size` variant dimension.
 *
 * Every DOM-only member upstream is accepted so code written against HeroUI
 * keeps compiling; the port sheet §1 says what each can and cannot do here.
 */
export interface SwitchRootProps {
  /**
   * The field's content: an element, or a render prop called once with the
   * field state (D17). Bare strings inside it become `Text` at the placement.
   */
  children?: JSX.Element | ((values: SwitchFieldRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: SwitchFieldRenderProps) => string | undefined);

  /** Style of the field root; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: SwitchFieldRenderProps) => StyleProp<ViewStyle>);

  /** The only variant dimension; `md` by default. */
  size?: "sm" | "md" | "lg";

  /** The selected state, controlled. */
  isSelected?: boolean;

  /** The initial selected state, uncontrolled. */
  defaultSelected?: boolean;

  /** Called with the next selected state whenever the user changes it. */
  onChange?: (isSelected: boolean) => void;

  /** Blocks interaction and dims the field. */
  isDisabled?: boolean;

  /** Keeps the field focusable and blocks the value change. */
  isReadOnly?: boolean;

  /** Marks the field required; the Label inside it shows the asterisk. */
  isRequired?: boolean;

  /** Marks the field invalid; a `FieldError` inside it shows its message. */
  isInvalid?: boolean;

  /**
   * Runs at commit (blur) and, after the first commit, when the value changes.
   * `true` means valid; a string or a `{ message }` object is the error.
   */
  validate?: (
    isSelected: boolean,
  ) => true | string | SwitchValidationError | null | undefined;

  /** Accepted, no effect: NSH has no DOM form validation modes. */
  validationBehavior?: "native" | "aria";

  /** Accepted, no effect: NSH has no form submission. */
  name?: string;

  /** Accepted, no effect: NSH has no form submission; `"on"` upstream by default. */
  value?: string;

  /** Accepted, no effect: NSH has no DOM form ownership. */
  form?: string;

  /** Focuses the clickable face after it mounts. */
  autoFocus?: boolean;

  /** Leaves the clickable face out of the Tab order. */
  excludeFromTabOrder?: boolean;

  /** Accepted, no effect: there is no hidden `<input>` to point at. */
  inputRef?: unknown;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Names the clickable face; it wins over the text a `Label` inside registers. */
  "aria-label"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-details"?: string;
  "aria-errormessage"?: string;

  /** Accepted, no effect upstream too: the field root div keeps its own role. */
  "aria-disabled"?: boolean;

  /** An identifier for UI tests, on the field root. */
  testID?: string;

  /** The name other elements refer to; also set by `id`. */
  nativeID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** A hint shown while the pointer rests on the field root. */
  tooltip?: JSX.Element;

  /** The field root was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** The field root's view. */
  ref?: (node: ViewRef) => void;

  /** NSH's accessible name for the field root; `aria-label` names the control instead. */
  accessibilityLabel?: string;

  /** Hides the field root and its subtree from assistive technologies. */
  accessibilityElementsHidden?: boolean;
}

function toValidationErrors(
  result: true | string | SwitchValidationError | null | undefined,
): readonly string[] {
  if (result === true || result === null || result === undefined) {
    return [];
  }

  const message = typeof result === "string" ? result : result.message;

  return typeof message === "string" && message.length > 0 ? [message] : [];
}

function joinRegistered(values: readonly (() => string | undefined)[]): string | undefined {
  const text = values
    .map((value) => value())
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  return text.length > 0 ? text : undefined;
}

/**
 * Switch.Root / SwitchRoot: the field — a `flex-col` field root that owns the
 * selection, validation, description and error state and provides the three
 * field contexts plus the switch's own one (port sheet §2).
 *
 * It is built on the core `View`, not on nsh/base `Switch`: that component
 * fixes the "track + thumb + children" structure and exposes only a controlled
 * `checked`, so it cannot host HeroUI's five parts, its control/label layout or
 * its uncontrolled, readonly, required and invalid semantics (port sheet §3,
 * criteria B1, B3, B4).
 */
export function SwitchRoot(props: SwitchRootProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "size",
    "isSelected",
    "defaultSelected",
    "onChange",
    "isDisabled",
    "isReadOnly",
    "isRequired",
    "isInvalid",
    "validate",
    "validationBehavior",
    "name",
    "value",
    "form",
    "autoFocus",
    "excludeFromTabOrder",
    "inputRef",
    "render",
    "slot",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "aria-disabled",
    "testID",
    "nativeID",
    "id",
    "tooltip",
    "onLayout",
    "accessibilityLabel",
    "accessibilityElementsHidden",
  ] as const);

  const size = computed(() => local.size ?? "md");
  const isDisabled = computed(() => local.isDisabled ?? false);
  const isReadOnly = computed(() => local.isReadOnly ?? false);
  const isRequired = computed(() => local.isRequired ?? false);
  const focusable = computed(() => local.excludeFromTabOrder !== true);

  // --- Selection state -------------------------------------------------------
  const toggleState = createToggleState({
    isSelected: () => local.isSelected,
    defaultIsSelected: () => local.defaultSelected,
    isDisabled,
    isReadOnly,
    onSelectedChange: (value) => local.onChange?.(value),
  });

  // --- Validation ------------------------------------------------------------
  // React Aria commits validation on blur and keeps the message after that;
  // the field starts clean, so the Validation story shows no error until the
  // user interacts (port sheet §2).
  const validationErrors = signal<readonly string[]>([]);
  let hasCommitted = false;

  const runValidation = () => {
    const validate = local.validate;

    if (!validate) {
      validationErrors.set([]);

      return;
    }

    validationErrors.set(toValidationErrors(validate(toggleState.isSelected())));
  };

  const commitValidation = () => {
    hasCommitted = true;
    runValidation();
  };

  // `setSelected` and `toggle` are React Stately's names, kept 1:1 (port sheet
  // §1). `setSelected` maps to the primitive's setter directly; the toggle
  // re-runs validation after the first commit, as upstream does once a field
  // has been committed.
  const setSelected = (value: boolean) => {
    toggleState.setIsSelected(value);

    if (hasCommitted) {
      runValidation();
    }
  };

  const toggle = () => {
    toggleState.toggle();

    if (hasCommitted) {
      runValidation();
    }
  };

  const state: SwitchToggleState = {
    isSelected: toggleState.isSelected,
    setSelected,
    toggle,
  };

  const isInvalid = computed(
    () => local.isInvalid === true || validationErrors().length > 0,
  );

  // --- Interaction state (R-026 … R-031) -------------------------------------
  const hovered = signal(false);
  const pressed = signal(false);
  const focused = signal(false);
  const modality = createInteractionModality();

  // R-026: the ring shows only for a keyboard focus, as `:focus-visible` does
  // upstream; a pointer press does not focus a view in NSH, and the Label's
  // `focusField` records the pointer before it focuses.
  const isFocusVisible = computed(() => focused() && modality.isKeyboard());

  // R-037: the track is measured by the Control and the thumb slides by the
  // difference; layout properties cannot be animated in NSH.
  const trackWidth = signal(0);

  let contentNode: ViewRef | undefined;
  let focusFromPointer = false;

  // The Content part registers its view here; a plain variable keeps the ref
  // out of the reactive graph (the effect below runs after the child mounted).
  const setContentRef = (node: ViewRef | undefined) => {
    contentNode = node;
  };

  // Pressing a `<label for>` focuses the control and toggles it. NSH's Label
  // reports the press through `FieldContext.focusField`; the press does not
  // reach the Content (a press on a pressable Text stays there, measured), so
  // the toggle happens here. The focus this requests is a pointer interaction:
  // mark the modality first, and let `onFocus` consume the marker instead of
  // turning it into a keyboard focus (R-026).
  const focusField = () => {
    modality.setPointerModality();
    focusFromPointer = true;
    contentNode?.focus();
    toggle();
  };

  const consumeFocusFromPointer = () => {
    const value = focusFromPointer;

    focusFromPointer = false;

    return value;
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

  // --- Descendant classes (R-009, R-011 … R-016, R-049) ----------------------
  // NSH has no `.switch > [data-slot="description"]`; the field root hands the
  // Description and FieldError the classes its stylesheet would give them.
  const indentClass = () => {
    switch (size()) {
      case "sm":
        return "ps-[2.75rem]";
      case "lg":
        return "ps-[3.75rem]";
      default:
        return "ps-[3.25rem]";
    }
  };

  const descriptionPartClass = () => {
    const disabledClass = isDisabled() ? "opacity-50" : "";

    // R-011 / R-013 / R-015, R-049, R-009.
    return ["w-full min-w-0", indentClass(), "cursor-default select-none", disabledClass]
      .filter((part) => part.length > 0)
      .join(" ");
  };

  const fieldErrorPartClass = () => {
    const disabledClass = isDisabled() ? "opacity-50" : "";

    // R-012 / R-014 / R-016, R-009. `text-muted` and the missing inline padding
    // come from `isToggleField`.
    return ["w-full min-w-0", indentClass(), disabledClass]
      .filter((part) => part.length > 0)
      .join(" ");
  };

  // --- Contexts --------------------------------------------------------------
  const renderProps: SwitchFieldRenderProps = {
    isSelected: toggleState.isSelected,
    isDisabled,
    isReadOnly,
    isInvalid,
    isRequired,
    state,
  };

  const contextValue: SwitchContextValue = {
    size,
    isSelected: toggleState.isSelected,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    isHovered: hovered,
    isPressed: pressed,
    isFocused: focused,
    isFocusVisible,
    state,
    focusable,
    // `aria-label` is the HeroUI name; `accessibilityLabel` is its NSH alias,
    // and both name the clickable face rather than the role-less field root.
    ariaLabel: () => local["aria-label"] ?? local.accessibilityLabel,
    labelText,
    descriptionText,
    errorText,
    setContentRef,
    setHovered: (value) => hovered.set(value),
    setPressed: (value) => pressed.set(value),
    setFocused: (value) => focused.set(value),
    setKeyboardModality: () => modality.setKeyboardModality(),
    setPointerModality: () => modality.setPointerModality(),
    consumeFocusFromPointer,
    trackWidth,
    setTrackWidth: (value) => trackWidth.set(value),
    commitValidation,
  };

  const fieldState = {
    isRequired,
    isDisabled,
    isInvalid,
    registerLabel,
    focusField,
  };

  const descriptionState = {
    registerDescription,
    partClass: descriptionPartClass,
  };

  const fieldErrorState = {
    isInvalid,
    validationErrors,
    isToggleField: () => true,
    registerErrorMessage,
    partClass: fieldErrorPartClass,
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
    [switchVariants({ size: size() }).base(), resolvedClassName() ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  // `autoFocus` focuses the clickable face once the child has mounted. The ref
  // callback above runs during the mount, before this effect does.
  effect(() => {
    if (local.autoFocus) {
      contentNode?.focus();
    }
  });

  const resolveChildren = (
    children: JSX.Element | ((values: SwitchFieldRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        (children as (values: SwitchFieldRenderProps) => JSX.Element)(renderProps),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <SwitchContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <DescriptionContext.Provider value={descriptionState}>
          <FieldErrorContext.Provider value={fieldErrorState}>
            <View
              ref={(node) => local.ref?.(node)}
              testID={local.testID}
              nativeID={local.id ?? local.nativeID}
              tooltip={local.tooltip}
              accessibilityElementsHidden={local.accessibilityElementsHidden}
              class={classes()}
              // R-008: `.switch[data-disabled="true"]` → `@apply status-disabled`
              // (opacity 0.5, cursor not-allowed, pointer-events none); the
              // values are literals because the theme has no such variables.
              classList={{
                "opacity-50 cursor-not-allowed pointer-events-none": isDisabled(),
              }}
              style={resolvedStyle()}
              onLayout={local.onLayout}
            >
              {resolveChildren(local.children)}
            </View>
          </FieldErrorContext.Provider>
        </DescriptionContext.Provider>
      </FieldContext.Provider>
    </SwitchContext.Provider>
  );
}
