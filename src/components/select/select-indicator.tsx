import type {
  Bounds,
  JSX,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, split, View } from "nsh";

import { renderChildren } from "../list-box/children";
import { SelectContext, SelectTriggerContext } from "./select-context";

export interface SelectIndicatorProps {
  /** Custom indicator content; empty draws the built-in chevron. */
  children?: JSX.Element;

  /** Appended after the indicator slot classes. */
  className?: string;

  style?: StyleProp<ViewStyle>;

  ref?: (node: ViewRef) => void;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  "aria-hidden"?: boolean;

  accessibilityElementsHidden?: boolean;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace the host element. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

/**
 * Select.Indicator / SelectIndicator: the chevron at the trigger's inline end,
 * rotated while the field is open. HeroUI renders an SVG and clones a custom
 * child to inject the slot classes; NSH has no SVG and cannot rewrite the
 * caller's element, so a custom child sits inside a container carrying the
 * slot classes instead (registered difference, port sheet §8).
 */
export function SelectIndicator(props: SelectIndicatorProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "nativeID",
    "testID",
    "aria-hidden",
    "accessibilityElementsHidden",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const select = SelectContext();
  const trigger = SelectTriggerContext();

  if (!select) {
    return null;
  }

  // R-006: the trigger pads its inline end while an indicator is mounted, the
  // stand-in for `:has(.select__indicator)`.
  if (trigger) {
    // Registered on mount, released on unmount: the trigger's `pe-7` follows
    // the indicator's presence, not its first render.
    cleanup(trigger.registerIndicator());
  }

  const classes = computed(() =>
    [select.slots().indicator(), local.className]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-030: the built-in chevron's own box (`size-4`); a custom child is not
  // sized by the slot, as upstream only targets the native SVG.
  const chevron = () => (
    <View class="flex size-4 items-center justify-center">
      <View class="size-2 border-b-2 border-e-2 rotate-45" />
    </View>
  );

  const content = () => {
    const children = local.children;

    if (children === undefined || children === null || children === false) {
      return chevron();
    }

    return renderChildren(children);
  };

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityElementsHidden={
        local["aria-hidden"] ?? local.accessibilityElementsHidden ?? true
      }
      class={classes()}
      // R-029: `[data-open="true"]` → `rotate-180` on the indicator container,
      // so the default chevron turns with it.
      classList={{ "rotate-180": select.isOpen() }}
      style={local.style}
      onLayout={local.onLayout}
    >
      {content()}
    </View>
  );
}
