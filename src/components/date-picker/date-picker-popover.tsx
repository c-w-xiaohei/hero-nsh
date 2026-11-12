import type {
  Accessor,
  Bounds,
  JSX,
  OverlayPosition,
  StyleProp,
  ViewRef,
  ViewStyle,
} from "nsh";
import { cleanup, computed, effect, reduceMotion, signal, split, Overlay } from "nsh";

import { createControllableBooleanSignal } from "../../primitives/create-controllable-signal";
import { createKeymapScope } from "../../primitives/create-keymap-scope";
import { createOverlayPresence } from "../../primitives/create-overlay-presence";
import type { PopoverPlacement, PopoverSide } from "../popover/popover-placement";
import { resolvePopoverPlacement } from "../popover/popover-placement";
import { SurfaceContext, type SurfaceContextValue } from "../surface/surface-context";
import { DatePickerContext } from "./date-picker-context";
import { renderChildren } from "./render-children";

/* -------------------------------------------------------------------------------------------------
 * Render props
 * -----------------------------------------------------------------------------------------------*/

/** What a popover `className` / `style` function receives (RAC's `PopoverRenderProps`). */
export interface DatePickerPopoverRenderProps {
  /** The component that opened the layer; `"DatePicker"` by default. */
  trigger: Accessor<string>;

  /** The side the layer ended up on, `null` before the first placement. */
  placement: Accessor<PopoverSide | null>;

  /** The layer is playing its enter transition. */
  isEntering: Accessor<boolean>;

  /** The layer is playing its exit transition and is still mounted. */
  isExiting: Accessor<boolean>;
}

/**
 * The props of `DatePicker.Popover`: HeroUI's `DatePickerPopoverProps`, which
 * is `Omit<ComponentPropsWithRef<typeof PopoverPrimitive>, "children">` plus a
 * required `children` (`date-picker.tsx:151-156`). The members NSH has no
 * channel for are accepted and have no effect (port sheet §1.5, §8).
 */
export interface DatePickerPopoverProps {
  /** The layer's content, typically a `Calendar`; read once at the placement. */
  children: JSX.Element;

  /** Appended after the `popover` slot classes; the function form gets the same accessors. */
  className?: string | ((values: DatePickerPopoverRenderProps) => string | undefined);

  /** Style of the layer; the function form gets the same accessors. */
  style?: StyleProp<ViewStyle> | ((values: DatePickerPopoverRenderProps) => StyleProp<ViewStyle>);

  /** Where the layer goes; HeroUI pins the picker to `"bottom"`. @default "bottom" */
  placement?: PopoverPlacement;

  /** The gap between the field and the layer. @default 8 */
  offset?: number;

  /** The safe-area margin (React Aria's `containerPadding`). @default 12 */
  containerPadding?: number;

  /** Accepted, no effect: the core Overlay has no cross-axis offset. */
  crossOffset?: number;

  /** Accepted, no effect: the core Overlay always flips when the other side fits. */
  shouldFlip?: boolean;

  /** Accepted, no effect: the core Overlay takes no boundary element. */
  boundaryElement?: unknown;

  /** Accepted, no effect: the layer sizes to its content (no RAC max-height). */
  maxHeight?: number;

  /** Accepted, no effect: NSH has no arrow element. */
  arrowSize?: number;

  /** The layer's own open state (overrides the picker's, as in React Aria). */
  isOpen?: boolean;

  /** The layer's initial open state, uncontrolled. */
  defaultOpen?: boolean;

  /** The layer opened or closed. */
  onOpenChange?: (isOpen: boolean) => void;

  /** Modal by default: a backdrop absorbs the presses outside. */
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

  /** The name of the trigger, for render values. @default "DatePicker" */
  trigger?: string;

  /** Anchors the layer directly, winning over the field group. */
  triggerRef?: ViewRef | null;

  /** Accepted, no effect: the overlay renders in its own root view. */
  UNSTABLE_portalContainer?: unknown;

  /** A DOM id upstream; maps to `nativeID`. */
  id?: string;

  /** NSH's own id; `id` wins. */
  nativeID?: string;

  /** An identifier for UI tests. */
  testID?: string;

  /** The layer's accessible name; the registered Label text is the fallback. */
  "aria-label"?: string;

