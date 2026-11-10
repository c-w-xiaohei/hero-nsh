import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { cleanup, computed, split, Text, untracked, View } from "nsh";

import { joinClassNames } from "./class-names";
import type { AriaProps, DataProps, DomEventProps, GlobalDomProps } from "./color-slider-dom-props";
import { hostProps } from "./color-slider-dom-props";
import type { ColorSliderRenderProps } from "./color-slider-context";
import { ColorSliderContext, EMPTY_COLOR_SLIDER_STATE } from "./color-slider-context";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Output props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ColorSlider.Output`: HeroUI 3.2.7's `ColorSliderOutputProps`,
 * which is React Aria Components' `SliderOutput` with `children` and
 * `className`, expressed with NSH's view host props.
 *
 * NSH has one kind of host view, so a `View` + `Text` stands in for the
 * `<output>`; `render` is accepted with no effect, and `for` has no NSH
 * counterpart.
 */
export interface ColorSliderOutputProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps,
    DomEventProps {
  /**
   * Overrides the value text, or a render prop called once (D17) with the
   * same accessors as the root's.
   */
  children?: JSX.Element | ((values: ColorSliderRenderProps) => JSX.Element);

  /** Appended after the slot classes; later classes win. Function form gets the same accessors. */
  className?: string | ((values: ColorSliderRenderProps) => string | undefined);

  /** Style of the output; function form gets the same accessors. */
  style?:
    | StyleProp<ViewStyle>
    | ((values: ColorSliderRenderProps) => StyleProp<ViewStyle>);

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the output `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Output
 * -----------------------------------------------------------------------------------------------*/

/**
 * ColorSlider.Output / ColorSliderOutput: the formatted channel value, in the
 * grid's first row.
 *
 * It registers itself with the root on creation (port sheet §2, `hasOutput`),
 * which is how the root learns to put it in the `output` grid area: upstream
 * asks the same question with `:has(.color-slider__output)`.
 *
 * Its default content is `state.getThumbValueLabel(0)`. A string placed
 * directly in a `View` is not drawn, so the default (and any bare string) is
 * wrapped in a `Text`.
 */
export function ColorSliderOutput(props: ColorSliderOutputProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "focusable",
    "slot",
    "render",
    "aria-label",
    "accessibilityLabel",
  ] as const);

  // Read once, in the body: the slider this output belongs to, if any. There is
  // no context in NSH's event handlers, and this part has none.
  const slider = ColorSliderContext();

  // Registration on creation, removed on cleanup: stands in for
  // `:has(.color-slider__output)` (R-011 / R-013 / R-017 / R-058 / R-059).
  if (slider) {
    cleanup(slider.registerOutput());
  }

  // The single read of `props.children` (research 4.1 / 4.6): a computed keeps
  // `<ColorSlider.Output>{signal()}</ColorSlider.Output>` following its source,
  // where a captured plain value would freeze it.
  const children = computed(() => local.children);

  const renderProps = (): ColorSliderRenderProps => ({
    orientation: () => slider?.orientation() ?? "horizontal",
    isDisabled: () => slider?.isDisabled() ?? false,
    state: slider?.publicState ?? EMPTY_COLOR_SLIDER_STATE,
  });

  /**
   * R-017: `grid-area: output`, and R-048's vertical `"output"` row. NSH has no
   * grid areas, so the part places itself from the root's registrations:
   *
   * | layout | label | output | cell |
   * |---|---|---|---|
   * | horizontal | yes | yes | row 1, column 2 |
   * | horizontal | no | yes | row 1, column 1, pushed to the end (R-013) |
   * | vertical | any | yes | row 1 (R-048) |
   */
  const placementClasses = computed(() => {
    const vertical = slider?.orientation() === "vertical";

    if (vertical) {
      // R-048 / R-060: `.color-slider__output` is the first of three vertical
      // areas, and its text is centred (R-060).
      return "row-start-1 text-center";
    }

    if (slider?.hasLabel() && slider?.hasOutput()) {
      // R-017: the two-column layout's top-right cell.
      return "row-start-1 col-start-2";
    }

    // R-011 / R-013 / R-017: the collapsed one-column layout, where upstream
    // also moves the output to the end of the row.
    return "row-start-1 col-start-1 justify-self-end";
  });

  const resolvedClassName = () => {
    const value = local.className;

    return typeof value === "function" ? value(renderProps()) : value;
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(renderProps()) : value;
  };

  // R-016 in `color-slider.styles.ts`, then the placement, then the caller's
  // `className`; later classes win.
  const classes = computed(() =>
    joinClassNames(slider?.slots.output(), placementClasses(), resolvedClassName()),
  );

  /** `children ? children : state.getThumbValueLabel(0)`, as upstream writes it (R-082). */
  const renderContent = (): JSX.Element => {
    const value = children();

    // Upstream's falsy check: `""` falls back to the value text, and so does a
    // missing child.
    if (value === null || value === undefined || value === false || value === "") {
      // R-082: the default child is the value label, as a real `Text`.
      return <Text>{slider?.state.valueText() ?? ""}</Text>;
    }

    if (typeof value === "function" && value.length >= 1) {
      return renderChildren(
        untracked(() =>
          (value as (values: ColorSliderRenderProps) => JSX.Element)(renderProps()),
        ),
      );
    }

    return renderChildren(value as JSX.Element);
  };

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // An `<output>` is not a keyboard focus stop upstream.
      focusable={local.focusable ?? false}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      class={classes()}
      style={resolvedStyle()}
    >
      {renderContent()}
    </View>
  );
}
