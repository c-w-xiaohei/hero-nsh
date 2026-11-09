import type { JSX, ViewProps } from "nsh";
import { computed, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import { hostProps, type AriaProps, type DataProps, type GlobalDomProps } from "./meter-dom-props";
import { MeterContext } from "./meter-context";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Track
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Meter.Track`: HeroUI 3.2.7's `MeterTrackProps`, which is a
 * `div` (or another intrinsic element through the `E` generic) with
 * `children` and `className`, expressed with NSH's view host props.
 *
 * `render` is accepted with no effect and the `E` generic has no meaning: NSH
 * has one kind of view host.
 */
export interface MeterTrackProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Usually the `Meter.Fill`; a bare string becomes `Text` at the placement. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Style of the track; wins over the slot classes on the keys it sets. */
  style?: ViewProps["style"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/**
 * Meter.Track / MeterTrack: the rail the fill sits in.
 *
 * It is the fill's containing block (`relative` + `overflow-hidden`) and owns
 * the track's height and radius, which the `size` variant of the root's
 * `tv()` result resolves (R-015 … R-020, R-031 … R-036).
 */
export function MeterTrack(props: MeterTrackProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "ref",
    "slot",
    "render",
  ] as const);

  // Read once, in the body: the meter this track belongs to, if any.
  const meter = MeterContext();

  // R-015 … R-020 in `meter.styles.ts`, then the caller's `className`.
  const classes = computed(() => joinClassNames(meter?.slots().track(), local.className));

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => (typeof local.ref === "function" ? local.ref(node) : undefined)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      style={local.style}
    >
      {renderChildren(local.children)}
    </View>
  );
}
