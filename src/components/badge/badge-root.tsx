import { computed, split, Text, View } from "nsh";
import type { JSX, ViewProps, ViewRef } from "nsh";

import { renderChildren } from "./badge-children";
import { BadgeLabel } from "./badge-label";
import { badgeVariants, type BadgeVariants } from "./badge.styles";
import type { AriaProps, DataProps, GlobalDomProps } from "./badge-dom-props";
import { viewProps } from "./badge-dom-props";
import { joinClassNames } from "./class-names";
import { BadgeContext } from "./context";
import type { BadgeContextValue } from "./context";

/* -------------------------------------------------------------------------------------------------
 * Badge Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Badge.Root` (= `Badge`): HeroUI 3.2.7's `BadgeRootProps`, which
 * is React's `<span>` attributes plus `children`, `className`, `color`,
 * `placement`, `size` and `variant`, expressed with NSH's view host props.
 *
 * The DOM-only members upstream (`render`, `aria-*`, `data-*`, `dir` / `lang`
 * …) are accepted so code written against HeroUI keeps compiling; see the port
 * sheet §1 and §8 for what they can and cannot do here. `ref` reaches the root
 * `View`, as `ComponentPropsWithRef` does upstream.
 */
export interface BadgeRootProps
  extends Omit<ViewProps, "children" | "class" | "ref">,
    AriaProps,
    DataProps,
    GlobalDomProps {
  /**
   * The content. A bare string or number becomes a `Badge.Label` (HeroUI does
   * the same in `BadgeRoot`), because the `Label` carries the horizontal
   * padding; any other value passes through.
   */
  children?: JSX.Element;

  /** Appended after the slot classes; later classes win. */
  className?: string;

  /** Badge color. @default "default" */
  color?: BadgeVariants["color"];

  /** Badge placement. @default "top-right" */
  placement?: BadgeVariants["placement"];

  /** Badge size. @default "md" */
  size?: BadgeVariants["size"];

  /** Badge variant. @default "primary" */
  variant?: BadgeVariants["variant"];

  /**
   * A DOM id upstream; maps to `nativeID`, the name other elements refer to.
   */
  id?: string;

  /**
   * Upstream this is the DOM `title` attribute of `<span>`: the browser's
   * native hover tooltip. NSH has no `title`, so it feeds `tooltip` (the
   * visible hint) and `accessibilityHint`, exactly as `Kbd.Root` does.
   */
  title?: string;

  /** The accessible name. Maps to `accessibilityLabel`. */
  "aria-label"?: string;

  /** Hides the badge from assistive technology. Maps to `accessibilityElementsHidden`. */
  "aria-hidden"?: boolean;

  /** Accepted, no effect: NSH has no DOM render function to replace the element. */
  render?: unknown;

  /** Forwarded to the root `View` as a callback, never as a ref store. */
  ref?: (node: ViewRef) => void;
}

export function BadgeRoot(props: BadgeRootProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "color",
    "placement",
    "size",
    "variant",
    "id",
    "nativeID",
    "ref",
    "focusable",
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

  /*
   * The slot table is the pure function of the four variant dimensions the
   * sheet's §2 names. `defaultVariants` fills every missing one, so an
   * untouched `<Badge>` resolves exactly HeroUI's `top-right / md / default /
   * primary` combination.
   */
  const slots = computed(() =>
    badgeVariants({
      color: local.color,
      placement: local.placement,
      size: local.size,
      variant: local.variant,
    }),
  );

  const classes = computed(() => joinClassNames(slots().base(), local.className));

  // Only the slot accessor travels down; `Badge.Label` resolves its own slot
  // from the very same table, so a runtime variant change re-resolves both.
  const contextValue: BadgeContextValue = { slots };

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

  return (
    <BadgeContext.Provider value={contextValue}>
      <View
        {...viewProps(rest)}
        // A callback only: NSH writes into a ref store, and an undefined one
        // would throw at mount on the web target (common rules, real hosts).
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? local.nativeID}
        // A `<span>` is not a focus stop upstream; leave it out of the Tab
        // order unless the caller asks for it explicitly.
        focusable={local.focusable ?? false}
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        accessibilityElementsHidden={
          local["aria-hidden"] ?? local.accessibilityElementsHidden
        }
        accessibilityHint={local.accessibilityHint ?? titleText()}
        tooltip={local.tooltip ?? titleTooltip()}
        class={classes()}
        style={local.style}
      >
        {/*
          The single read of `children`, inside the provider and at the
          placement (research 4.1, 4.6, and the provider exception in the
          common rules): a computed created in the body would evaluate outside
          the provider, and `Badge.Label` would lose the slot table.
        */}
        {renderBadgeChildren(local.children)}
      </View>
    </BadgeContext.Provider>
  );
}

/**
 * HeroUI's `BadgeRoot` wraps the whole children value in a `Badge.Label` when it
 * is a string or a number; any other value is handed to the span as it is. NSH
 * additionally has to turn bare strings inside an array into `Text` (a `View`
 * draws none), which the generic `renderChildren` does.
 *
 * It lives here, beside its only caller, so `badge-children.tsx` does not have
 * to import `BadgeLabel` back and create a module cycle.
 */
function renderBadgeChildren(node: JSX.Element): JSX.Element {
  if (node === null || node === undefined || typeof node === "boolean") {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return <BadgeLabel>{node}</BadgeLabel>;
  }

  // NSH's reactive child: a zero-argument function whose result must keep
  // following its signal, so classify the result rather than the wrapper.
  if (typeof node === "function") {
    return renderBadgeChildren(node());
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderChildren(child)) as unknown as JSX.Element;
  }

  return node;
}
