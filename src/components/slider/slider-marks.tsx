import { cleanup, computed, split, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { joinClassNames } from "./class-names";
import { SliderContext } from "./slider-context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./slider-dom-props";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Slider Marks
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Slider.Marks`: HeroUI 3.2.7's `SliderMarksProps`, which is a
 * `div` (or another intrinsic element through the `E` generic) with children
 * and `className`.
 */
export interface SliderMarksProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** The `Slider.Mark` labels; upstream also lets a caller place anything here. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

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
 * Slider.Marks / SliderMarks: the row (or column) of value labels outside the
 * track.
 *
 * R-054 / R-056: upstream asks the CSS `:has(> .slider__marks)` whether this
 * part exists, to switch the vertical root's columns. NSH has no `:has`, so
 * the part registers itself with the root on mount and unregisters on
 * unmount; the root reads that signal for its template.
 *
 * R-077: `dir={direction}` has no NSH attribute; the direction goes into the
 * style instead.
 */
export function SliderMarks(props: SliderMarksProps): JSX.Element {
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

  // Read once, in the body: the slider these marks belong to, if any.
  const slider = SliderContext();

  // Registration side effect (port sheet R-054 / R-056): the root learns that
  // a Marks is mounted. The cleanup runs when this part goes away.
  const registerMarks = slider?.registerMarks;

  if (registerMarks) {
    cleanup(registerMarks());
  }

  const isVertical = () => slider?.orientation() === "vertical";

  // R-015: `.slider__marks` → `grid-area: marks`: row 3 in the horizontal
  // grid; row 2, column 2 in the vertical one, beside the track (R-053).
  // R-038: the horizontal `:has(> .slider__marks)` area row needs no `:has` and
  // no root registration: this part declares row 3 itself, so without a Marks
  // no third row or gap exists.
  // R-055: the vertical `:has(> .slider__marks)` areas — output row 1 across
  // both columns, track row 2 column 1, marks row 2 column 2, label row 3
  // across both — are these parts' line declarations plus the root's
  // `hasMarks()` template (R-056).
  //
  // R-016: the horizontal `.slider__marks` → `grid-template-columns:
  // minmax(0, 1fr)`.
  // R-040: the horizontal `.slider__marks` → `@apply mx-3` (the track's
  // transparent borders are 0.75rem a side, so the labels line up with the
  // usable track).
  // R-058: the vertical `.slider__marks` → `@apply my-3`.
  // R-059: the vertical `.slider__marks` → `grid-template-rows:
  // minmax(0, 1fr); grid-template-columns: max-content`.
  const classes = computed(() =>
    joinClassNames(
      slider?.slots().marks(),
      isVertical()
        ? "row-start-2 col-start-2 my-3 grid-rows-[minmax(0,1fr)] grid-cols-[max-content]"
        : "row-start-3 col-start-1 col-span-2 mx-3 grid-cols-[minmax(0,1fr)]",
      local.className,
    ),
  );

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      // R-077: the language direction reaches the subtree as a style, since
      // NSH's `View` has no `dir` attribute.
      style={[local.style, { direction: slider?.isRtl() ? "rtl" : "ltr" }]}
    >
      {renderChildren(local.children)}
    </View>
  );
}