  /** NSH's own accessible name; `aria-label` wins. */
  accessibilityLabel?: string;

  /** Accepted, no effect: NSH resolves no accessible names from ids. */
  "aria-labelledby"?: string;
  "aria-describedby"?: string;

  /** Accepted, no effect: NSH has no `aria-details` channel. */
  "aria-details"?: string;

  /** Accepted, no effect: NSH has no slot collection. */
  slot?: string;

  /** Accepted, no effect: NSH cannot replace a host element. */
  render?: unknown;

  /** Accepted, no effect: focus within is reported by the parts themselves. */
  onFocusWithin?: () => void;
  onBlurWithin?: () => void;
  onFocusWithinChange?: (isFocusWithin: boolean) => void;

  /** The layer was laid out. */
  onLayout?: (event: { bounds: Bounds }) => void;

  /** The layer's view, forwarded as a callback only. */
  ref?: (node: ViewRef) => void;

  /** Any other DOM / global attribute HeroUI accepts; no effect here (D18). */
  [key: string]: unknown;
}

// The two owners of the transition NSH cannot express with one class
// (R-017 / R-027): the property list, and the shorter exit duration. The list is
// a function, not a constant: R-017's `motion-reduce:transition-none` is a class
// and an inline list outranks it, so reduced motion clears the list here — the
// one owner of the property reads the preference as well.
const transitionStyle = (): ViewStyle => ({
  transitionProperty: reduceMotion() ? "none" : "opacity, transform",
});
const EXIT_DURATION_STYLE = { transitionDuration: "100ms" } as const;

/**
 * The unmodified keys that mark a keyboard interaction while the layer is open
 * (`date-picker.tsx:57-84` listens on `window` for any of them, without
 * ctrl / meta / alt). NSH has no document-level keys, so the layer binds them
 * while it is open (port sheet §5).
 *
 * The navigation keys are missing on purpose: arrows, Home, End and the page
 * keys belong to the calendar grid, which binds them while a cell has the
 * focus, and `keymap` keeps only the newest binding per keystroke. Binding them
 * here would either lose to the grid or take them from it.
 */
const UNMODIFIED_KEYS: readonly string[] = [
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."0123456789",
  "backspace",
  "delete",
];

/**
 * DatePicker.Popover / DatePickerPopover: the calendar layer. Upstream it is
 * React Aria's `Popover` around a `Dialog`, carrying `.date-picker__popover`
 * itself (20pt corners, `p-3`, its own background and shadow), so this port
 * builds it on the core `Overlay` plus `createOverlayPresence` instead of
 * reusing `Popover.Content`, whose slot, dialog ownership and enter parameters
 * all differ (port sheet §3, B1–B4).
 *
 * The layer element is the one the caller's `className` lands on, as upstream:
 * the enter / exit classes, the slot classes, the transform origin and the
 * caller's classes all describe that single box.
 */
