import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { cleanup, split, Text, View } from "nsh";

import { DateInputGroupContext } from "../date-input-group/date-input-group-context";
import { DateRangePickerContext } from "./date-range-picker-context";
import { renderChildren } from "./render-children";

/**
 * The props of `DateRangePicker.RangeSeparator`: HeroUI's
 * `DateRangePickerRangeSeparatorProps`, which is `DOMRenderProps<"span",
 * undefined>` plus `children` and `className`
 * (`date-range-picker.tsx:178-183`). The `span` attributes and `render` / `as`
 * are accepted and have no effect (port sheet §1.5, §8 item 2).
 */
export interface DateRangePickerRangeSeparatorProps {
  /** What sits between the two fields. @default " - " */
  children?: JSX.Element;

  /** Appended after the `rangeSeparator` slot classes; later classes win. */
  className?: string;

  /** Style of the separator view; wins over the slot classes on the keys it sets. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** NSH's own id; `id` wins. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The separator was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** Accepted, no effect: NSH cannot replace a host element. */
  as?: string;
  render?: unknown;

  /** The separator's view, forwarded as a callback only. */
  ref?: (node: ViewRef) => void;

  /** Any other `span` attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

/**
 * DateRangePicker.RangeSeparator / DateRangePickerRangeSeparator: the `" - "`
 * between the start and the end field. Decoration upstream (`aria-hidden`), so
 * assistive technology skips it here too.
 *
 * It also registers itself with the field group: its presence is the only
 * input of `date-input-group` R-012, which narrows the two fields' inner
 * padding (`flex-none pe-0` on `slot="start"`, `ps-0` on `slot="end"`). Without
 * that registration the two fields keep the padding a standalone group has and
 * stop matching upstream (port sheet §1.5, R-012).
 */
export function DateRangePickerRangeSeparator(
  props: DateRangePickerRangeSeparatorProps,
): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "testID",
    "onLayout",
    "as",
    "render",
    "ref",
  ] as const);

  const picker = DateRangePickerContext();
  const group = DateInputGroupContext();

  // R-012: the group widens its two fields while a separator is mounted.
  cleanup(group.registerRangeSeparator());

  const classes = () => {
    const own = local.className ?? "";

    return [picker.slots.rangeSeparator(), own].filter((part) => part.length > 0).join(" ");
  };

  // One read of `props.children` per placement. The default carries its own
  // spaces (`" - "`): they are the text, not part of `px-1` (§4c G-001).
  const content = (): JSX.Element => {
    const children = local.children;

    if (children === undefined || children === null || children === false) {
      return <Text>{" - "}</Text>;
    }

    return renderChildren(children);
  };

  return (
    // R-012: 4pt inline padding, the placeholder color and no text selection.
    <View
      ref={(node) => local.ref?.(node)}
      accessibilityElementsHidden={true}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      class={classes()}
      style={local.style}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
