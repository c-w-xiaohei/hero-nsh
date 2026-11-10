import type {
  Accessor,
  Bounds,
  JSX,
  OverlayPosition,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { computed, effect, Overlay, Scroll, signal, split } from "nsh";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import { renderChildren } from "../list-box/children";
import {
  ListBoxContainerContext,
  type ListBoxContainerContextValue,
} from "../list-box/list-box-context";
import type {
  PopoverPlacement,
  PopoverSide,
} from "../popover/popover-placement";
import { resolvePopoverPlacement } from "../popover/popover-placement";
import { SelectContext } from "./select-context";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/** What a popover `className` / `style` function receives (RAC's `PopoverRenderProps`). */
export interface SelectPopoverRenderProps {
  /** The component that opened the popover; `"Select"` by default. */
  trigger: Accessor<string>;
  /** The side the overlay ended up on, `null` before the first placement. */
  placement: Accessor<PopoverSide | null>;
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
}

export interface SelectPopoverProps {
  /** The popover's content (the caller's ListBox); read once at the placement. */
  children: JSX.Element;

  /** Appended after the popover slot classes; function form gets accessors. */
  className?: string | ((values: SelectPopoverRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: SelectPopoverRenderProps) => StyleProp<ViewStyle>);

  /** The overlay view; `focus()` and `measure()` reach it. */
  ref?: (node: ViewRef) => void;

  /** RAC placement (default `"bottom"`), mapped to the overlay's side and align. */
  placement?: PopoverPlacement;

  /** The gap between the trigger and the overlay (default 8). */
  offset?: number;

  /** Accepted, no effect: the core Overlay has no cross-axis offset. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** The safe-area margin (default 12; RAC's `containerPadding`). */
  containerPadding?: number;

  /** The popover's own open state (overrides the field's, as in React Aria). */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;

  /** Modal by default (RAC): a backdrop absorbs the presses outside. */
  isNonModal?: boolean;

  /** When `true`, Escape does not close (the `onCancel` channel still fires). */
  isKeyboardDismissDisabled?: boolean;

  /** Accepted, no effect: NSH has no element object to hand to the predicate. */
  shouldCloseOnInteractOutside?: (element: unknown) => boolean;

  /** Forces the enter state (custom animations). */
  isEntering?: boolean;

  /** Forces the exit state and keeps the content mounted. */
  isExiting?: boolean;

  /** Skips the enter and exit phases entirely. */
  shouldSkipAnimation?: boolean;

  /** The name of the trigger, for render values (default `"Select"`). */
  trigger?: string;

  /** Anchors a standalone popover directly. */
  triggerRef?: ViewRef | null;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;
  nativeID?: string;
  testID?: string;

  "aria-label"?: string;
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no `aria-details` channel. */
  "aria-details"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH has no DOM render function. */
  render?: unknown;

  onLayout?: (e: { bounds: Bounds }) => void;
}

// Owners of the two transition properties NSH cannot express as one class
// (R-036 / R-037): the property list, and the shorter exit duration.
const TRANSITION_STYLE = { transitionProperty: "opacity, transform" } as const;
const EXIT_DURATION_STYLE = { transitionDuration: "100ms" } as const;

/**
 * Select.Popover / SelectPopover: the field's overlay. Upstream it is React
 * Aria's `Popover` with `.select__popover` (not HeroUI's Popover: 22pt corners,
 * no padding, its own scroll), so this port builds it on the core `Overlay`
 * plus `createOverlayPresence` (port sheet §3, B1–B4; §5, sixth change).
 *
 * The list subtree stays mounted while the field is closed: NSH builds its
 * collections from mounted parts, and a closed Select must still typeahead and
 * place the first focus (port sheet §5, third change). `hidden` is what the
 * closed layer gets; `presence` only drives the enter and exit classes.
 */
export function SelectPopover(props: SelectPopoverProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "placement",
    "offset",
    "crossOffset",
    "shouldFlip",
    "containerPadding",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "isNonModal",
    "isKeyboardDismissDisabled",
    "shouldCloseOnInteractOutside",
    "isEntering",
    "isExiting",
    "shouldSkipAnimation",
    "trigger",
    "triggerRef",
    "UNSTABLE_portalContainer",
    "id",
    "nativeID",
    "testID",
    "aria-label",
    "accessibilityLabel",
    "aria-labelledby",
    "aria-describedby",
    "aria-details",
    "slot",
    "render",
    "onLayout",
  ] as const);

  const select = SelectContext();
  const overlayTrigger = OverlayTriggerContext();

  if (!select) {
    return null;
  }

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule — a popover that was given its own
   * `isOpen` / `defaultOpen` (or has no trigger state at all) controls itself.
   * ----------------------------------------------------------------------------------------- */
  const ownsState = () =>
    props.isOpen !== undefined ||
    props.defaultOpen !== undefined ||
    !overlayTrigger;

  const [ownIsOpen, setOwnIsOpen] = createControllableBooleanSignal({
    value: () => (ownsState() ? props.isOpen : undefined),
    defaultValue: () => (ownsState() ? props.defaultOpen : undefined),
    onChange: (value) => {
      if (ownsState()) {
        props.onOpenChange?.(value);
      }
    },
  });

  const isOpen = computed(() =>
    ownsState() ? ownIsOpen() : (overlayTrigger?.isOpen() ?? false),
  );

  const close = () => {
    // The field's state is the one that owns the list's focus and reports the
    // change; a popover with its own open state only closes its own channel
    // (writing the field's would report a second time in controlled mode).
    if (ownsState()) {
      setOwnIsOpen(false);
    }

    select.close();
  };

  const isNonModal = () => props.isNonModal ?? false;
  const isKeyboardDismissDisabled = () =>
    props.isKeyboardDismissDisabled ?? false;

  /* -------------------------------------------------------------------------------------------
   * Presence, placement and geometry
   * ----------------------------------------------------------------------------------------- */
  const presence = createOverlayPresence({
    isOpen,
    durationMs: () => 100,
    skip: () => props.shouldSkipAnimation,
    isEntering: () => props.isEntering,
    isExiting: () => props.isExiting,
  });

  const resolved = computed(() => resolvePopoverPlacement(props.placement));
  const positionedSide = signal<PopoverSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);
  const triggerWidth = signal<number | undefined>(undefined);
  const availableHeight = signal<number | undefined>(undefined);

  const anchor = () => props.triggerRef ?? overlayTrigger?.triggerRef();

  const measureAnchor = () => {
    const trigger = anchor();

    if (!trigger) {
      return;
    }

    void trigger.measure().then((measured) => {
      if (!measured) {
        return;
      }

      anchorBounds.set({
        origin: measured.pagePosition,
        size: measured.bounds.size,
      });
      // R-047: `min-w-(--trigger-width)` is a measured value, so it is inline.
      triggerWidth.set(measured.bounds.size.width);
    });
  };

  effect(() => {
    if (!isOpen()) {
      return;
    }

    measureAnchor();
  });

  const handlePosition = (event: OverlayPosition) => {
    positionedSide.set(event.placement);
    overlayBounds.set(event.bounds);
    // The sheet's §2 `--available-height`: the scrolling viewport may not grow
    // past the room on the placement's side (`.select__popover`'s
    // `overflow-y-auto`).
    availableHeight.set(event.available.height);
    measureAnchor();
  };

  // R-048: `transform-origin: var(--trigger-anchor-point)`, computed from the
  // trigger's centre in the overlay's own frame (Popover.Content's algorithm).
  const transformOrigin = () => {
    const anchorBox = anchorBounds();
    const overlayBox = overlayBounds();

    if (!anchorBox || !overlayBox) {
      return undefined;
    }

    const x = anchorBox.origin.x + anchorBox.size.width / 2 - overlayBox.origin.x;
    const y = anchorBox.origin.y + anchorBox.size.height / 2 - overlayBox.origin.y;

    return `${x}px ${y}px`;
  };

  /* -------------------------------------------------------------------------------------------
   * Render values, classes and styles
   * ----------------------------------------------------------------------------------------- */
  const values: SelectPopoverRenderProps = {
    trigger: () => local.trigger ?? "Select",
    placement: () => positionedSide() ?? null,
    isEntering: presence.isEntering,
    isExiting: presence.isExiting,
  };

  const resolvedClassName = () => {
    const value = local.className;

    return (typeof value === "function" ? value(values) : value) ?? "";
  };

  const resolvedStyle = () => {
    const value = local.style;

    return typeof value === "function" ? value(values) : value;
  };

  const classes = computed(() =>
    [select.slots().popover(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-032 … R-035 / R-036 / R-037: the enter start classes come off one frame
  // after mount; the exit classes stay for the 100ms hold. The closed layer is
  // `hidden` — the list below stays mounted (port sheet §5, third change).
  const classList = computed(() => {
    const list: Record<string, boolean> = {
      hidden: !presence.isPresent(),
    };
    const current = side();

    if (presence.isEntering()) {
      list["opacity-0 scale-95"] = true;

      if (current === "top") {
        // R-032
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-033
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-034
        list["translate-x-1"] = true;
      } else {
        // R-035
        list["-translate-x-1"] = true;
      }
    }

    if (presence.isExiting()) {
      // R-037: the exit keeps the layer painted but inert.
      list["opacity-0 scale-95 pointer-events-none"] = true;
    }

    return list;
  });

  const style = () => [
    TRANSITION_STYLE,
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    { transformOrigin: transformOrigin(), minWidth: triggerWidth() },
    resolvedStyle(),
  ];

  const scrollStyle = (): StyleProp<ViewStyle> => ({
    maxHeight: availableHeight(),
  });

  const containerValue: ListBoxContainerContextValue = {
    // R-042: `.select__popover [data-slot="list-box"]`.
    listClass: () => "p-1.5 outline-none",
    // R-043: `.select__popover [data-slot="list-box-item"]`.
    itemClass: () => "px-2.5",
    // R-045: `:not([aria-multiselectable="true"])` → single-select only.
    suppressIndicatorTransition: () => select.selectionMode() !== "multiple",
    // The listbox's name: upstream `aria-labelledby` points at the field's
    // label; NSH hands the registered text down instead.
    accessibilityLabel: () => select.labelText(),
  };

  const handleCancel = () => {
    if (!isKeyboardDismissDisabled()) {
      close();
    }
  };

  // One read of `props.children`, at the placement inside the container that
  // tells the list which classes and switches it gets.
  const list = (
    <Scroll
      scrollbar={true}
      class="w-full"
      style={scrollStyle()}
      onLayout={local.onLayout}
    >
      <ListBoxContainerContext.Provider value={containerValue}>
        {renderChildren(local.children)}
      </ListBoxContainerContext.Provider>
    </Scroll>
  );

  const contentOverlay = (
    <Overlay
      ref={(node) => local.ref?.(node)}
      anchor={anchor() ?? null}
      placement={resolved().side}
      align={resolved().align}
      offset={local.offset ?? 8}
      margin={local.containerPadding ?? 12}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel}
      class={classes()}
      classList={classList()}
      style={style()}
      onPressOutside={isOpen() ? close : undefined}
      onCancel={isOpen() ? handleCancel : undefined}
      onPosition={handlePosition}
    >
      {list}
    </Overlay>
  );

  // The modal underlay: the second overlay that absorbs presses outside the
  // list, as RAC's `usePopover` underlay. It has to be the outer overlay with
  // the content nested inside it (two sibling overlays both claim the press on
  // the web target). It exists only while something is shown: the closed
  // field keeps the content mounted in the tree, but hidden, so the list's
  // collection survives (port sheet §5, third and sixth changes).
  return (
    <If when={!isNonModal()} else={contentOverlay}>
      <Overlay
        class="inset-0"
        classList={{
          hidden: !presence.isPresent(),
          "pointer-events-none": !isOpen(),
        }}
        focusable={false}
        onPress={() => {
          if (isOpen()) {
            close();
          }
        }}
      >
        {contentOverlay}
      </Overlay>
    </If>
  );
}
