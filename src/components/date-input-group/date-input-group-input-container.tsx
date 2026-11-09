import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { Scroll, split } from "nsh";

import { DateInputGroupContext } from "./date-input-group-context";

/** The props of `DateInputGroup.InputContainer`, HeroUI's `DateInputGroupInputContainerProps`. */
export interface DateInputGroupInputContainerProps {
  /** The content that scrolls: the Input and whatever the caller puts beside it. */
  children?: JSX.Element;

  /** Appended after the slot classes (not a function upstream either). */
  className?: string;

  /** The scroll view's style. */
  style?: StyleProp<ViewStyle>;

  /** An identifier for UI tests. */
  testID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** The scroll view's ref, forwarded as a callback only. */
  ref?: (node: ViewRef) => void;

  /** The container was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** Any other DOM / global attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

/**
 * The classes of the Scroll's content layer: upstream's `flex items-center`
 * part of `.date-input-group__input-container` (R-014). They belong to the
 * content, not the scrolling viewport, or the row and its centering would be
 * lost (a Scroll hosts its children in that layer).
 */
const CONTENT_CLASS = "flex items-center";

/**
 * DateInputGroup.InputContainer / DateInputGroupInputContainer: the horizontal
 * strip that holds the Input and lets it scroll when the range picker's two
 * sides do not fit.
 *
 * Upstream it is a `div` with `overflow-x: auto; overflow-y: clip;
 * scrollbar-none` (R-015 … R-017). NSH scrolling is an element, so the
 * container itself becomes a horizontal `Scroll` with its scrollbar off, and
 * `flex-1 w-fit` on the viewport (R-014). No `overflow-hidden` is added: it
 * would clip the focus ring's drawing too.
 */
export function DateInputGroupInputContainer(
  props: DateInputGroupInputContainerProps,
): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "testID",
    "id",
    "nativeID",
    "render",
    "ref",
    "onLayout",
  ] as const);

  const group = DateInputGroupContext();

  const classes = () => {
    const own = local.className ?? "";

    return [group.slots().inputContainer(), own].filter((part) => part.length > 0).join(" ");
  };

  return (
    <Scroll
      ref={(node) => local.ref?.(node)}
      // R-015: `overflow-x: auto` → a horizontal scroll view.
      // R-017: `scrollbar-none` → `scrollbar={false}`.
      horizontal
      scrollbar={false}
      class={classes()}
      // R-014: the flex row and vertical centering belong to the content layer.
      // R-016: `overflow-y: clip` is what a single-axis scroll view already does
      // on its other axis; no extra class.
      contentClass={CONTENT_CLASS}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      style={local.style}
      onLayout={local.onLayout}
    >
      {local.children}
    </Scroll>
  );
}
