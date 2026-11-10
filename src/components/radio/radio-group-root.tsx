import type { Bounds, JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, effect, signal, split, untracked, View } from "nsh";

import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { DescriptionContext } from "../description/context";
import { FieldErrorContext } from "../field-error/context";
import { FieldContext } from "../label/context";
import {
  createRadioGroupState,
  type RadioGroupState,
  type RadioGroupValidationError,
} from "./create-radio-group-state";
import type { RadioGroupRenderProps } from "./radio-context";
import {
  RadioGroupContext,
  type RadioGroupContextValue,
  type RadioGroupItem,
} from "./radio-context";
import {
  radioGroupVariants,
  type RadioGroupOrientation,
  type RadioGroupVariant,
} from "./radio.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

export type { RadioGroupRenderProps } from "./radio-context";

/* -------------------------------------------------------------------------------------------------
 * RadioGroup Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `RadioGroup.Root` / `RadioGroup`: HeroUI 3.2.7's
 * `RadioGroupRootProps`, which is React Aria Components' `RadioGroup` (a
 * `div` with `role="radiogroup"`) plus the `variant` dimension, expressed with
 * NSH's view host props.
 *
 * The DOM-only members upstream (`name`, `form`, `render`, `slot`, the
 * `aria-*` references) are accepted so code written against HeroUI keeps
 * compiling; the port sheet §1 says what each can and cannot do here.
 */
export interface RadioGroupRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  /**
   * The group's content: an element, or a render prop called once with the
   * group state (D17). Bare strings and numbers become `Text` at the placement.
   */
  children?: JSX.Element | ((values: RadioGroupRenderProps) => JSX.Element);

  /** Appended after the variant classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: RadioGroupRenderProps) => string | undefined);

  /** Style of the group root; function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: RadioGroupRenderProps) => StyleProp<ViewStyle>);

  /** The layout orientation. @default "vertical" */
  orientation?: RadioGroupOrientation;

  /** The visual variant, carried to every item's Control and dot. @default "primary" */
  variant?: RadioGroupVariant;

  /** The selected value, controlled. */
  value?: string;

  /** The initially selected value, uncontrolled. */
  defaultValue?: string;

  /** Called with the next value whenever the user changes the selection. */
  onChange?: (value: string) => void;

  /** Disables every item in the group. */
  isDisabled?: boolean;

  /** Keeps every item focusable while blocking value changes. */
  isReadOnly?: boolean;

  /** Marks the group required; the group's own Label shows the asterisk. */
  isRequired?: boolean;

  /** Marks the group invalid; a `FieldError` inside it shows its message. */
  isInvalid?: boolean;

  /** Runs on every selection commit; `true` means valid. */
  validate?: (
    value: string,
  ) => true | string | RadioGroupValidationError | null | undefined;

  /** When the group's validation message appears: `native` after the first commit, `aria` live. @default "native" */
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
 * `RadioGroup.Root` / `RadioGroupRoot`: a `role="radiogroup"` field root that
 * owns the selected value, the validation, the orientation and the variant, and
 * hands them to every `Radio` inside it (port sheet §2).
 *
 * It is built on the core `View`, not on nsh/base `RadioGroup`: that component
 * exposes only `children`, so the group accepts no accessible name, and
 * nsh/base `Radio` is a tab stop only inside it; both together still lose the
 * group's name (port sheet §3, criterion B3). Its arrow keys are reimplemented
 * here on React Aria's roving tab stop, because NSH has no native same-name
 * input group.
 */
