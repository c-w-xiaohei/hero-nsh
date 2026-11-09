import { computed, split, View } from "nsh";
import type { Bounds, JSX, ViewProps, ViewRef } from "nsh";

import { joinClassNames } from "./class-names";
import { ProgressBarContext } from "./context";
import {
  hostProps,
  type AriaProps,
  type DataProps,
  type GlobalDomProps,
} from "./progress-bar-dom-props";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * ProgressBar Track
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `ProgressBar.Track`: HeroUI 3.2.7's `ProgressBarTrackProps`,
 * which is a `div` (or another intrinsic element through the `E` generic) with
 * `children` and `className`.
 */
export interface ProgressBarTrackProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Normally the `Fill`; anything else renders inside the track's clip. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the `View` host as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * ProgressBar.Track / ProgressBarTrack: the groove, and the positioning and
 * clipping box of the Fill.
 *
 * It is also the bar's ruler. Upstream lets CSS resolve the fill's percentages;
 * NSH's indeterminate animation moves by points, so the track reports its
 * laid-out width into the root's context. The caller's own `onLayout` receives
 * the same event: the measurement is recorded first and neither handler
 * swallows the other (port sheet section 2).
 */
export function ProgressBarTrack(props: ProgressBarTrackProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "slot",
    "render",
    "onLayout",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // Read once, in the body: the bar this track belongs to, if any.
  const bar = ProgressBarContext();

  // R-009 / R-010 / R-011 in `progress-bar.styles.ts`, then the caller's
  // `className`.
  const classes = computed(() =>
    joinClassNames(bar?.slots().track(), local.className),
  );

  const handleLayout = (event: { bounds: Bounds }) => {
    bar?.setTrackWidth(event.bounds.size.width);
    local.onLayout?.(event);
  };

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
      onLayout={handleLayout}
    >
      {renderChildren(local.children)}
    </View>
  );
}
