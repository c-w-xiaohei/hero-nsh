import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { joinClassNames } from "./class-names";
import { ChipContext } from "./context";
import type { ChipContextValue } from "./context";
import type { AriaProps, DataProps, GlobalDomProps } from "./chip-dom-props";
import { viewProps } from "./chip-dom-props";
import { renderChipChildren } from "./render-chip-children";
import { chipVariants } from "./chip.styles";
import type { ChipVariants } from "./chip.styles";

/* -------------------------------------------------------------------------------------------------
 * Chip Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Chip.Root` (= `Chip`): HeroUI 3.2.7's `ChipRootProps`, which
 * is React's `<span>` attributes plus `children`, `className`, `color`, `size`
 * and `variant`, expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `aria-*`, `data-*`, `dir` / `lang`
 * …) are accepted so code written against HeroUI keeps compiling; see the port
 * sheet §1 and §8 for what they can and cannot do here. Upstream's generic `E`
 * only changes the type surface (the element is always `dom.span`), so it is
 * not kept; the port sheet §8 registers that.
 */
export interface ChipRootProps
  extends Omit<ViewProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  children: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Chip color: foreground only; the solid / soft background comes from `variant`. */
  color?: ChipVariants["color"];

  /** Chip size; unset means no size class, which looks the same as `md`. */
  size?: ChipVariants["size"];

  /** Chip variant: `secondary` by default, like HeroUI. */
  variant?: ChipVariants["variant"];

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

  /** Reaches the root `View`; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

export function ChipRoot(props: ChipRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "color",
    "size",
    "variant",
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

  // The root slot of the same variant table the label reads through context
  // (port sheet §2). Re-resolved whenever a dimension changes, so both slots
  // follow at once.
  const slots = computed(() =>
    chipVariants({
      color: local.color,
      size: local.size,
      variant: local.variant,
    }),
  );

  const classes = computed(() => joinClassNames(slots().base(), local.className));

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

  // Only the variant table travels down; the label resolves its own slot from
  // it (the Kbd / Switch pattern).
  const contextValue: ChipContextValue = { slots };

  // R-025: HeroUI's `<span>` carrying the block box becomes a `View`; the row
  // direction, `w-fit` and the chip's padding come from the `base` slot, and
  // `data-slot="chip"` is dropped (D18).
  return (
    <ChipContext.Provider value={contextValue}>
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
        {/*
          R-027: the single read of `children`, inside the provider and at the
          placement (research 4.1, 4.6, and the provider exception in the common
          rules). `renderChipChildren` resolves a dynamic child, then wraps a
          top-level string / number in `Chip.Label`; doing that in the body
          would freeze `<Chip>{value()}</Chip>` at its first value.
        */}
        {renderChipChildren(local.children)}
      </View>
    </ChipContext.Provider>
  );
}
