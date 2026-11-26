import type { JSX, PressEvent } from "nsh";
import { cleanup, createAnimatedValue } from "nsh";

import { createInput } from "../../primitives/environment";
import {
  createPressFeedback,
  PressableFeedbackContext,
  type PressableFeedbackContextValue,
} from "../../primitives/pressable";
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

  // A-006: the button's own touch-only seam, gated like the row's — the
  // caller's `isDisabled`, else the row's. Its computed `hitSlop` (the 12 pt
  // box padded out to the 44 pt target) becomes the CloseButton's `hitSlop`
  // prop; under pointer it stays undefined and the `?? 6` fallback keeps the
  // desktop value byte-for-byte. CloseButton's own seam then shares the same
  // `onLayout` event and never wins the prop.
  const input = createInput();
  const feedbackEnabled = () =>
    input() === "touch" && !(props.isDisabled ?? tag?.isDisabled());
  const feedback = createPressFeedback({ enabled: feedbackEnabled });

  // The same read half the row provides: a `CtxProbe` (or a composed
  // `PressableFeedback` part) inside the button's children reads this seam's
  // channels, not the row's.
  const feedbackValue: PressableFeedbackContextValue = {
    isPressed: feedback.isPressed,
    pressed: feedback.pressed,
    bounds: feedback.bounds,
    pressOrigin: feedback.pressOrigin,
    scale: feedback.scale,
    highlightOpacity: createAnimatedValue(0),
    rippleProgress: createAnimatedValue(0),
    enabled: feedbackEnabled,
    hitSlop: feedback.hitSlop,
    isAllAnimationsDisabled: () => false,
  };

  return (
    <PressableFeedbackContext.Provider value={feedbackValue}>
      <CloseButtonRoot
        {...props}
        className={className}
        aria-label={accessibilityLabel()}
        // R-023: the button keeps its 12 × 12 visible box; `hitSlop` adds 6 pt
        // on every side, so the pressable area is 24 × 24 with no layout
        // change — the host counterpart of `.tag__remove-button`'s
        // `touch-target` `::after` overlay. A-006: under touch the seam's
        // computed expansion (≈16 pt a side to the 44 pt target) wins; the
        // `?? 6` only stays when the seam reports nothing.
        hitSlop={props.hitSlop ?? feedback.hitSlop() ?? 6}
        // RAC's `removeButtonProps.isDisabled` follows the row (`useTag`): a
        // disabled tag's button is disabled too, so `CloseButton`'s own
        // disabled look stacks on the row's, exactly as upstream's nested
        // `status-disabled` rules do.
        isDisabled={props.isDisabled ?? tag?.isDisabled()}
        // RAC's remove button: reachable by a screen reader but never a Tab
        // stop of its own (the tag row owns the focus model).
        excludeFromTabOrder={props.excludeFromTabOrder ?? true}
        onPress={handlePress}
        onLayout={(event) => {
          // A-006: the measured bounds feed `feedback.hitSlop()` — the same
          // `onLayout` event CloseButton's own seam reads inside; the caller's
          // `onLayout` still hears it.
          feedback.layout(event);
          props.onLayout?.(event);
        }}
      >
        {props.children ?? <TagRemoveIcon />}
      </CloseButtonRoot>
    </PressableFeedbackContext.Provider>
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