export function RadioGroupRoot(props: RadioGroupRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "orientation",
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

  // --- Orientation and variant ------------------------------------------------
  // R-026 / R-027: both are group state; the item reads the orientation for its
  // `mt-4` and the Control reads the variant for R-029—R-032.
  const orientation = computed<RadioGroupOrientation>(() => local.orientation ?? "vertical");
  const variant = computed<RadioGroupVariant>(() => local.variant ?? "primary");

  // --- The value and validation ----------------------------------------------
  const state = createRadioGroupState({
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

  const isDisabled = state.isDisabled;
  const isReadOnly = state.isReadOnly;
  const isRequired = state.isRequired;
  const isInvalid = state.isInvalid;

  // What the render prop's `state` exposes: RAC's `RadioGroupState` surface,
  // without the `FormValidationState` members the sheet keeps internal (§8).
  // `setSelectedValue` is RAC's wrapper: a read-only group ignores it, it
  // clears `lastFocusedValue` and commits validation.
  const setSelectedValue = (value: string) => {
    if (isReadOnly()) {
      return;
    }

    state.setLastFocusedValue(null);
    state.setSelectedValue(value);
    state.commitValidation();
  };

  const publicState: RadioGroupState = {
    selectedValue: state.selectedValue,
    setSelectedValue,
    defaultSelectedValue: state.defaultSelectedValue,
    lastFocusedValue: state.lastFocusedValue,
    setLastFocusedValue: state.setLastFocusedValue,
    isDisabled: state.isDisabled,
    isReadOnly: state.isReadOnly,
    isRequired: state.isRequired,
    isInvalid: state.isInvalid,
  };

  // --- The collection ---------------------------------------------------------
  // NSH has no native inputs sharing a `name`, so the group itself keeps the
  // items in mount order: the arrow keys need it, and so does the single tab
  // stop the browser would otherwise synthesize.
  const items = signal<readonly RadioGroupItem[]>([]);

  const registerItem = (item: RadioGroupItem) => {
    items.update((current) => [...current, item]);

    return () => {
      items.update((current) => current.filter((entry) => entry !== item));
    };
  };

  // RAC's `useRadioGroupState` clears `lastFocusedValue` whenever the value is
  // set, so the tab stop follows the selection once there is one. The item
  // additionally blocks a disabled item; the group's own flag blocks every
  // item.
  const select = (value: string) => {
    if (isDisabled()) {
      return;
    }

    setSelectedValue(value);
  };

  // The single tab stop: the selected item, else the last focused one, else the
  // first enabled item. The item's Content is `focusable` only there, which is
  // the roving tabindex React Aria gives a same-name radio group.
  const tabStopValue = computed<string | null>(() => {
    const selected = state.selectedValue();

    if (selected != null) {
      return selected;
    }

    const last = state.lastFocusedValue();

    if (last != null) {
      return last;
    }

    const first = items().find((item) => !item.isDisabled());

    return first ? first.value() : null;
  });

  const isTabStop = (value: string) => tabStopValue() === value;

  // --- Focus within and the roving focus -------------------------------------
  const focusedTokens = signal<ReadonlySet<object>>(new Set());
  const focusedValue = signal<string | null>(null);
  const pendingFocus = signal<string | null>(null);

  const setItemFocused = (token: object, value: string, focused: boolean) => {
    const current = focusedTokens();
    const had = current.has(token);

    if (focused === had) {
      return;
    }

    const next = new Set(current);

    if (focused) {
      next.add(token);
      // `useRadioGroup`'s focus handler records the item that took the focus so
      // the tab stop can return there while nothing is selected.
      state.setLastFocusedValue(value);
      focusedValue.set(value);
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

      return;
    }

    focusedValue.set(null);

    // `useRadioGroup.ts:83-87`: an empty group with no selection forgets the
    // last focused value on blur.
    if (state.selectedValue() == null) {
      state.setLastFocusedValue(null);
    }

    local.onBlur?.();
  };

  // `useRadioGroup.ts:122-142`: Down is always the next item and Up always the
  // previous one; Right / Left follow the reading direction, which NSH cannot
  // read, so they behave as LTR (vertical groups never swap them either). Both
  // wrap around and skip disabled items.
  const move = (step: 1 | -1) => {
    if (isDisabled() || isReadOnly()) {
      return;
    }

    const list = items();
    const count = list.length;

    if (count === 0) {
      return;
    }

    const current = focusedValue() ?? state.selectedValue() ?? tabStopValue();
    const found = list.findIndex((item) => item.value() === current);
    const start = found < 0 ? 0 : found;

    for (let offset = 1; offset <= count; offset++) {
      const index = (start + step * offset + count * offset) % count;
      const next = list[index];

      if (next.isDisabled()) {
        continue;
      }

      select(next.value());
      pendingFocus.set(next.value());

      return;
    }
  };

  createKeymapScope({
    // The list keys are bound only while one item has the focus; the arrow keys
    // on a focused view are the group's, never a global command.
    isActive: () => focusedValue() != null,
    bindings: {
      arrowdown: () => move(1),
      arrowup: () => move(-1),
      arrowright: () => move(1),
      arrowleft: () => move(-1),
    },
  });

  // The value is written first (`select`), then the focus moves: the target
  // item's `focusable` is true only after the selection changed, so the call
  // has to wait for the render that applied it (port sheet §5).
  effect(() => {
    const target = pendingFocus();

    if (target == null) {
      return;
    }

    const item = items().find((entry) => entry.value() === target);

    if (!item) {
      return;
    }

    pendingFocus.set(null);
    item.focus();
  });

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

  // --- Contexts ---------------------------------------------------------------
  const renderProps: RadioGroupRenderProps = {
    orientation,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    state: publicState,
  };

  const contextValue: RadioGroupContextValue = {
    variant,
    orientation,
    state: publicState,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    validationErrors: state.validationErrors,
    // R-026: `&[data-orientation="vertical"] [data-slot="radio"] { mt-4 }`.
    // NSH has no descendant selector, so the group hands the class to every
    // item root, the first one included, exactly as the stylesheet does.
    itemClass: () => (orientation() === "vertical" ? "mt-4" : undefined),
    registerItem,
    isTabStop,
    setItemFocused,
    select,
    requestFocus: (value) => pendingFocus.set(value),
  };

  // Pressing the group's `<label>` focuses its radio group (the tab stop)
  // without selecting: the label's press is a pointer interaction, so no ring.
  const focusField = () => {
    const target = tabStopValue();
    const item = items().find((entry) => entry.value() === target);

    item?.focus(true);
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
  };

  const fieldErrorState = {
    isInvalid,
    validationErrors: state.validationErrors,
    registerErrorMessage,
  };

  // --- Classes ----------------------------------------------------------------
  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps) : value;
  };

  const classes = computed(() =>
    [
      radioGroupVariants({ variant: variant(), orientation: orientation() }),
      resolvedClassName() ?? "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  const accessibilityState = computed(() => ({ disabled: isDisabled() }));

  // The render-prop form of `children` is called once, untracked (D17); any
  // other value is content.
  const resolveChildren = (
    children: JSX.Element | ((values: RadioGroupRenderProps) => JSX.Element),
  ) => {
    if (typeof children === "function" && children.length >= 1) {
      return renderChildren(
        untracked(() =>
          (children as (values: RadioGroupRenderProps) => JSX.Element)(renderProps),
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
    <RadioGroupContext.Provider value={contextValue}>
      <FieldContext.Provider value={fieldState}>
        <DescriptionContext.Provider value={descriptionState}>
          <FieldErrorContext.Provider value={fieldErrorState}>
            <View
              {...rest}
              ref={(node) => local.ref?.(node)}
              role="radiogroup"
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
    </RadioGroupContext.Provider>
  );
}
