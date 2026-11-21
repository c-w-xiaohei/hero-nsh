import { computed, split, Text, View } from "nsh";
import type { Bounds, JSX, StyleProp, TextProps, ViewProps, ViewRef, ViewStyle } from "nsh";

import { IconChevronRight } from "../icons/icons";
import { listGroupVariants } from "./list-group.styles";

/**
 * `iconProps` of `ListGroup.ItemSuffix` (upstream `ListGroupIconProps`,
 * `list-group.types.ts:42-52`): `size` maps onto `IconProps.width`/`height`;
 * `color` is a raw paint color (`useThemeColor('muted')` upstream), mapped
 * onto `IconProps.paint` — the token route (`color`) stays for a caller's own
 * icon, this default takes the paint path because upstream's value is a
 * resolved color. `onLayout` is this port's addition: the canvas reports its
 * laid-out size, the only channel through which `size` is observable.
 */
export interface ListGroupIconProps {
  /** The chevron's size in points. @default 16 */
  size?: number;

  /** The chevron's paint color; any CSS color. @default the muted token */
  color?: string;

  /** Called with the canvas's layout; reports the resolved `size`. */
  onLayout?: (event: { bounds: Bounds }) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Parts
 * -----------------------------------------------------------------------------------------------*/

/** `ListGroup.ItemPrefix`: the leading slot (`list-group.tsx:68-78`), a plain `View`. */
export interface ListGroupItemPrefixProps
  extends Omit<ViewProps, "children" | "class"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

export function ListGroupItemPrefix(props: ListGroupItemPrefixProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "ref"] as const);

  return (
    <View {...rest} ref={(node) => local.ref?.(node)} class={local.className}>
      {local.children}
    </View>
  );
}

/** `ListGroup.ItemContent`: the `flex-1` middle slot (`list-group.css` `.list-group__item-content`). */
export interface ListGroupItemContentProps
  extends Omit<ViewProps, "children" | "class"> {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  ref?: (node: ViewRef) => void;
}

export function ListGroupItemContent(props: ListGroupItemContentProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "style", "ref"] as const);

  const classes = computed(() =>
    [listGroupVariants().itemContent(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={classes()}
      style={local.style}
    >
      {local.children}
    </View>
  );
}

/** `ListGroup.ItemTitle`: the primary `Text` (`text-base font-medium text-foreground`). */
export interface ListGroupItemTitleProps
  extends Omit<TextProps, "children" | "class"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

export function ListGroupItemTitle(props: ListGroupItemTitleProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "style", "ref"] as const);

  const classes = computed(() =>
    [listGroupVariants().itemTitle(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <Text
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={classes()}
      style={local.style}
    >
      {local.children}
    </Text>
  );
}

/** `ListGroup.ItemDescription`: the secondary `Text` (`text-sm text-muted`). */
export interface ListGroupItemDescriptionProps
  extends Omit<TextProps, "children" | "class"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

export function ListGroupItemDescription(
  props: ListGroupItemDescriptionProps,
): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "style", "ref"] as const);

  const classes = computed(() =>
    [listGroupVariants().itemDescription(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <Text
      {...rest}
      ref={(node) => local.ref?.(node)}
      class={classes()}
      style={local.style}
    >
      {local.children}
    </Text>
  );
}

/**
 * `ListGroup.ItemSuffix`: the trailing slot (`list-group.tsx:133-159`). With
 * no `children` it draws the default `IconChevronRight` — upstream's
 * `ChevronRightIcon` at `iconProps.size` (16 default) painted `iconProps.color`
 * (the muted token default), wrapped in `itemSuffixIcon`'s container. The
 * upstream `rtl:-scale-x-100` mirror has no NSH `dir` channel and is
 * registered in sheet §5/§7.
 */
export interface ListGroupItemSuffixProps
  extends Omit<ViewProps, "children" | "class"> {
  /** Overrides the default chevron. */
  children?: JSX.Element;
  className?: string;
  /** Customises the default chevron; ignored while `children` is set. */
  iconProps?: ListGroupIconProps;
  ref?: (node: ViewRef) => void;
}

export function ListGroupItemSuffix(props: ListGroupItemSuffixProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "iconProps", "ref"] as const);

  const classes = computed(() =>
    [listGroupVariants().itemSuffixIcon(), local.className ?? ""]
      .filter((part) => part.length > 0)
      .join(" "),
  );

  return (
    <View {...rest} ref={(node) => local.ref?.(node)} class={classes()}>
      {local.children ?? (
        <IconChevronRight
          width={local.iconProps?.size ?? 16}
          height={local.iconProps?.size ?? 16}
          paint={local.iconProps?.color}
          color="muted"
          onLayout={local.iconProps?.onLayout}
        />
      )}
    </View>
  );
}
