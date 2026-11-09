import type { JSX, ViewProps } from "nsh";
import { computed, effect, LayoutAnimation, reduceMotion, signal, split, View } from "nsh";

import { joinClassNames } from "./class-names";
import { hostProps, type AriaProps, type DataProps, type GlobalDomProps } from "./meter-dom-props";
import { MeterContext } from "./meter-context";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Fill
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Meter.Fill`: HeroUI 3.2.7's `MeterFillProps`, which is a `div`
 * (or another intrinsic element through the `E` generic) with `children`,
 * `className` and `style`.
 *
 * `style` is spread first and the width is written after it, as upstream does
 * (`meter.tsx:132-135`): a caller's `style.width` is overridden by the meter's
 * own percentage. `render` is accepted with no effect.
 */
export interface MeterFillProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Rendered as upstream's `div` renders it; normally the fill is empty. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Style of the fill; the meter owns `width` and writes it after this. */
  style?: ViewProps["style"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/**
 * Meter.Fill / MeterFill: the painted part of the track.
 *
 * Its width is the meter's percentage, written as an inline percentage style:
 * that inline width is the one owner of the property. HeroUI gets the change
 * from a Class CSS transition (`transition: width 300ms var(--ease-out)`), but
 * NSH does not transition layout properties, so the change goes through
 * `LayoutAnimation` (port sheet §4, R-027 / R-028, research §3.2).
 *
 * The signal mirrors the percentage only for the animation: `percentage()`
 * stays the single source, and the effect below copies it into the width the
 * same way React writes the style during render.
 */
export function MeterFill(props: MeterFillProps): JSX.Element {
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

  // Read once, in the body: the meter this fill belongs to, if any. Outside a
  // root the percentage is 0, so the fill is empty rather than missing.
  const meter = MeterContext();
  const percentage = () => meter?.percentage() ?? 0;

  // R-021 … R-026 in `meter.styles.ts`, then the caller's `className`.
  const classes = computed(() => joinClassNames(meter?.slots().fill(), local.className));

  // The width the next commit paints. It starts at the current percentage so
  // the first frame is already correct.
  const fillWidth = signal(percentage());

  // R-027: `transition: width 300ms var(--ease-out)` → a layout animation
  // around the width write. The first frame does not animate (there is no
  // previous width); every later change configures the next commit.
  // R-028: `motion-reduce:transition-none` → the reduced-motion check instead
  // of the class, because the width lives in an inline style.
  let firstFrame = true;

  effect(() => {
    const next = percentage();

    if (firstFrame) {
      firstFrame = false;
      fillWidth.set(next);

      return;
    }

    if (!reduceMotion()) {
      LayoutAnimation.configureNext({ duration: 300, update: { type: "easeOut" } });
    }

    fillWidth.set(next);
  });

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => (typeof local.ref === "function" ? local.ref(node) : undefined)}
      nativeID={local.id ?? local.nativeID}
      class={classes()}
      // The caller's style first, the meter's width after it: upstream writes
      // `{...style, width}` in that order, so `width` stays the component's.
      style={[local.style, { width: `${fillWidth()}%` }]}
    >
      {renderChildren(local.children)}
    </View>
  );
}
