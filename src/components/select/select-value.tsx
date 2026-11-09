import type {
  Accessor,
  AccessibilityState,
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, split, Text, untracked, View } from "nsh";

import { renderChildren } from "../list-box/children";
import { FieldErrorContext } from "../field-error/context";
import { FieldContext } from "../label/context";
import { DescriptionContext } from "../description/context";
import {
  ListBoxContainerContext,
  type ListBoxContainerContextValue,
} from "../list-box/list-box-context";
import {
  SelectContext,
  type SelectSelectedItem,
  type SelectStateFacade,
} from "./select-context";
import { formatListParts } from "./select-list-format";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/**
 * What a value `children` function receives (HeroUI's `SelectValueRenderProps`).
 * `state` is this port's facade, not React Stately's `SelectState` (port sheet
 * §1 and §8): it carries the members the stories read and no methods.
 */
export interface SelectValueRenderProps {
  isPlaceholder: Accessor<boolean>;

  /** HeroUI's deprecated single-item accessor. */
  selectedItem: Accessor<SelectSelectedItem | null>;

  selectedItems: Accessor<readonly SelectSelectedItem[]>;

  selectedText: Accessor<string | undefined>;

  state: SelectStateFacade;

  /** The tree the value shows with no children: the selected item(s), or the placeholder. */
  defaultChildren: Accessor<JSX.Element | undefined>;
}

export interface SelectValueProps {
  /** The value's content, or a render prop called once with accessors. */
  children?: JSX.Element | ((values: SelectValueRenderProps) => JSX.Element);

  /** Appended after the variant classes; function form gets the same accessors. */
  className?: string | ((values: SelectValueRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: SelectValueRenderProps) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Select.Value / SelectValue: the text (or any node) inside the trigger.
 * HeroUI's value is React Aria's `SelectValue`, which renders the selected
 * option's children; here it reads the registered option through the list's
 * owner contract (port sheet §5, fifth change) and places that content a second
 * time (registered difference, §8).
 */
export function SelectValue(props: SelectValueProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "accessibilityElementsHidden",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const select = SelectContext();

  if (!select) {
    return null;
  }

  const selectedItems = select.selectedItems;
  const isPlaceholder = select.isSelectionEmpty;

  /**
   * R-020: a row's indicator copied here has no item context, so it would draw
   * the unchecked checkmark; the container suppresses it. HeroUI hides the copy
   * with `.select__value [data-slot="list-box-item-indicator"]`.
   *
   * The copied row also carries the caller's `Label` / `Description` /
   * `FieldError` parts. Their bodies run where they are built (each read builds
   * the tree, research 4.1), and outside the row they would resolve the field
   * root's contexts and rename it (`<Label>Bob</Label>` in a row once became
   * part of the trigger's name). The copy gets the field's own state minus the
   * `register*` callbacks: it registers nothing, but it still looks like part
   * of the field — a copied Label in an invalid field stays `text-danger`
   * (`label.css:23-27`) and a copied Description stays hidden (`select.css:4-9`,
   * the root's `partClass`).
   */
  const suppress: ListBoxContainerContextValue = {
    itemIndicatorSuppressed: () => true,
  };

  // Read where this part sits, so the copy inherits the field root's state.
  const field = FieldContext();
  const description = DescriptionContext();
  const fieldError = FieldErrorContext();

  const { registerLabel: _copiedLabel, ...isolated } = field ?? {};
  const { registerDescription: _copiedDescription, ...isolatedDescription } =
    description ?? {};
  const { registerErrorMessage: _copiedError, ...isolatedError } =
    fieldError ?? {};

  /**
   * The value HeroUI renders with no children: the selected option's children
   * (single) or the `Intl.ListFormat` parts, each element part replaced by its
   * option's content (multiple). Literal parts (", " in English) become `Text`,
   * because a bare string inside a View is not painted.
   *
   * A plain function, not a `computed`: NSH's `computed` builds its value where
   * it is created, so the copied row's `Label` / `Description` bodies would run
   * in this component's body — outside the isolating providers below — and
   * register with the field root. Built where it is read (inside the binding
   * and the providers), the copy sees the isolated contexts.
   */
  const defaultChildren = (): JSX.Element | undefined => {
    const items = selectedItems();

    if (items.length === 0) {
      return <Text>{select.placeholder()}</Text>;
    }

    if (select.selectionMode() !== "multiple") {
      const item = items[0];

      return item ? renderChildren(item.children()) : undefined;
    }

    const parts = formatListParts(items.map((item) => item.textValue ?? ""));
    let index = 0;

    return parts.map((part) => {
      if (part.type === "literal") {
        return <Text>{part.value}</Text>;
      }

      const item = items[index++];

      return item ? renderChildren(item.children()) : <Text>{part.value}</Text>;
    }) as unknown as JSX.Element;
  };

  const state: SelectStateFacade = select.state;

  const renderProps: SelectValueRenderProps = {
    isPlaceholder,
    selectedItem: () => selectedItems()[0] ?? null,
    selectedItems,
    selectedText: select.selectedText,
    state,
    defaultChildren,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderProps) : style;
  };

  const classes = computed(() =>
    [select.slots().value(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // One read of `props.children`, at the placement inside the indicator
  // suppressor: a one-parameter function is the HeroUI render prop (D17).
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      const rendered = untracked(() =>
        (children as (values: SelectValueRenderProps) => JSX.Element)(
          renderProps,
        ),
      );

      return rendered ?? defaultChildren();
    }

    if (children != null) {
      return renderChildren(children as JSX.Element);
    }

    return defaultChildren();
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityHint={local.accessibilityHint}
      accessibilityState={local.accessibilityState}
      accessibilityElementsHidden={local.accessibilityElementsHidden}
      class={classes()}
      // R-019: `[data-placeholder="true"]` → the placeholder colour.
      classList={{ "text-field-placeholder": isPlaceholder() }}
      style={resolvedStyle()}
      onLayout={local.onLayout}
    >
      <ListBoxContainerContext.Provider value={suppress}>
        <FieldContext.Provider value={isolated}>
          <DescriptionContext.Provider value={isolatedDescription}>
            <FieldErrorContext.Provider value={isolatedError}>
              {() => content()}
            </FieldErrorContext.Provider>
          </DescriptionContext.Provider>
        </FieldContext.Provider>
      </ListBoxContainerContext.Provider>
    </View>
  );
}
