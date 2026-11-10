import { computed, split, Text, untracked, View } from "nsh";
import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";

import { joinClassNames } from "./class-names";
import type { SliderRenderProps } from "./slider-context";
import { SliderContext } from "./slider-context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./slider-dom-props";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Slider Output
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Slider.Output`: HeroUI 3.2.7's `SliderOutputProps`, which is
 * React Aria Components' `SliderOutput` (an `<output>` element with children
 * or a render prop) and `className`.
 */
export interface SliderOutputProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * Rendered as upstream's `<output>` renders it; the thumbs' value labels
   * joined with `" – "` when omitted.
   */
  children?: JSX.Element | ((values: SliderRenderProps) => JSX.Element);

  /**
   * Appended after the slot classes; later classes win. The function form
   * gets the same accessors the render prop gets.
   */
  className?: string | ((values: SliderRenderProps) => string | undefined);

  /** Style of the output; the function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: SliderRenderProps) => StyleProp<ViewStyle>);

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** React's list identity; never reaches the host. */
  key?: string | number;

  /** Forwarded to the `View` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * Slider.Output / SliderOutput: the formatted value, or the caller's own
 * content.
 *
 * HeroUI styles the `<output>` element itself and lets a `Text` inherit; NSH's
 * typography utilities inherit from a `View` to the `Text` inside it, so the
 * slot's `text-sm font-medium tabular-nums` stays on the view and the default
 * text is one `<Text>` (port sheet section 3).
 */
export function SliderOutput(props: SliderOutputProps): JSX.Element {
  const [local, rest] = split(props, [
    "key",
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "slot",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Read once, in the body: the slider this output belongs to, if any.
  const slider = SliderContext();

  const renderProps: SliderRenderProps | undefined = slider
    ? {
        orientation: slider.orientation,
        isDisabled: slider.isDisabled,
        state: slider.state,
      }
    : undefined;

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" && renderProps
      ? value(renderProps)
      : typeof value === "string"
        ? value
        : undefined;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" && renderProps
      ? value(renderProps)
      : typeof value === "function"
        ? undefined
        : value;
  };

  // R-007: `.slider__output` → `grid-area: output`, written as row 1 and the
  // horizontal second column. The vertical root is one column until a Marks
  // registers (R-054 / R-056); only then does the output span both.
  // R-062: the vertical `.slider__output` → `text-align: center`.
  const classes = computed(() => {
    const isVertical = slider?.orientation() === "vertical";
    const hasMarks = slider?.hasMarks() === true;

    return joinClassNames(
      slider?.slots().output(),
      "row-start-1",
      isVertical
        ? hasMarks
          ? "col-start-1 col-span-2 text-center"
          : "col-start-1 text-center"
        : "col-start-2",
      resolvedClassName(),
    );
  });

  // `state.values.map((_, i) => state.getThumbValueLabel(i)).join(" – ")`.
  const defaultText = computed(() =>
    slider
      ? slider.state.values().map((_, index) => slider.state.getThumbValueLabel(index)).join(" – ")
      : "",
  );

  const resolveChildren = (
    children: JSX.Element | ((values: SliderRenderProps) => JSX.Element) | undefined,
  ) => {
    if (children === undefined) {
      return <Text>{defaultText()}</Text>;
    }

    if (typeof children === "function" && children.length >= 1 && renderProps) {
      return renderChildren(
        untracked(() => (children as (values: SliderRenderProps) => JSX.Element)(renderProps)),
      );
    }

    return renderChildren(children as JSX.Element);
  };

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={resolvedStyle()}
    >
      {resolveChildren(local.children)}
    </View>
  );
}
