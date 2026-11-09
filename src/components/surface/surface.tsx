import type { JSX, StyleProp, ViewProps, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./children";
import { SurfaceContext, type SurfaceContextValue } from "./surface-context";
import { surfaceVariants, type SurfaceVariants } from "./surface.styles";

/* -------------------------------------------------------------------------------------------------
 * Surface Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Surface.Root`: HeroUI 3.2.7's `SurfaceRootProps`, which is a
 * `div` with `children`, `className` and the one `variant` dimension,
 * expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`id`, `render`, `aria-*`, `data-*` and the
 * `div` event props) are accepted so code written against HeroUI keeps
 * compiling; see the port sheet §1 and §8 for what they can and cannot do
 * here. NSH host events (`onPress`, `onMouseEnter`, …) travel through the rest
 * props to the root `View`.
 */
export interface SurfaceRootProps extends Omit<ViewProps, "children" | "class" | "style"> {
  /**
   * The content. Optional although HeroUI's type requires it, because an
   * empty surface is valid at runtime upstream; bare strings and numbers
   * become `Text` at the placement (research 4.1, 4.6).
   */
  children?: JSX.Element;

  /** Appended after the variant classes; later classes win. */
  className?: string;

  /** Style of the root view; wins over the variant classes on the keys it sets. */
  style?: StyleProp<ViewStyle>;

  /** Visual variant. @default "default" */
  variant?: SurfaceVariants["variant"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no DOM attribute channel. */
  [key: `aria-${string}`]: unknown;

  /** Accepted, no effect: NSH has no DOM attribute channel; `testID` names a view. */
  [key: `data-${string}`]: unknown;
}

/**
 * Surface.Root / SurfaceRoot: a container that paints one of the four surface
 * tones and hands its `variant` to everything under it through
 * `SurfaceContext`.
 *
 * It holds no state of its own: `variant` is a read-only input, and both
 * products (the root class string and the context value) are derived values.
 * It is built on the core `View` rather than a nsh/base component because
 * nsh/base has no generic container, and `View` satisfies all four reuse
 * criteria by itself (port sheet §3): it takes any children, paints nothing of
 * its own, has no behavior contract, and has no internal state.
 */
export function SurfaceRoot(props: SurfaceRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "focusable",
    "variant",
    "id",
    "nativeID",
    "render",
  ] as const);

  // The only input, as a derived value (port sheet §2). `variant` is a
  // read-only prop, so a computed keeps it live without a second source of
  // truth.
  const variant = computed(() => local.variant ?? "default");

  const contextValue: SurfaceContextValue = { variant };

  // The root class string: the variant table, then the caller's `className`.
  // HeroUI merges them in the same order through `surfaceVariants`, and
  // `tv`'s tailwind-merge lets the later class win on a conflict.
  const resolvedClassName = computed(() =>
    surfaceVariants({ className: local.className, variant: variant() }),
  );

  // `_common` exception: Surface provides a context, so `props.children` is
  // read once, inside the Provider, at the placement. A computed created in
  // the body would be evaluated outside it and the descendants would lose the
  // context. Nothing else reads the children.
  return (
    <SurfaceContext.Provider value={contextValue}>
      <View
        {...rest}
        ref={(node) => (typeof local.ref === "function" ? local.ref(node) : undefined)}
        nativeID={local.id ?? local.nativeID}
        // A `<div>` is not a keyboard focus stop upstream; without this a
        // pressable surface would become one (Tab moves between pressables).
        // The caller's own `focusable` wins, as HeroUI forwards `rest` last.
        focusable={local.focusable ?? false}
        class={resolvedClassName()}
        style={local.style}
      >
        {renderChildren(local.children)}
      </View>
    </SurfaceContext.Provider>
  );
}
