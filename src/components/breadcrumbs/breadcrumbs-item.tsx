import type {
  Accessor,
  JSX,
  PressEvent,
  StyleProp,
  ViewStyle,
} from "nsh";
import { cleanup, computed, split, View } from "nsh";

import { IconChevronRight } from "../icons";
import { Link, type LinkRenderProps, type LinkRootProps } from "../link";
import {
  BreadcrumbsContext,
  BreadcrumbsOrderContext,
  type BreadcrumbsKey,
} from "./breadcrumbs-context";
import { renderChildren } from "./children";
import { joinClassNames } from "./class-names";

/** The live state HeroUI hands an item's `className`, `style` and children. */
export interface BreadcrumbsItemRenderProps {
  /** This item is the last one: React Aria's `node.nextKey == null`. */
  isCurrent: Accessor<boolean>;

  /** The root is disabled, or this item is the current page. */
  isDisabled: Accessor<boolean>;
}

/**
 * The props of `Breadcrumbs.Item` (= `BreadcrumbsItem`): HeroUI 3.2.7's
 * `BreadcrumbsItemProps`, which is React Aria Components' `BreadcrumbProps`
 * (a `Key` id, render props, the `li` attributes) plus React Aria's
 * `Omit<LinkProps, "className">`.
 *
 * The link props are forwarded to the inner `Link`; `id` is kept as the
 * item's identity (its `onAction` payload) and is not written to the DOM,
 * as React Aria deletes it from the `li`'s DOM props.
 */
export type BreadcrumbsItemProps = Omit<
  LinkRootProps,
  "children" | "className" | "style" | "id"
> & {
  /**
   * The item's content, or a render function that replaces the whole item
   * (no link, no separator), as HeroUI calls `children({} as any)`.
   */
  children?: JSX.Element | ((values: BreadcrumbsItemRenderProps) => JSX.Element);

  /** Appended after the item slot classes, on the item's own `View`. */
  className?: string | ((values: BreadcrumbsItemRenderProps) => string);

  /**
   * NSH style keys instead of React's `CSSProperties` (sheet §8). It lands on
   * both the item box and the inner `Link`, as upstream's two `{...props}`
   * spreads do (breadcrumbs.tsx:90 and :99).
   */
  style?: StyleProp<ViewStyle>;

  /** A React Aria `Key`: the registration key and the `onAction` payload. */
  id?: BreadcrumbsKey;
};

/**
 * `Breadcrumbs.Item` / `BreadcrumbsItem`: one list entry, its link and its
 * separator.
 *
 * HeroUI's Item leans on three facts from React Aria's collection: its key,
 * whether a next key exists (the current page), and the root's
 * `isDisabled` / `onAction`. NSH has no collection, so the Item registers its
 * key with the Root on mount and derives `isCurrent` from the Root's registry
 * (port sheet section 2, research 4.2).
 */
