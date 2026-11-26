import { computed, split, Text, View } from "nsh";
import type { Bounds, JSX, StyleProp, TextProps, ViewProps, ViewRef, ViewStyle } from "nsh";

import { TagContext, TagGroupContext } from "../tag/tag-context";
import { TagRemoveButton, type TagRemoveButtonProps } from "../tag/tag-remove-button";
import { tagGroupItemVariants } from "./tag-group.styles";
import { themeToken } from "../../theme";

/**
 * The tag's own selection accessor: `TagContext.key` registered this row, so
 * `selectionManager.isSelected(key)` is the same `isSelected` upstream's
 * `usePrimitiveItemContext` exposes — no second state source.
 */
function useTagSelected() {
  const group = TagGroupContext();
  const tag = TagContext();

  return () =>
    tag !== undefined && group?.selectionManager().isSelected(tag.key) === true;
}

function useTagSize() {
  const group = TagGroupContext();

  return () => group?.size() ?? "md";
}

/* -------------------------------------------------------------------------------------------------
 * ItemLabel
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `TagGroupItem.Label`: upstream's `TagGroupItemLabelProps`
 * (`tag-group.types.ts:104-110`), a `TextProps` with `className`.
 */
export interface TagGroupItemLabelProps
  extends Omit<TextProps, "children" | "class"> {
  children?: JSX.Element;
  className?: string;
  ref?: (node: ViewRef) => void;
}

/**
 * TagGroupItem.Label / TagGroupItemLabel: the tag's text
 * (`tag-group.tsx:269-290`). Size follows `TagGroupContext.size`, the selected
 * color follows the tag's own selection — both read through the contexts the
 * row already provides.
 */
export function TagGroupItemLabel(props: TagGroupItemLabelProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "style", "ref"] as const);

  const isSelected = useTagSelected();
  const size = useTagSize();

  const classes = computed(() =>
    [
      tagGroupItemVariants({ size: size(), isSelected: isSelected() }).label(),
      local.className ?? "",
    ]
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

/* -------------------------------------------------------------------------------------------------
 * ItemBackground
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `TagGroupItem.Background`: upstream's
 * `TagGroupItemBackgroundProps` (`tag-group.types.ts:69-72`), an absolute-fill
 * container behind the tag. The upstream "theme decides the default content"
 * contract degrades to an empty layer here — this library has no glass theme
 * to draw one (sheet §5/§7).
 */
export interface TagGroupItemBackgroundProps
  extends Omit<ViewProps, "children" | "class"> {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;
  ref?: (node: ViewRef) => void;
}

/**
 * TagGroupItem.Background / TagGroupItemBackground: `absolute inset-0
 * overflow-hidden` behind the tag's surface, with the tag's own radius by
 * `TagGroupContext.size`. Place it inside `TagGroupItem`; the row's
 * `relative` box makes the fill match the tag bounds (M-029).
 */
export function TagGroupItemBackground(
  props: TagGroupItemBackgroundProps,
): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "style", "ref"] as const);

  const size = useTagSize();

  const classes = computed(() =>
    [
      tagGroupItemVariants({ size: size() }).background(),
      local.className ?? "",
    ]
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

/* -------------------------------------------------------------------------------------------------
 * ItemRemoveButton
 * -----------------------------------------------------------------------------------------------*/

/** `iconProps` of `TagGroupItem.RemoveButton` (upstream `TagRemoveButtonIconProps`). */
export interface TagRemoveButtonIconProps {
  /** The glyph's box in points. @default 12 */
  size?: number;

  /** The glyph's paint color; any CSS color. @default the tag's foreground */
  color?: string;

  /**
   * Called with the glyph box's layout; this port's addition — the only
   * channel through which `size` is observable (the parent button's box is
   * fixed).
   */
  onLayout?: (event: { bounds: Bounds }) => void;
}

/**
 * The props of `TagGroupItem.RemoveButton`: upstream's
 * `TagGroupItemRemoveButtonProps` (`tag-group.types.ts:126-136`) — the port's
 * `TagRemoveButtonProps` plus `iconProps` for the default glyph.
 */
export interface TagGroupItemRemoveButtonProps
  extends Omit<TagRemoveButtonProps, "children"> {
  /** Custom glyph or content; the default cross otherwise. */
  children?: JSX.Element;

  /** Customises the default cross; ignored while `children` is set. */
  iconProps?: TagRemoveButtonIconProps;
}

/**
 * The default remove glyph, self-drawn because `tag/tag-remove-icon.tsx` is
 * read-only: the same two-stroke cross, scaled by `iconProps.size` from the
 * port's 12 pt geometry (strokes 6.8 × 1.125 pt), painted `iconProps.color`
 * or the upstream `field-foreground` / `accent-soft-foreground` pair
 * (`tag-group.tsx:301-311`; geometry diff registered in sheet §5/§7).
 */
function TagGroupItemRemoveIcon(props: { iconProps?: TagRemoveButtonIconProps }) {
  const isSelected = useTagSelected();

  const size = () => props.iconProps?.size ?? 12;
  const scale = () => size() / 12;
  const color = () =>
    props.iconProps?.color ??
    themeToken(isSelected() ? "accent-soft-foreground" : "field-foreground");

  const stroke = () => ({
    width: 6.8 * scale(),
    height: 1.125 * scale(),
    borderTopWidth: 1.125 * scale(),
    borderColor: color(),
  });

  return (
    <View
      testID="tag-group-item-remove-icon"
      class="shrink-0 self-center pointer-events-none"
      style={{ width: size(), height: size() }}
      onLayout={props.iconProps?.onLayout}
      accessibilityElementsHidden
    >
      <View
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full rotate-45"
        style={stroke()}
      />
      <View
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full -rotate-45"
        style={stroke()}
      />
    </View>
  );
}

/**
 * TagGroupItem.RemoveButton / TagGroupItemRemoveButton: the port's
 * `TagRemoveButton` (registration, `allowsRemoving` gating and `removeTag`
 * come with it) whose default child is the local cross. Upstream's
 * `hitSlop` default is 8 (`tag-group.tsx:297`).
 */
export function TagGroupItemRemoveButton(
  props: TagGroupItemRemoveButtonProps,
): JSX.Element {
  const [local, rest] = split(props, ["children", "iconProps"] as const);

  return (
    <TagRemoveButton
      {...rest}
      hitSlop={rest.hitSlop ?? 8}
    >
      {local.children ?? <TagGroupItemRemoveIcon iconProps={local.iconProps} />}
    </TagRemoveButton>
  );
}
