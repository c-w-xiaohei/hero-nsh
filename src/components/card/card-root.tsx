import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./card-children";
import type { AriaProps, DataProps, GlobalDomProps } from "./card-dom-props";
import { viewProps } from "./card-dom-props";
import { cardVariants, type CardVariants } from "./card.styles";
import { CardContext, type CardContextValue } from "./context";
import { SurfaceContext, type SurfaceContextValue } from "../surface";

/* -------------------------------------------------------------------------------------------------
 * Card Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Card.Root` (= `Card`): HeroUI 3.2.7's `CardRootProps`, which is
 * a `div`'s intrinsic attributes plus `children`, `className` and `variant`,
 * expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `aria-*`, `data-*`, `dir` / `lang` /
 * `hidden` / `inert` / `translate`, the intrinsic event names) are accepted so
 * code written against HeroUI keeps compiling; see the port sheet §1 and §8 for
 * what they can and cannot do here. NSH host events (`onPress`, `onMouseEnter`,
 * …) travel through the rest props to the root `View`.
 */
export interface CardRootProps
  extends Omit<ViewProps, "children" | "class">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The content. Optional although HeroUI's type requires it, because an empty
   * card is valid at runtime upstream; a bare string or number becomes a `Text`
   * at the placement (research 4.1, 4.6).
   */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Visual variant. @default "default" */
  variant?: CardVariants["variant"];

  /** A DOM id upstream; maps to `nativeID`, the name other elements refer to. */
  id?: string;

  /**
   * Upstream this is the DOM `title` attribute of the `div`: the browser's
   * native hover tooltip. NSH has no `title`, so it feeds `tooltip` (the
   * visible hint) and `accessibilityHint`.
   */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the card from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

/**
 * `Card.Root` / `CardRoot`: the container of the five-part card.
 *
 * It holds no state: `variant` is a read-only input, and the slot table, the
 * context value and the root class string are its pure derived values (port
 * sheet §2). It creates `CardContext` for the five parts and hands its variant
 * to everything below through `SurfaceContext`, as upstream does, so inner
 * components can pick "on-surface" colors.
 */
export function CardRoot(props: CardRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "focusable",
    "variant",
    "id",
    "nativeID",
    "title",
    "tooltip",
    "accessibilityLabel",
    "accessibilityHint",
    "accessibilityElementsHidden",
    "aria-label",
    "aria-hidden",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
    "translate",
  ] as const);

  // The only variant input, kept live as a derived value; `defaultVariants`
  // fills it when the caller passes nothing.
  const variant = computed<CardVariants["variant"]>(() => local.variant ?? "default");

  // R-020: the five parts read the dimension, not upstream's slot functions
  // (D17; the upstream context is not exported, so its shape is unobservable).
  const contextValue: CardContextValue = { variant };

  // R-019: upstream does not provide `SurfaceContext` at all for `transparent`,
  // so its subtree reads the context default `{}`. Here one provider stays
  // mounted for every variant and its accessor answers `undefined` for
  // `transparent` — the same value its descendants read, without remounting
  // the subtree (and losing descendants' state) when the variant changes.
  const surfaceValue: SurfaceContextValue = {
    variant: () => (variant() === "transparent" ? undefined : variant()),
  };

  // The root class string: the variant table's `base` slot, then the caller's
  // `className`; `tv`'s tailwind-merge lets the later class win.
  const classes = computed(() =>
    cardVariants({ variant: variant() }).base({ className: local.className }),
  );

  // Upstream `title` is the `div`'s native hover hint; NSH has no `title`, so
  // it becomes a `Text` tooltip plus the accessibility hint.
  const tooltip = computed<JSX.Element>(() => {
    if (local.tooltip !== undefined) {
      return local.tooltip;
    }

    const text = local.title;

    return text === undefined || text.length === 0 ? undefined : <Text>{text}</Text>;
  });

  return (
    <CardContext.Provider value={contextValue}>
      <SurfaceContext.Provider value={surfaceValue}>
        <View
          {...viewProps(rest)}
          // A callback only: NSH writes into a ref store, and an undefined one
          // would throw at mount on the web target (common rules, real hosts).
          ref={(node) => local.ref?.(node)}
          nativeID={local.id ?? local.nativeID}
          // R-013: upstream's root is a `<div>`, which is not a keyboard focus
          // stop; without this a pressable card would become one. A caller's
          // own `focusable` wins.
          focusable={local.focusable ?? false}
          accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
          accessibilityElementsHidden={
            local["aria-hidden"] ?? local.accessibilityElementsHidden
          }
          accessibilityHint={local.accessibilityHint ?? local.title}
          tooltip={tooltip()}
          class={classes()}
          style={local.style}
        >
          {/*
            The provider exception in the common rules: a component that
            provides a context reads `props.children` once, inside the
            Provider, at the placement. A computed created in the body would
            evaluate outside it and the parts would lose `CardContext`.
          */}
          {renderChildren(local.children)}
        </View>
      </SurfaceContext.Provider>
    </CardContext.Provider>
  );
}