export function BreadcrumbsItem(props: BreadcrumbsItemProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "isDisabled",
    "onPress",
    "aria-current",
    "testID",
    "nativeID",
    "tooltip",
    "onLayout",
  ] as const);

  const root = BreadcrumbsContext();

  if (!root) {
    return null;
  }

  const slots = root.slots;
  // The row's data index when the Item was rendered by an `items` collection;
  // undefined for static children, whose mount order is their write order.
  const order = BreadcrumbsOrderContext();

  // Identity values are read once on purpose: the key must not move under the
  // item while the registry is live. An item written without `id` takes its
  // registration index, React Aria's positional key.
  const key = local.id ?? root.createKey();

  cleanup(root.register(key, order));

  const isCurrent = computed(() => root.lastKey() === key);
  // React Aria's render values: the root's `isDisabled` or the current page.
  const renderProps: BreadcrumbsItemRenderProps = {
    isCurrent,
    isDisabled: computed(() => root.isDisabled() || isCurrent()),
  };
  // The link's own `isDisabled`: an explicit item value wins over the root's
  // and the current page's, as `mergeProps` lets props override context.
  const effectiveDisabled = computed(
    () => local.isDisabled ?? renderProps.isDisabled(),
  );

  const resolvedClassName = () => {
    const className = local.className;

    return typeof className === "function"
      ? className(renderProps)
      : className;
  };

  const classes = computed(() =>
    joinClassNames(slots.item(), resolvedClassName()),
  );

  // R-004: `.breadcrumbs__link[data-current="true"]` → `color:var(--link);
  // opacity:1`. There is no `data-current` attribute channel (D18): the
  // registry decides the current item, and its link appends `text-link` after
  // the link slot, so it wins over `text-muted`. Upstream renders the current
  // link with `aria-disabled="true"` (React Aria's LinkContext) and hides the
  // disabled opacity with the current rule: `.breadcrumbs .breadcrumbs__link
  // [data-current="true"]` (0,3,0) outranks `.link[aria-disabled="true"]`
  // (0,2,0) in packages/styles/components/breadcrumbs.css:14-16. In NSH Link's
  // `disabled:opacity-50` is a variant and sorts after plain utilities
  // (twref:51), so the current item needs the same disabled-level override,
  // `disabled:opacity-100`; every other disabled link keeps 0.5.
  const linkClassName = (_values: LinkRenderProps): string =>
    joinClassNames(
      slots.link(),
      isCurrent() ? "text-link opacity-100 disabled:opacity-100" : undefined,
    );

  // The link's `onPress` runs the root's `onAction` first and then the
  // caller's handler, the order `mergeProps` gives context and props.
  const handlePress = (event: PressEvent) => {
    root.onAction(key);
    local.onPress?.(event);
  };

  // React Aria's LinkContext gives the current page `aria-current="page"`; a
  // value the caller passes wins over it.
  const ariaCurrent = (): LinkRootProps["aria-current"] => {
    // The `aria-*` index signature of `AriaProps` widens the split value, so
    // the declared Link type is restored here.
    const explicit = local["aria-current"] as LinkRootProps["aria-current"];

    return explicit ?? (isCurrent() ? "page" : undefined);
  };

  /**
   * R-007: `.breadcrumbs__separator` → `color:var(--muted)`. The default
   * chevron is a Canvas that cannot inherit the ancestor's text color, so it
   * takes the `muted` token directly (icons R-006); an element separator gets
   * the same color from the wrapper View; a string or number is rendered
   * without classes, exactly as upstream returns it.
   *
   * The element case is a structural rewrite: upstream `cloneElement`s the
   * caller's node with the slot classes, which NSH cannot do, so a View
   * carries the same classes around it (port sheet §5, third divergence).
   */
  const renderSeparator = (): JSX.Element => {
    const separator = root.separator();

    if (!separator) {
      return (
        <IconChevronRight
          className={slots.separator()}
          color="muted"
        />
      );
    }

    if (typeof separator === "object" && !Array.isArray(separator)) {
      return (
        <View class={joinClassNames(slots.separator(), "text-muted")}>
          {separator}
        </View>
      );
    }

    return renderChildren(separator);
  };

  // The item content, read where it is placed. A function of at least one
  // parameter is the HeroUI render prop and replaces the whole content (D17);
  // a zero-argument function is NSH's reactive child and stays inside the
  // link (port sheet §5, first divergence).
  const content = (): JSX.Element => {
    const value = local.children;

    if (typeof value === "function" && value.length >= 1) {
      return renderChildren(
        (value as (values: BreadcrumbsItemRenderProps) => JSX.Element)(
          renderProps,
        ),
      );
    }

    return [
      <Link
        {...rest}
        testID={local.testID}
        nativeID={local.nativeID}
        tooltip={local.tooltip}
        isDisabled={effectiveDisabled()}
        // D18 / sheet §1: `aria-current` has no attribute channel; the inner
        // Link maps it into `accessibilityState.current`.
        aria-current={ariaCurrent()}
        className={linkClassName}
        // Upstream spreads `{...props}` onto the `li` and the inner `<a>`, so
        // a caller's `style` lands on both boxes (breadcrumbs.tsx:90 and :99);
        // this mirrors the two spreads, non-inherited keys included.
        style={local.style}
        onPress={handlePress}
      >
        {renderChildren(value as JSX.Element)}
      </Link>,
      <If when={!isCurrent()}>{() => renderSeparator()}</If>,
    ] as unknown as JSX.Element;
  };

  return (
    <View
      ref={(next) => local.ref?.(next)}
      class={classes()}
      style={local.style}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
