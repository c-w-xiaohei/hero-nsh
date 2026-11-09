import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { joinClassNames } from "./class-names";
import { ChipContext } from "./context";
import type { AriaProps, DataProps, GlobalDomProps } from "./chip-dom-props";
import { viewProps } from "./chip-dom-props";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Chip Label
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Chip.Label`: HeroUI 3.2.7's `ChipLabelProps`, which is React's
 * `<span>` attributes plus `children` and `className`, expressed with NSH's
 * view host props.
 *
 * The DOM-only members upstream (`render`, `aria-*`, `data-*`, `dir` / `lang`
 * …) are accepted so code written against HeroUI keeps compiling; see the port
 * sheet §1 and §8 for what they can and cannot do here.
 */
export interface ChipLabelProps
  extends Omit<ViewProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * Upstream this is the DOM `title` attribute of `<span>`: the browser's
   * native hover tooltip. NSH has no `title`, so it feeds `tooltip` (the
   * visible hint) and `accessibilityHint`.
   */
  title?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Reaches the label's `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

export function ChipLabel(props: ChipLabelProps): JSX.Element {
  // Read once, in the body: the root's variant table, when this label sits
  // inside a `Chip` (port sheet §2).
  const ctx = ChipContext();

  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "id",
    "nativeID",
    "focusable",
    "title",
    "tooltip",
    "accessibilityHint",
    "render",
    "ref",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // The single read of `children`, shared by the placement below (research
  // 4.1 / 4.6). It stays a computed so `<Chip.Label>{value()}</Chip.Label>`
  // follows `value` instead of freezing at the first frame.
  const children = computed(() => local.children);

  // `<span title>` shows the browser's native hint; NSH draws it with `tooltip`
  // and describes it with `accessibilityHint` (port sheet §8).
  const titleText = computed(() => {
    const text = local.title;

    return text !== undefined && text.length > 0 ? text : undefined;
  });
  const titleTooltip = computed(() => {
    const text = titleText();

    return text === undefined ? undefined : <Text>{text}</Text>;
  });

  // R-004 (the slot class) lives in `chip.styles.ts`. Without a root there are
  // no slot classes upstream either, only the caller's `className`.
  const classes = computed(() =>
    joinClassNames(ctx ? ctx.slots().label() : "", local.className),
  );

  // R-026: HeroUI's `<span>` becomes a `View` that carries the label padding
  // and any child node, plus an inner `Text` for bare strings — a `View` draws
  // none and a `Text` cannot hold arbitrary children. `data-slot` is dropped
  // (D18); identify the view with `testID` instead.
  return (
    <View
      {...viewProps(rest)}
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      // A `<span>` is not a focus stop upstream. A caller's own `focusable`
      // still wins.
      focusable={local.focusable ?? false}
      accessibilityHint={local.accessibilityHint ?? titleText()}
      tooltip={local.tooltip ?? titleTooltip()}
      class={classes()}
      style={local.style}
    >
      {renderChildren(children())}
    </View>
  );
}
