import type { AccessibilityState, Bounds, JSX, StyleProp, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { renderChildren } from "./children";
import { TabsContext } from "./tabs-context";
import { type TabsKey, encodeTabKey } from "./tabs-key";

/* -------------------------------------------------------------------------------------------------
 * Props
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Tabs.Panel`: HeroUI 3.2.7's `TabPanelProps`, which is React
 * Aria Components' `TabPanel` with `children` narrowed to `ReactNode`.
 *
 * `id` is what pairs the panel with its tab (HeroUI documents it as required,
 * though React Aria's type makes it optional). NSH has no `tabpanel` role and
 * no cross-element references, so the panel is a `region` and a tab cannot name
 * it (port sheet §8).
 */
export interface TabPanelProps {
  /** The key of the tab this panel belongs to; without it the panel never shows. */
  id?: TabsKey;

  /** The panel's content. */
  children?: JSX.Element;

  /** Appended after the panel slot classes; later classes win. */
  className?: string;

  /** Style of the panel. */
  style?: StyleProp<ViewStyle>;

  /** Keeps the panel in the tree while its tab is not selected. @default false */
  shouldForceMount?: boolean;

  /** The tab was laid out. */
  onLayout?: (e: { bounds: Bounds }) => void;

  /** The panel's accessible name. */
  "aria-label"?: string;

  /** NSH's accessible name, over `aria-label`. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-labelledby"?: string;

  /** Accepted, no effect: NSH has no cross-element references. */
  "aria-describedby"?: string;

  /** Accepted, no effect: the role is fixed to `region` (port sheet §8). */
  role?: "region" | "group";

  /** A DOM id upstream; maps to `nativeID`. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** Hides the panel from assistive technologies. */
  accessibilityElementsHidden?: boolean;

  /** Merged into the panel's accessibility state. */
  accessibilityState?: AccessibilityState;

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

  /** The panel view; a callback, as NSH forwards refs. */
  ref?: (node: ViewRef) => void;
}

/* -------------------------------------------------------------------------------------------------
 * Panel
 * -----------------------------------------------------------------------------------------------*/

/**
 * `Tabs.Panel` / `TabPanel`: the content of one tab.
 *
 * RAC mounts the panel only while its tab is selected, or always with
 * `shouldForceMount`; NSH spells that `<If when>` (port sheet §2). The force
 * mounted, unselected panel is hidden from assistive technologies and made
 * `pointer-events-none` instead of RAC's `inert` (port sheet §8).
 */
export function TabPanel(props: TabPanelProps): JSX.Element | null {
  const [local] = split(props, [
    "id",
    "children",
    "className",
    "style",
    "shouldForceMount",
    "onLayout",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-describedby",
    "role",
    "nativeID",
    "testID",
    "accessibilityElementsHidden",
    "accessibilityState",
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

  const key = local.id === undefined || local.id === null ? undefined : encodeTabKey(local.id);

  const isSelected = computed(() => key != null && tabs.selectedKey() === key);
  const isMounted = computed(() => isSelected() || local.shouldForceMount === true);

  const classes = computed(() =>
    [tabs.slots().tabPanel(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  const classList = computed<Record<string, boolean>>(() => ({
    // R-048: upstream's `[data-exiting="true"]` (an exit animation) is deleted:
    // an unselected panel unmounts, so there is nothing to animate out
    // (port sheet §8).
    // A force mounted panel that is not selected takes RAC's `inert` as these
    // two approximations: no assistive-technology exposure and no presses.
    "pointer-events-none": !isSelected(),
  }));

  return (
    <If when={isMounted()}>
      <View
        ref={(node) => local.ref?.(node)}
        nativeID={local.nativeID}
        testID={local.testID}
        // R-047: the panel slot carries the box; the role is `region` because
        // `AccessibilityRole` has no `tabpanel` (port sheet §8).
        role="region"
        accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
        accessibilityElementsHidden={
          isSelected() ? local.accessibilityElementsHidden : true
        }
        accessibilityState={local.accessibilityState}
        class={classes()}
        classList={classList()}
        style={local.style}
        onLayout={local.onLayout}
      >
        {renderChildren(local.children as JSX.Element)}
      </View>
    </If>
  );
}
