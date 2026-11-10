import type { JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./children";
import { TabContext, TabsContext } from "./tabs-context";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Tabs.Separator`: HeroUI 3.2.7's `TabSeparatorProps`, which is
 * a `span`'s attributes plus `className`.
 */
export interface TabSeparatorProps {
  /** The separator's content; upstream's span is empty. */
  children?: JSX.Element;

  /** Appended after the separator slot classes; later classes win. */
  className?: string;

  /** Style of the separator. */
  style?: StyleProp<ViewStyle>;

  /** An identifier for UI tests. */
  testID?: string;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** The name other elements refer to. */
  nativeID?: string;

  /** Accepted, no effect: the separator is decorative. */
  accessibilityLabel?: string;

  /** HeroUI's `aria-hidden="true"`: hidden from assistive technologies. */
  "aria-hidden"?: boolean;

  /** Hides the separator from assistive technologies (the default). */
  accessibilityElementsHidden?: boolean;

  /** The separator was laid out. */
  onLayout?: (e: { bounds: { origin: { x: number; y: number }; size: { width: number; height: number } } }) => void;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect (D18: no data attributes). */
  [key: `data-${string}`]: unknown;

  /** The separator view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Separator
 * -----------------------------------------------------------------------------------------------*/

/**
 * `Tabs.Separator` / `TabSeparator`: the thin line between two tabs.
 *
 * Upstream hides it with two descendant / sibling selectors: the separator of
 * the selected tab, and the separator of the tab right after a selected one.
 * NSH has neither, so the separator reads the enclosing tab's selected state
 * from its context (R-034) and asks the root whether the tab registered before
 * it is selected (R-035, the registry order).
 */
export function TabSeparator(props: TabSeparatorProps): JSX.Element | null {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "testID",
    "id",
    "nativeID",
    "accessibilityLabel",
    "aria-hidden",
    "accessibilityElementsHidden",
    "onLayout",
    "render",
    "slot",
    "ref",
  ] as const);

  const tabs = TabsContext();
  const tab = TabContext();

  if (!tabs) {
    return null;
  }

  const hideSeparator = computed(() => {
    if (tab == null) {
      return false;
    }

    return tab.isSelected() || tabs.isPreviousTabSelected(tab.key);
  });

  const classes = computed(() =>
    [tabs.slots().separator(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const classList = computed<Record<string, boolean>>(() => ({
    // R-034: `[data-selected="true"] .tabs__separator` → `opacity: 0` from the
    // enclosing tab's selected state.
    // R-035: `[data-selected="true"] & + .tabs__tab .tabs__separator` → the
    // previous registered tab's selected state.
    "opacity-0": hideSeparator(),
    // R-059: `.tabs--secondary .tabs__separator` → `display: none`.
    hidden: tabs.variant() === "secondary",
  }));

  return (
    <View
      ref={(node) => local.ref?.(node)}
      nativeID={local.id ?? local.nativeID}
      testID={local.testID}
      accessibilityLabel={local.accessibilityLabel}
      accessibilityElementsHidden={local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true}
      class={classes()}
      classList={classList()}
      style={local.style}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children as JSX.Element)}
    </View>
  );
}
