import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps } from "nsh";

import { joinClassNames } from "./class-names";
import { KbdContext } from "./context";
import type { KbdContextValue } from "./context";
import type { AriaProps, DataProps, GlobalDomProps } from "./kbd-dom-props";
import { viewProps } from "./kbd-dom-props";
import { kbdVariants } from "./kbd.styles";
import type { KbdVariants } from "./kbd.styles";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Kbd Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Kbd.Root` (= `Kbd`): HeroUI 3.2.7's `KbdRootProps`, which is
 * React's `<kbd>` attributes plus `children`, `className` and `variant`,
 * expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `aria-*`, `data-*`, `dir` / `lang`
 * …) are accepted so code written against HeroUI keeps compiling; see the port
 * sheet §1 and §8 for what they can and cannot do here. `ref` reaches the root
 * `View`, as `ComponentPropsWithRef` does upstream.
 */
export interface KbdRootProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  children: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Visual variant: no variant class by default (HeroUI's CSS has no `.kbd--default`). */
  variant?: KbdVariants["variant"];

  /**
   * A DOM id upstream; maps to `nativeID`, the name other elements refer to.
   */
  id?: string;

  /**
   * Upstream this is the DOM `title` attribute of `<kbd>`: the browser's
   * native hover tooltip. NSH has no `title`, so it feeds `tooltip` (the
   * visible hint) and `accessibilityHint`, exactly as `Kbd.Abbr` does.
   */
  title?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;
}

export function KbdRoot(props: KbdRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "variant",
    "id",
    "nativeID",
    "focusable",
    "title",
    "tooltip",
    "accessibilityHint",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // The root slot of the same variant table the parts read through context.
  const classes = computed(() =>
    joinClassNames(kbdVariants({ variant: local.variant }).base(), local.className),
  );

  // `<kbd title>` shows the browser's native hint; NSH draws it with `tooltip`
  // and describes it with `accessibilityHint` (port sheet §8, R-004).
  const titleText = computed(() => {
    const text = local.title;

    return text !== undefined && text.length > 0 ? text : undefined;
  });
  const titleTooltip = computed(() => {
    const text = titleText();

    return text === undefined ? undefined : <Text>{text}</Text>;
  });

  // Only the variant travels down; each part resolves its own slot, so a
  // runtime change of `variant` re-resolves all three class strings.
  const contextValue: KbdContextValue = { variant: () => local.variant };

  return (
    <KbdContext.Provider value={contextValue}>
      <View
        {...viewProps(rest)}
        nativeID={local.id ?? local.nativeID}
        // A `<kbd>` is not a focus stop upstream; without this a pressable
        // view would become one. A caller's own `focusable` still wins.
        focusable={local.focusable ?? false}
        accessibilityHint={local.accessibilityHint ?? titleText()}
        tooltip={local.tooltip ?? titleTooltip()}
        class={classes()}
        style={local.style}
      >
        {/*
          The single read of `children`, inside the provider and at the
          placement (research 4.1, 4.6, and the provider exception in the
          common rules): reading it in the body would evaluate outside the
          provider and the Abbr / Content parts would lose the context.
          `renderChildren` turns a bare string / number into a `Text`, because
          a `View` draws none; upstream `<kbd>{children}</kbd>` shows them.
        */}
        {renderChildren(local.children)}
      </View>
    </KbdContext.Provider>
  );
}
