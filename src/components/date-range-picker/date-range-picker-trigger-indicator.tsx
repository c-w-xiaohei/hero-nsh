import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { split, View } from "nsh";

import { IconCalendar } from "../icons";
import { DateRangePickerContext } from "./date-range-picker-context";
import { renderChildren } from "./render-children";

/**
 * The props of `DateRangePicker.TriggerIndicator`: HeroUI's
 * `DateRangePickerTriggerIndicatorProps`, which is `DOMRenderProps<"span",
 * undefined>` plus `children` and `className`
 * (`date-range-picker.tsx:146-151`). The `span` attributes and `render` / `as`
 * are accepted and have no effect: NSH cannot replace a host element (port
 * sheet §1.4, §8 item 2).
 */
export interface DateRangePickerTriggerIndicatorProps {
  /** The icon or text to draw; a falsy value falls back to `IconCalendar`, as upstream's `children ||`. */
  children?: JSX.Element;

  /** Appended after the `triggerIndicator` slot classes; later classes win. */
  className?: string;

  /** Style of the indicator view; wins over the slot classes on the keys it sets. */
  style?: StyleProp<ViewStyle>;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** NSH's own id; `id` wins. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The indicator was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** Accepted, no effect: NSH cannot replace a host element. */
  as?: string;
  render?: unknown;

  /** The indicator's view, forwarded as a callback only. */
  ref?: (node: ViewRef) => void;

  /** Any other `span` attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

/**
 * DateRangePicker.TriggerIndicator / DateRangePickerTriggerIndicator: the
 * calendar icon inside the trigger. It is decoration upstream (`aria-hidden`),
 * so assistive technology skips it here too.
 */
export function DateRangePickerTriggerIndicator(
  props: DateRangePickerTriggerIndicatorProps,
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

  const classes = () => {
    const own = local.className ?? "";

    return [picker.slots.triggerIndicator(), own].filter((part) => part.length > 0).join(" ");
  };

  // One read of `props.children` per placement: a falsy value falls back to the
  // icon, as upstream's `children ||`. A Canvas icon cannot inherit the `text-*`
  // of the box, so R-011's color is handed to it as the theme token it comes
  // from.
  const content = (): JSX.Element => {
    const children = local.children;

    return children ? renderChildren(children) : <IconCalendar color="field-placeholder" />;
  };

  return (
    // R-011: the 16pt box that centres the icon, in the field placeholder color.
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
