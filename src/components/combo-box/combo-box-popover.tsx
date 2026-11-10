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
import { ComboBoxContext } from "./combo-box-context";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/** What a popover `className` / `style` function receives (RAC's `PopoverRenderProps`). */
export interface ComboBoxPopoverRenderProps {
  /** The component that opened the popover; `"ComboBox"` by default. */
  trigger: Accessor<string>;
  /** The side the overlay ended up on, `null` before the first placement. */
  placement: Accessor<PopoverSide | null>;
  isEntering: Accessor<boolean>;
  isExiting: Accessor<boolean>;
}

export interface ComboBoxPopoverProps {
  /** The popover's content (the caller's ListBox); read once at the placement. */
  children: JSX.Element;

  /** Appended after the popover slot classes; function form gets accessors. */
  className?: string | ((values: ComboBoxPopoverRenderProps) => string);

  style?:
    | StyleProp<ViewStyle>
    | ((values: ComboBoxPopoverRenderProps) => StyleProp<ViewStyle>);

  /** The overlay view; `focus()` and `measure()` reach it. */
  ref?: (node: ViewRef) => void;

  /** RAC placement (default `"bottom"`), mapped to the overlay's side and align. */
  placement?: PopoverPlacement;

  /** The gap between the input group and the overlay (default 8). */
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

  /** The name of the trigger, for render values (default `"ComboBox"`). */
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
// (R-023 / R-028): the property list, and the shorter exit duration.
const TRANSITION_STYLE = { transitionProperty: "opacity, transform" } as const;
const EXIT_DURATION_STYLE = { transitionDuration: "100ms" } as const;

/**
 * ComboBox.Popover / ComboBoxPopover: the field's overlay. Upstream it is React
 * Aria's `Popover` with `.combo-box__popover` (not HeroUI's Popover: 22pt
 * corners, no padding, its own scroll), so this port builds it on the core
 * `Overlay` plus `createOverlayPresence` (port sheet §3, B1–B4) instead of
 * `nsh/base`'s Popover.Content.
 *
 * The list subtree stays mounted while the field is closed: NSH builds its
 * collections from mounted parts, and a closed ComboBox must still filter and
 * place the first focus (port sheet §2). `hidden` is what the closed layer
 * gets; `presence` only drives the enter and exit classes.
 */
export function ComboBoxPopover(props: ComboBoxPopoverProps): JSX.Element {
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

  const combo = ComboBoxContext();
  const overlayTrigger = OverlayTriggerContext();

  if (!combo) {
    return null;
  }

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule — a popover given its own `isOpen` /
   * `defaultOpen` (or with no trigger state at all) controls its visibility.
   * It only overrides the layer: filtering, the text and the root's callback
   * still belong to the field's state (port sheet §1).
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

  const isNonModal = () => props.isNonModal ?? false;
  const isKeyboardDismissDisabled = () =>
    props.isKeyboardDismissDisabled ?? false;

  /** The commit-style close: text committed, then the menu (§2). */
  const close = () => {
    if (ownsState()) {
      setOwnIsOpen(false);
    }

    combo.commitClose();
  };

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

  const resolved = computed(() =>
    resolvePopoverPlacement(local.placement ?? "bottom"),
  );
  const positionedSide = signal<PopoverSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);
  const triggerWidth = signal<number | undefined>(undefined);
  const availableHeight = signal<number | undefined>(undefined);

  // R-037: the input group is the anchor; the trigger is not (it is not a
  // focus stop and not the field's width).
  const anchor = () =>
    combo.anchorRef() ?? props.triggerRef ?? overlayTrigger?.triggerRef();

  const measureAnchor = () => {
    const node = anchor();

    if (!node) {
      return;
    }

    void node.measure().then((measured) => {
      if (!measured) {
        return;
      }

      anchorBounds.set({
        origin: measured.pagePosition,
        size: measured.bounds.size,
      });
      // R-037: `min-w-(--trigger-width)` is a measured value, so it is inline.
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
    // The `max-h` half of the sheet: the scrolling viewport may not grow past
    // the room on the placement's side (R-033's `overflow-y-auto`).
    availableHeight.set(event.available.height);
    measureAnchor();
  };

  // R-038: `transform-origin: var(--trigger-anchor-point)`, computed from the
  // anchor's centre in the overlay's own frame (Popover.Content's algorithm).
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
  const values: ComboBoxPopoverRenderProps = {
    trigger: () => local.trigger ?? "ComboBox",
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
    [combo.slots().popover(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-023 … R-027: the enter start classes come off one frame after the
  // classes land; R-028: the exit classes stay for the 100ms hold and make the
  // layer inert. The closed layer is `hidden` — the list below stays mounted.
  const classList = computed(() => {
    const list: Record<string, boolean> = {
      hidden: !presence.isPresent(),
    };
    const current = side();

    if (presence.isEntering()) {
      // R-023: the 95% scale and the transparent start.
      list["opacity-0 scale-95"] = true;

      if (current === "top") {
        // R-024
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-025
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-026
        list["translate-x-1"] = true;
      } else {
        // R-027
        list["-translate-x-1"] = true;
      }
    }

    if (presence.isExiting()) {
      // R-028: the exit keeps the layer painted but inert.
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
    // R-033: `.combo-box__popover [data-slot="list-box"]`. The scroll classes
    // are the `Scroll` below; `p-1.5` beats the list's own `p-1`.
    listClass: () => "min-h-0 p-1.5 outline-none",
    // R-034 / R-035: `.combo-box__popover [data-slot="list-box-item"]` →
    // `px-2.5`; the item's own indicator registration still appends `pe-7`
    // after it.
    itemClass: () => "px-2.5",
    // R-036: the checkmark does not animate in a ComboBox (the comment upstream
    // says single-select, but the rule matches unconditionally).
    suppressIndicatorTransition: () => true,
    // The listbox's name: upstream `aria-labelledby` points at the field's
    // label; NSH hands the registered text down instead.
    accessibilityLabel: () => combo.labelText(),
  };

  const handleCancel = () => {
    if (!isKeyboardDismissDisabled()) {
      // Escape is `revert`, not `close` (`useComboBox.ts:238-246`): the text
      // goes back to the selected item's and the selection stays.
      combo.revert();
    }
  };

  // One read of `props.children`, at the placement inside the container that
  // tells the list which classes and switches it gets.
  const listContent = (
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
      // RAC's `Popover` default (`Popover.tsx:242`); the core Overlay's own
      // default is 0, which would paste the layer to the input group.
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
      {listContent}
    </Overlay>
  );

  // The modal underlay: the outer overlay absorbs presses outside the list, as
  // RAC's `usePopover` underlay does. The closed field keeps the content
  // mounted but hidden, so the list's collection survives.
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
