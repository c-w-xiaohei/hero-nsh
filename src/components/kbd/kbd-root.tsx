import { computed, split, View } from "nsh";
import type { JSX, ViewProps } from "nsh";

import { joinClassNames } from "./class-names";
import { KbdContext } from "./context";
import type { KbdContextValue } from "./context";
import type { AriaProps, DataProps, GlobalDomProps } from "./kbd-dom-props";
import { kbdVariants } from "./kbd.styles";
import type { KbdVariants } from "./kbd.styles";

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

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

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
  ] as const);

  // The root slot of the same variant table the parts read through context.
  const classes = computed(() =>
    joinClassNames(kbdVariants({ variant: local.variant }).base(), local.className),
  );

  // Only the variant travels down; each part resolves its own slot, so a
  // runtime change of `variant` re-resolves all three class strings.
  const contextValue: KbdContextValue = { variant: () => local.variant };

  return (
    <KbdContext.Provider value={contextValue}>
      <View
        {...rest}
        nativeID={local.id ?? local.nativeID}
        // A `<kbd>` is not a focus stop upstream; without this a pressable
        // view would become one. A caller's own `focusable` still wins.
        focusable={local.focusable ?? false}
        class={classes()}
        style={local.style}
      >
        {/*
          The single read of `children`, inside the provider and at the
          placement (research 4.1, 4.6, and the provider exception in the
          common rules): reading it in the body would evaluate outside the
          provider and the Abbr / Content parts would lose the context.
        */}
        {local.children}
      </View>
    </KbdContext.Provider>
  );
}
