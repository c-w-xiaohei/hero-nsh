import type { JSX, ViewProps } from "nsh";
import { computed, split, Text, View } from "nsh";

import { joinClassNames } from "./class-names";
import { hostProps, type AriaProps, type DataProps, type GlobalDomProps } from "./meter-dom-props";
import { MeterContext } from "./meter-context";

/* -------------------------------------------------------------------------------------------------
 * Output
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Meter.Output`: HeroUI 3.2.7's `MeterOutputProps`, which is a
 * `span` (or, through the `E` generic, another intrinsic element) with
 * `children` and `className`.
 *
 * NSH has one kind of host view, so a `View` stands in for the `span`; the
 * `E` generic has no meaning and `render` is accepted with no effect. The
 * remaining props map onto `ViewProps`.
 */
export interface MeterOutputProps
  extends Omit<ViewProps, "children" | "class" | "style">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Overrides the formatted value; when absent the meter's value text shows. */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Style of the output; wins over the slot classes on the keys it sets. */
  style?: ViewProps["style"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

/**
 * Meter.Output / MeterOutput: the formatted value, right-aligned in the
 * meter's first row.
 *
 * Its default content is the root's `valueText`; HeroUI writes
 * `children ?? state?.valueText`, and outside a root both are absent, so it
 * renders empty (port sheet §1).
 *
 * The text is a real `Text` child of the part. A string placed directly in a
 * `View` is not drawn, and a `Text` that only holds a string keeps it as its
 * own content, which no descendant selector can reach; the nested `Text` gives
 * the part an actual content view and the typography classes inherit into it,
 * as the `span`'s font properties do into its text nodes upstream.
 */
export function MeterOutput(props: MeterOutputProps): JSX.Element {
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
  ] as const);

  // Read once, in the body: the meter this output belongs to, if any. There is
  // no context in NSH's event handlers, and this part has none.
  const meter = MeterContext();

  // R-011 … R-014 in `meter.styles.ts`, then the caller's `className`.
  const classes = computed(() => joinClassNames(meter?.slots().output(), local.className));

  // The single read of `props.children`; a dynamic child keeps updating, and
  // the fallback below reads the value text through the same expression, so
  // both paths stay reactive.
  const children = computed(() => local.children);

  // `children ?? state?.valueText`, as upstream spells it.
  const content = () => children() ?? meter?.valueText();

  const renderContent = (node: JSX.Element): JSX.Element => {
    if (node === null || node === undefined || typeof node === "boolean") {
      return null;
    }

    // NSH's reactive child: call it where the read is tracked, not once in the
    // body, so `<Meter.Output>{value()}</Meter.Output>` keeps following.
    if (typeof node === "function") {
      return renderContent(node());
    }

    if (Array.isArray(node)) {
      return node.map((child) => renderContent(child)) as unknown as JSX.Element;
    }

    if (typeof node === "string" || typeof node === "number") {
      return <Text>{node}</Text>;
    }

    return node;
  };

  return (
    <View
      {...hostProps(rest)}
      ref={(node) => (typeof local.ref === "function" ? local.ref(node) : undefined)}
      nativeID={local.id ?? local.nativeID}
      // A `<span>` is not a keyboard focus stop upstream.
      focusable={local.focusable ?? false}
      class={classes()}
      style={local.style}
    >
      {renderContent(content())}
    </View>
  );
}
