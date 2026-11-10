import type { Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { createSelectableCollection } from "../../primitives/selection";
import { renderChildren } from "./children";
import { TabsKeyboardDelegate } from "./create-tabs-keyboard-delegate";
import { TabsContext } from "./tabs-context";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Tabs.List`: HeroUI 3.2.7's `TabListProps`, which is React Aria
 * Components' `TabList` with `children` narrowed to `ReactNode`.
 *
 * The dynamic collection members React Aria inherits (`items`, `dependencies`)
 * are not part of HeroUI's type either, so they are not here: tabs register
 * themselves with the root (research 4.2). `aria-labelledby` has no channel
 * upstream's tablist name would use (port sheet §8).
 */
export interface TabListProps {
  /** The `Tabs.Tab` children; read once at the placement. */
  children?: JSX.Element;

  /** Appended after the list slot classes; later classes win. */
  className?: string;

  /** Style of the list. */
  style?: StyleProp<ViewStyle>;

  /** The tab list's accessible name (upstream's `aria-label`). */
  "aria-label"?: string;

  /** NSH's accessible name, over `aria-label`. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: the accessibility API has no orientation channel. */
  "aria-orientation"?: "horizontal" | "vertical";

  /** Accepted, no effect: NSH views report no key events; keys bind through `keymap`. */
  onKeyDown?: unknown;
  onKeyUp?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** Hides the list from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** The list was laid out; also reports the scroll content's size (R-020, R-021). */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH derives direction from the platform / root. */
  dir?: "ltr" | "rtl";

  /** Accepted, no effect: NSH has no DOM visibility attribute. */
  hidden?: boolean;

  /** Accepted, no effect (D18: no data attributes). */
  [key: `data-${string}`]: unknown;

  /** The list view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * List
 * -----------------------------------------------------------------------------------------------*/

/**
 * `Tabs.List` / `TabList`: the `role="tablist"` row (or column) that holds the
 * tabs, and the owner of the arrow keys.
 *
 * Kobalte listens to `onKeyDown` on the element, which NSH views do not have;
 * the bindings are scoped to the collection's focus through
 * `createKeymapScope`, and the collection's handlers are read from
 * `createSelectableCollection` (port sheet §2, §5). The collection's own
 * `orientation` stays at its default: the delegate decides which arrow moves
 * along the axis (port sheet §5).
 */
export function TabList(props: TabListProps): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-orientation",
    "onKeyDown",
    "onKeyUp",
    "id",
    "nativeID",
    "testID",
    "accessibilityElementsHidden",
    "onLayout",
    "render",
    "slot",
    "dir",
    "hidden",
    "ref",
  ] as const);

  const tabs = TabsContext();

  if (!tabs) {
    return null;
  }

  const delegate = new TabsKeyboardDelegate(
    tabs.collection,
    tabs.orientation,
    tabs.dir,
  );

  const selectableCollection = createSelectableCollection({
    selectionManager: tabs.selectionManager,
    keyboardDelegate: () => delegate,
    // R-… (§1): `automatic` selects as the focus moves; `manual` waits for
    // Return / Space on the focused tab.
    selectOnFocus: () => tabs.keyboardActivation() === "automatic",
    // The cycle is the delegate's job (Kobalte's `tabs-list.tsx:82`).
    shouldFocusWrap: () => false,
    disallowEmptySelection: () => true,
    direction: () => tabs.dir() ?? "ltr",
    scrollToItem: (key) => tabs.scrollToKey(key),
  });

  // Kobalte hears these on the tab list's `onKeyDown`; NSH binds them through
  // `keymap` while the collection holds the focus, and drops them on blur or
  // unmount (`_common` §43).
  const bindings: Record<string, () => void> = {
    down: () => selectableCollection.onKeyDown("down"),
    up: () => selectableCollection.onKeyDown("up"),
    left: () => selectableCollection.onKeyDown("left"),
    right: () => selectableCollection.onKeyDown("right"),
    home: () => selectableCollection.onKeyDown("home"),
    end: () => selectableCollection.onKeyDown("end"),
  };

  createKeymapScope({
    isActive: () => tabs.selectionManager().isFocused(),
    bindings,
  });

  // R-024: `min-width: 100%` for horizontal tabs. Inside NSH's scroll box the
  // list's parent is content sized, so a percentage resolves to `auto`; the
  // measured viewport is the same length as a number (port sheet §6).
  const minWidth = computed<StyleProp<ViewStyle>>(() => {
    if (tabs.orientation() !== "horizontal") {
      return undefined;
    }

    const width = tabs.viewportSize().width;

    return width > 0 ? { minWidth: width } : undefined;
  });

  const classes = computed(() =>
    [tabs.slots().tabList(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  return (
    <View
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      role="tablist"
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      accessibilityElementsHidden={local.accessibilityElementsHidden}
      class={classes()}
      style={[minWidth(), local.style]}
      onLayout={(event) => {
        // R-020 / R-021: the list's frame is the scroll content's size, which
        // the list container uses to size a chevron's page step.
        tabs.setContentSize(event.bounds.size);
        local.onLayout?.(event);
      }}
    >
      {renderChildren(local.children as JSX.Element)}
    </View>
  );
}