export function DatePickerPopover(props: DatePickerPopoverProps): JSX.Element {
  const [local] = split(props, [
    "children",
    "className",
    "style",
    "placement",
    "offset",
    "containerPadding",
    "crossOffset",
    "shouldFlip",
    "boundaryElement",
    "maxHeight",
    "arrowSize",
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
    "onFocusWithin",
    "onBlurWithin",
    "onFocusWithinChange",
    "onLayout",
    "ref",
  ] as const);

  const picker = DatePickerContext();

  /* -------------------------------------------------------------------------------------------
   * Open state: React Aria's rule — a popover given its own `isOpen` /
   * `defaultOpen` holds the state itself, otherwise it follows the picker.
   * ----------------------------------------------------------------------------------------- */
  const ownsOwnState = props.isOpen !== undefined || props.defaultOpen !== undefined;

  const [ownIsOpen, setOwnIsOpen] = createControllableBooleanSignal({
    value: () => (ownsOwnState ? local.isOpen : undefined),
    defaultValue: () => (ownsOwnState ? (local.defaultOpen ?? false) : undefined),
    onChange: (value) => {
      if (ownsOwnState) {
        local.onOpenChange?.(value);
      }
    },
  });

  const isOpen = computed(() => (ownsOwnState ? ownIsOpen() : picker.isOpen()));

  const setOpen = (next: boolean) => {
    if (ownsOwnState) {
      setOwnIsOpen(next);
    } else {
      picker.setOpen(next);
    }
  };

  // The root's `isOpen` / `toggle` / `close` drive the layer that is really on
  // screen: with its own channel the popover owns the state, so the root reads
  // it from here (port sheet §1.5).
  if (ownsOwnState) {
    cleanup(picker.registerLayer({ isOpen, setOpen }));
  }

  const isNonModal = () => local.isNonModal ?? false;
  const isKeyboardDismissDisabled = () => local.isKeyboardDismissDisabled ?? false;

  /* -------------------------------------------------------------------------------------------
   * Presence, placement and geometry
   * ----------------------------------------------------------------------------------------- */
  const presence = createOverlayPresence({
    isOpen,
    durationMs: () => 100,
    skip: () => local.shouldSkipAnimation,
    isEntering: () => local.isEntering,
    isExiting: () => local.isExiting,
  });

  const resolved = computed(() => resolvePopoverPlacement(local.placement));
  const positionedSide = signal<PopoverSide | undefined>(undefined);

  const side = computed(() => positionedSide() ?? resolved().side);

  const anchorBounds = signal<Bounds | undefined>(undefined);
  const overlayBounds = signal<Bounds | undefined>(undefined);

  // React Aria anchors the picker's layer to the whole field group
  // (`triggerRef: groupRef`); HeroUI then places it on `bottom`. A caller's
  // `triggerRef` wins, and a lone popover falls back to its trigger (port sheet
  // §5, second change).
  const anchor = () => local.triggerRef ?? picker.anchorRef() ?? picker.triggerRef();

  const measureAnchor = () => {
    const trigger = anchor();

    if (!trigger) {
      return;
    }

    void trigger.measure().then((measured) => {
      if (measured) {
        anchorBounds.set({ origin: measured.pagePosition, size: measured.bounds.size });
      }
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
    measureAnchor();
  };

  // R-013: `transform-origin: var(--trigger-anchor-point)` — the anchor's
  // centre in the layer's own frame (Popover.Content's algorithm).
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
   * Focus: RAC focuses the modal layer itself on open and restores the trigger
   * on close. NSH has no focus channel on the layer root, so the layer view
   * registers here and the root restores the trigger from its own effect.
   * ----------------------------------------------------------------------------------------- */
  const layerNode = signal<ViewRef | undefined>(undefined);
  const layerFocused = signal(false);
  let focusedForOpen = false;

  effect(() => {
    const open = isOpen();
    const node = layerNode();

    if (!open) {
      focusedForOpen = false;
      layerFocused.set(false);

      return;
    }

    if (focusedForOpen || node === undefined || isNonModal()) {
      return;
    }

    focusedForOpen = true;
    layerFocused.set(false);

    // A real Windows window registers the layer after the opening commit, so
    // the first attempt can be a no-op there; retry once (Popover.Content's
    // solved shape).
    let frame = requestAnimationFrame(() => {
      if (layerFocused()) {
        return;
      }

      node.focus();

      frame = requestAnimationFrame(() => {
        if (!layerFocused()) {
          node.focus();
        }
      });
    });

    return () => cancelAnimationFrame(frame);
  });

  /* -------------------------------------------------------------------------------------------
   * Keyboard: a key pressed while the layer is open marks the close as
   * keyboard, so the trigger gets the focus back (HeroUI's window listener).
   * ----------------------------------------------------------------------------------------- */
  const bindings: Record<string, (event: { keystroke: string }) => void> = {};

  for (const key of UNMODIFIED_KEYS) {
    bindings[key] = () => {
      picker.setKeyboardModality();
      picker.markRestoreFocus();
    };
  }

  createKeymapScope({ isActive: isOpen, bindings });

  /* -------------------------------------------------------------------------------------------
   * Render values, classes and styles
   * ----------------------------------------------------------------------------------------- */
  const values: DatePickerPopoverRenderProps = {
    trigger: () => local.trigger ?? "DatePicker",
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

  // R-012 / R-017 / R-018 / R-019 / R-020 ride on the slot class; the caller's
  // classes come after them, so its box wins on the keys it sets.
  const classes = computed(() =>
    [picker.slots.popover(), resolvedClassName()]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" "),
  );

  // R-021 and R-022 … R-025: the enter start classes come off one frame after
  // mount, which is what turns them into a transition; the per-side start
  // translation replaces the CSS animation's name.
  // R-026: the exit classes stay for the 100ms hold and keep the layer inert.
  const classList = computed(() => {
    const list: Record<string, boolean> = {};
    const current = side();

    if (presence.isEntering()) {
      list["opacity-0 scale-95"] = true;

      if (current === "top") {
        // R-022
        list["translate-y-1"] = true;
      } else if (current === "bottom") {
        // R-023
        list["-translate-y-1"] = true;
      } else if (current === "left") {
        // R-024
        list["translate-x-1"] = true;
      } else {
        // R-025
        list["-translate-x-1"] = true;
      }
    }

    if (presence.isExiting()) {
      list["opacity-0 scale-95 pointer-events-none"] = true;
    }

    return list;
  });

  // R-027: the exit runs 100ms while the slot class keeps 150ms for the enter;
  // `animation-fill-mode: none` has no counterpart and needs none (the layer is
  // unmounted when the hold ends).
  const style = (): StyleProp<ViewStyle> => [
    transitionStyle(),
    presence.isExiting() ? EXIT_DURATION_STYLE : undefined,
    { transformOrigin: transformOrigin() },
    resolvedStyle(),
  ];

  // R-016 (`overscroll-behavior: contain`) is deleted: NSH's Scroll has no
  // scroll-chaining switch, and the layer's content has no scrollable overflow.
  // R-014 / R-015 (`scrollbar-none`, `overflow-y: auto`) would need a `Scroll`
  // between the layer and its content; that extra content layer would take the
  // caller's `className` away from the layer element itself, so the rules are
  // not realized (port sheet §8, item 13).

  const handleCancel = () => {
    // Escape is the one key that reaches the layer without a `keymap` binding:
    // it marks the close as keyboard even when dismissal is disabled upstream.
    picker.setKeyboardModality();
    picker.markRestoreFocus();

    if (!isKeyboardDismissDisabled()) {
      setOpen(false);
    }
  };

  // Upstream provides the default surface variant to everything in the layer
  // (`date-picker.tsx:198-202`); no component reads it yet, so this keeps the
  // interface faithful (port sheet §3).
  const surfaceValue: SurfaceContextValue = { variant: () => "default" };

  // The one read of `props.children`, at the placement inside the layer.
  const contentOverlay = (
    <Overlay
      ref={(node) => {
        layerNode.set(node);
        local.ref?.(node);
      }}
      anchor={anchor() ?? null}
      placement={resolved().side}
      align={resolved().align}
      offset={local.offset ?? 8}
      margin={local.containerPadding ?? 12}
      focusable={true}
      testID={local.testID}
      nativeID={local.id ?? local.nativeID}
      accessibilityLabel={local["aria-label"] ?? local.accessibilityLabel ?? picker.labelText()}
      class={classes()}
      classList={classList()}
      style={style()}
      onPressOutside={isOpen() ? () => setOpen(false) : undefined}
      onCancel={isOpen() ? handleCancel : undefined}
      onPosition={handlePosition}
      onFocus={() => layerFocused.set(true)}
      onLayout={local.onLayout}
    >
      {renderChildren(local.children)}
    </Overlay>
  );

  // The modal underlay is the outer overlay: two sibling overlays both claim a
  // press on the web target, so the content has to be nested inside it
  // (Popover.Content's solved shape). It ignores pointer events while the layer
  // closes, so the trigger stays reachable during the exit hold.
  const underlayClassList = computed(() => ({ "pointer-events-none": !isOpen() }));

  return (
    <SurfaceContext.Provider value={surfaceValue}>
      <If when={presence.isPresent()}>
        <If when={!isNonModal()} else={contentOverlay}>
          <Overlay
            class="inset-0"
            classList={underlayClassList()}
            focusable={false}
            onPress={() => {
              if (isOpen()) {
                setOpen(false);
              }
            }}
          >
            {contentOverlay}
          </Overlay>
        </If>
      </If>
    </SurfaceContext.Provider>
  );
}
