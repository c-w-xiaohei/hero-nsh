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

import { ComboBoxContext, type ComboBoxStateFacade } from "./combo-box-context";

/**
 * What a value `children` function receives (HeroUI's
 * `ComboBoxValueRenderProps<T>`). Per D17 the flags are accessors; `state` is
 * this port's facade over the list state, not React Stately's `ComboBoxState`
 * (port sheet §8).
 */
export interface ComboBoxValueRenderProps<T = any> {
  /** Nothing is selected. */
  isPlaceholder: Accessor<boolean>;

  /** The selected entries of the root's `items`, in selection order. */
  selectedItems: Accessor<readonly (T | null)[]>;

  /** The selected texts joined with `Intl.ListFormat`'s conjunction. */
  selectedText: Accessor<string | undefined>;

  state: ComboBoxStateFacade;
}

export interface ComboBoxValueProps<T = any> {
  /** The value's content, or a render prop called once with accessors. */
  children?:
    | JSX.Element
    | ((values: ComboBoxValueRenderProps<T>) => JSX.Element);

  /** Shown when nothing is selected and no `children` are given. */
  placeholder?: string;

  /** Appended after the value's own classes; function form gets accessors. */
  className?:
    | string
    | ((values: ComboBoxValueRenderProps<T>) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ComboBoxValueRenderProps<T>) => StyleProp<ViewStyle>);

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;
  tooltip?: JSX.Element;

  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;

  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * ComboBox.Value / ComboBoxValue: the selected text inside the field, or the
 * placeholder. Upstream it is React Aria's `ComboBoxValue`, whose default
 * children are `selectedText || placeholder` and whose container is `empty:
 * hidden` (`ComboBox.tsx:424-431`; `combo-box.css:65-75`).
 *
 * The value is a `View`, not a `Text`: a multiple selection's custom children
 * put chips in it (port sheet §1).
 */
export function ComboBoxValue<T = any>(
  props: ComboBoxValueProps<T>,
): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "placeholder",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "tooltip",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityState",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const combo = ComboBoxContext();

  if (!combo) {
    return null;
  }

  const isPlaceholder = combo.isSelectionEmpty;

  const renderValues: ComboBoxValueRenderProps<T> = {
    isPlaceholder,
    selectedItems: () =>
      combo.selectedItems().map((item) => (item.value ?? null) as T | null),
    selectedText: combo.selectedText,
    state: combo.state,
  };

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function" ? className(renderValues) : className;
  };

  const resolvedStyle = () => {
    const style = local.style;

    return typeof style === "function" ? style(renderValues) : style;
  };

  const classes = computed(() =>
    [combo.slots().value(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const hasContent = () =>
    local.children != null ||
    combo.selectedText() != null ||
    typeof local.placeholder === "string";

  // R-011: `.combo-box__value:empty` → `hidden`. There is no `:empty` here, so
  // the same derived question is asked: would this value show anything?
  // R-012: `[data-placeholder="true"]` → the placeholder colour.
  const classList = computed(() => ({
    hidden: !hasContent(),
    "text-field-placeholder": isPlaceholder(),
  }));

  // One read of `children`, at the placement (the value provides no context);
  // a one-parameter function is the render prop (D17). The default content is
  // `selectedText || placeholder`, and a string is wrapped in `Text` because
  // bare strings do not render in NSH.
  const content = (): JSX.Element => {
    const children = local.children;

    if (typeof children === "function" && children.length >= 1) {
      return untracked(() =>
        (
          children as (
            values: ComboBoxValueRenderProps<T>,
          ) => JSX.Element
        )(renderValues),
      ) as JSX.Element;
    }

    if (children != null) {
      return children as JSX.Element;
    }

    const text = combo.selectedText() ?? local.placeholder;

    return text == null ? null : <Text>{text}</Text>;
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      tooltip={local.tooltip}
      accessibilityLabel={local.accessibilityLabel ?? local["aria-label"]}
      accessibilityHint={local.accessibilityHint}
      accessibilityState={local.accessibilityState}
      class={classes()}
      classList={classList()}
      style={resolvedStyle()}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
