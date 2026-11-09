import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps } from "nsh";

import { joinClassNames } from "./class-names";
import { KbdContext } from "./context";
import { kbdKeysLabelMap, kbdKeysMap } from "./kbd.constants";
import type { KbdKey } from "./kbd.constants";
import type { AriaProps, DataProps, GlobalDomProps } from "./kbd-dom-props";
import { kbdVariants } from "./kbd.styles";

/* -------------------------------------------------------------------------------------------------
 * Kbd Abbr
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Kbd.Abbr`: HeroUI 3.2.7's `KbdAbbrProps`, which is React's
 * `<abbr>` attributes plus `keyValue` and `className`.
 *
 * The DOM-only members upstream (`render`, `title`, `aria-*`, `data-*`) are
 * accepted for API parity; `title` is mapped to the two NSH channels described
 * below, the rest have no effect (port sheet §1, §8).
 */
export interface KbdAbbrProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** The keyboard key to display. */
  keyValue: KbdKey;

  /**
   * Upstream this is the DOM `title` attribute, set from
   * `kbdKeysLabelMap[keyValue]` and overridable by the caller. NSH has no
   * `title`, so it feeds `tooltip` and `accessibilityHint` instead.
   */
  title?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

export function KbdAbbr(props: KbdAbbrProps): JSX.Element {
  // The root's variant, read once in the body (context is not available in
  // event handlers and is not needed there: this part is display-only).
  const ctx = KbdContext();

  const [local, rest] = split(props, [
    "className",
    "style",
    "keyValue",
    "title",
    "id",
    "nativeID",
    "focusable",
    "tooltip",
    "accessibilityHint",
  ] as const);

  // The glyph and the readable label, both derived from `keyValue` only.
  const glyph = computed(() => kbdKeysMap[local.keyValue]);
  const label = computed(() => local.title ?? kbdKeysLabelMap[local.keyValue]);

  // R-005 (the slot class) lives in `kbd.styles.ts`; without a root there are
  // no slot classes upstream either, only the caller's `className`.
  const classes = computed(() =>
    joinClassNames(
      ctx ? kbdVariants({ variant: ctx.variant() }).abbr() : "",
      local.className,
    ),
  );

  // R-004: `<abbr title={…}>` has no NSH counterpart. The element becomes a
  // `View` that owns the box (`w-full h-full`, centering) with a `Text` that
  // draws the glyph; `title` becomes the desktop hover tooltip below and the
  // screen-reader hint below that (port sheet §8 registers both as
  // approximations).
  const tooltip = computed(() => {
    const text = label();

    return text.length > 0 ? <Text>{text}</Text> : undefined;
  });

  return (
    <View
      {...rest}
      nativeID={local.id ?? local.nativeID}
      focusable={local.focusable ?? false}
      accessibilityHint={local.accessibilityHint ?? label()}
      tooltip={local.tooltip ?? tooltip()}
      class={classes()}
      style={local.style}
    >
      {/* R-004: the glyph now lives in a `Text`, because a `View` draws no
          bare string. */}
      <Text>{glyph()}</Text>
    </View>
  );
}
