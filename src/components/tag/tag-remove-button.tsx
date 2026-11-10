import type { JSX, PressEvent } from "nsh";
import { cleanup } from "nsh";

import { CloseButtonRoot } from "../close-button/close-button-root";
import type {
  CloseButtonRenderProps,
  CloseButtonRootProps,
} from "../close-button/close-button-root";
import { TagContext, TagGroupContext } from "./tag-context";
import { TagRemoveIcon } from "./tag-remove-icon";

/**
 * The props of `Tag.RemoveButton` (`TagRemoveButton`): HeroUI 3.2.7's
 * `TagRemoveButtonProps`, which is React Aria Components' `Button` plus
 * `children`. It is a `CloseButton` upstream, so the port reuses the merged
 * CloseButton surface (port sheet §3).
 */
export interface TagRemoveButtonProps extends Omit<CloseButtonRootProps, "children"> {
  /** A custom glyph; the built-in 12 × 12 cross otherwise. */
  children?: JSX.Element;
}

/** The shared body: the CloseButton with the tag's slot, name and press. */
function renderRemoveButton(props: TagRemoveButtonProps): JSX.Element {
  const group = TagGroupContext();
  const tag = TagContext();

  // The accessible name is "Remove tag" plus the tag's text: upstream builds
  // it with `aria-labelledby`, which NSH has no channel for (port sheet §2).
  const accessibilityLabel = () => {
    const base = props["aria-label"] ?? "Remove tag";
    const text = tag?.textValue();

    return text ? `${base} ${text}` : base;
  };

  const handlePress = (event: PressEvent) => {
    props.onPress?.(event);

    if (group && tag) {
      group.removeTag(tag.key);
    }
  };

  // The slot class comes first; the caller's own class (plain or a function of
  // the CloseButton render props) still wins by coming later.
  const ownClassName = props.className;
  const className =
    typeof ownClassName === "function"
      ? (values: CloseButtonRenderProps) =>
          [tag?.removeButtonClass(), ownClassName(values)]
            .filter((part): part is string => typeof part === "string" && part.length > 0)
            .join(" ")
      : [tag?.removeButtonClass(), ownClassName]
          .filter((part): part is string => typeof part === "string" && part.length > 0)
          .join(" ");

  return (
    <CloseButtonRoot
      {...props}
      className={className}
      aria-label={accessibilityLabel()}
      // R-023: the button keeps its 12 × 12 visible box; `hitSlop` adds 6 pt on
      // every side, so the pressable area is 24 × 24 with no layout change —
      // the host counterpart of `.tag__remove-button`'s `touch-target`
      // `::after` overlay.
      hitSlop={props.hitSlop ?? 6}
      // RAC's `removeButtonProps.isDisabled` follows the row (`useTag`): a
      // disabled tag's button is disabled too, so `CloseButton`'s own disabled
      // look stacks on the row's, exactly as upstream's nested `status-disabled`
      // rules do.
      isDisabled={props.isDisabled ?? tag?.isDisabled()}
      // RAC's remove button: reachable by a screen reader but never a Tab stop
      // of its own (the tag row owns the focus model).
      excludeFromTabOrder={props.excludeFromTabOrder ?? true}
      onPress={handlePress}
    >
      {props.children ?? <TagRemoveIcon />}
    </CloseButtonRoot>
  );
}

/**
 * Tag.RemoveButton / TagRemoveButton: the tag's remove button. A caller-written
 * one registers itself with the tag, so the tag does not append its own default
 * (`tag-root.tsx`, R-022).
 */
export function TagRemoveButton(props: TagRemoveButtonProps): JSX.Element {
  const tag = TagContext();
  const group = TagGroupContext();

  if (tag) {
    cleanup(tag.registerRemoveButton());
  }

  // HeroUI renders the extracted `removeButtonChildren` only inside
  // `!!renderProps.allowsRemoving` (`tag.tsx`), so a static caller-written
  // button disappears when the group has no `onRemove`. The check is a
  // reactive `when`: the group can gain or lose `onRemove` after mount.
  return (
    <If when={group == null || group.allowsRemoving()}>
      {() => <TagRemoveButtonBody {...props} />}
    </If>
  );
}

/** The button's own body: a component so its context reads run under the `If`. */
function TagRemoveButtonBody(props: TagRemoveButtonProps): JSX.Element {
  return renderRemoveButton(props);
}

/**
 * The button a tag appends itself while `allowsRemoving` and the caller wrote
 * no `Tag.RemoveButton` (HeroUI's default branch). It is the same component
 * without the registration, or it would hide itself.
 */
export function TagDefaultRemoveButton(): JSX.Element {
  return renderRemoveButton({});
}
