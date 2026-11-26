import type { Bounds, JSX, ViewProps, ViewRef } from "nsh";
import { createMotion, effect, reduceMotion, signal, split, View, windowSize } from "nsh";
import { createInput } from "../../primitives/environment";
import { createPan } from "../../primitives/pan";
import { SurfaceContext } from "../surface/surface-context";
import { createDrawerPartOrder, DrawerDialogContext } from "./create-drawer-part-order";
import type { DrawerContextValue, DrawerDrag } from "./drawer-context";
import { DrawerContext } from "./drawer-context";
import { drawerVariants } from "./drawer.styles";

export interface DrawerDialogProps extends Omit<ViewProps, "children" | "class" | "ref" | "role"> {
  children?: JSX.Element | ((values: { close: () => void }) => JSX.Element);
  className?: string;
  style?: ViewProps["style"];
  role?: "alertdialog" | "dialog";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  slot?: string;
  render?: unknown;
  id?: string;
  ref?: (node: ViewRef) => void;
}

export function DrawerDialog(props: DrawerDialogProps): JSX.Element {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "role",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "slot",
    "render",
    "id",
    "ref",
    "onLayout",
  ] as const);

  const context = DrawerContext();
  const drawer = context ?? fallbackContext;
  const renderValues = { close: drawer.close };

  // R-030–R-032: the parts read their predecessor here. Created once per
  // Dialog so the table is shared with the children mounted below.
  const partOrder = createDrawerPartOrder();

  // The children are read exactly once, at the placement, inside the order
  // provider (common rules: a part that registers into the Dialog's table
  // must be created inside that provider to see it).
  const content = () => {
    const node = local.children;

    return typeof node === "function"
      ? (node as (values: { close: () => void }) => JSX.Element)(renderValues)
      : (node as JSX.Element);
  };

  // Upstream slides the content wrapper from `translate: 100%` of the visual
  // viewport, so the panel's visible travel is the last part of a full-screen
  // move. A class transition depends on both the start state being painted and
  // the class change landing after it, which a presented dialog does not
  // guarantee (the host may mount it a few frames after `open`). A motion value
  // moves the view natively from its first frame, so the slide cannot be
  // skipped; the distance is the window's, the same 100% upstream uses.
  const horizontal = () =>
    drawer.placement() === "left" || drawer.placement() === "right";
  // Upstream's enter starts past the edge the panel comes from: negative for
  // top and left, positive for bottom and right.
  const offset = () => {
    const size = horizontal() ? windowSize().width : windowSize().height;

    return drawer.placement() === "left" || drawer.placement() === "top" ? -size : size;
  };
  const motion = createMotion({
    initial: horizontal()
      ? { translateX: offset(), translateY: 0 }
      : { translateX: 0, translateY: offset() },
  });
  // Upstream's enter (250ms) and exit (200ms), on the fluid curve.
  const slide = [0.32, 0.72, 0, 1] as [number, number, number, number];

  effect(() => {
    const open = drawer.isOpen();
    const exiting = drawer.isExiting();
    const shown = drawer.isPresented();
    const moving = horizontal() ? motion.translateX : motion.translateY;
    const across = horizontal() ? motion.translateY : motion.translateX;
    across.set(0);

    if (reduceMotion()) {
      moving.set(0);

      return;
    }

    if (exiting) {
      moving.timing(offset(), { duration: 200, easing: slide });

      return;
    }

    if (shown && open) {
      // Presented: the panel starts off the edge (the motion's initial value)
      // and slides to rest. A reopen during the exit continues from where it is.
      moving.timing(0, { duration: 250, easing: slide });

      return;
    }

    if (shown) {
      // The close render arrives before the presence sets the exit hold; the
      // panel stays where it is until `exiting` is true.
      return;
    }

    // The dialog is gone (or never presented): park past the edge, ready.
    moving.set(offset());
  });

  // --- Swipe to dismiss (A-001, A-002, A-008): a touch-only `createPan` pair
  // on the bottom placement — the handle's press-claim and the panel's
  // first-dominant-move claim. Under the default pointer environment both
  // `panHandlers()` resolve to the empty object: no listener mounts at all.
  const input = createInput();
  // The panel's laid-out height feeds the dismiss threshold (30% of it, as
  // upstream measures the drag against the dialog's own size); the Dialog's
  // own `onLayout` reports it before forwarding to the caller.
  const panelHeight = signal(0);
  // The last offset the drag wrote — the `drag.offset` channel the fixture
  // probe reads (`AnimatedValue` offers no synchronous value).
  const dragOffset = signal(0);
  // All four gates read through the context: touch input, the bottom edge
  // (the action's bottom-only limit), dismissable (upstream's
  // `isDismissable`-gated drag) and the `isSwipeable` master switch.
  const swipeEnabled = () =>
    input() === "touch" &&
    drawer.placement() === "bottom" &&
    drawer.isDismissable() &&
    drawer.isSwipeable?.() !== false;
  const dragTo = (value: number) => {
    // `set` interrupts any enter/exit animation in flight: the finger owns
    // the same motion channel from here on (single writer).
    motion.translateY.set(Math.max(0, value));
    dragOffset.set(Math.max(0, value));
  };
  const resetDrag = () => {
    // Released early or terminated: settle back to rest on the same fluid
    // curve the enter slides in on.
    motion.translateY.timing(0, { duration: 250, easing: slide });
    dragOffset.set(0);
  };
  const settleDrag = (gesture: { dy: number; vy: number }) => {
    const dy = Math.max(0, gesture.dy);
    // Upstream's release decides on the travel against the panel's own size
    // (30%) or the flick speed (0.5 pt/ms); the net travel must also point
    // at the dismiss edge (§8, toast's same-direction rule), so a fast
    // upward flick can never close.
    if (gesture.dy > 0 && (dy > panelHeight() * 0.3 || Math.abs(gesture.vy) > 500)) {
      dragOffset.set(0);
      // The open flip runs the existing exit branch, whose
      // `moving.timing(offset)` continues the slide from where the finger
      // left the panel.
      drawer.close();
      return;
    }
    resetDrag();
  };
  // A-001: the handle's drag surface claims on press (the default
  // `createPan` semantics — no `shouldClaim`), exactly what a drag view is
  // for; it has no scroll view to compete with.
  const handlePan = createPan({
    enabled: swipeEnabled,
    onDrag: (_event, gesture) => dragTo(gesture.dy),
    onDragEnd: (_event, gesture, terminated) => {
      if (terminated) resetDrag();
      else settleDrag(gesture);
    },
  });
  // A-002: the panel itself claims on the first dominant move — measured on
  // the headless host, the Body Scroll's native recognizer takes the touches
  // at its own threshold and a claim that asks later is granted to no one.
  // The predicate is the handoff decision: a downward, dominant pull while
  // the Body reports its start edge is the panel's; anything else (the up
  // push, a sideways move, a pull while the content is scrolled) is left to
  // the Scroll. Capture runs before the Scroll's recognizer, so the claim
  // lands first.
  const panelPan = createPan({
    enabled: swipeEnabled,
    shouldClaim: (_event, gesture) =>
      gesture.dy > 0 &&
      Math.abs(gesture.dy) > Math.abs(gesture.dx) &&
      (drawer.scrollAtTop?.() ?? true),
    onDrag: (_event, gesture) => dragTo(gesture.dy),
    onDragEnd: (_event, gesture, terminated) => {
      if (terminated) resetDrag();
      else settleDrag(gesture);
    },
  });
  const dragValue: DrawerDrag = {
    panHandlers: handlePan.panHandlers,
    panelPanHandlers: panelPan.panHandlers,
    offset: dragOffset,
  };
  // The context as the parts below see it: the Backdrop's value plus this
  // Dialog's drag channel (the Handle spreads `drag.panHandlers`).
  const dragContextValue: DrawerContextValue = { ...drawer, drag: dragValue };
  const handleLayout = (event: { bounds: Bounds }) => {
    panelHeight.set(event.bounds.size.height);
    local.onLayout?.(event);
  };

  const className = () =>
    [drawer.slots().dialog(), local.className].filter(Boolean).join(" ");
  const style = () => {
    const caller = local.style;
    const base = drawer.isDismissable() ? { touchAction: "none" as const, ...caller } : caller;

    return [base, motion.style];
  };

  return (
    <SurfaceContext.Provider value={{ variant: () => "default" }}>
      {/* A-001: the Dialog re-provides the context with its own drag channel,
          wrapping the part-order provider so the parts below see both. */}
      <DrawerContext.Provider value={dragContextValue}>
        <DrawerDialogContext.Provider value={partOrder}>
          <View
            {...rest}
            // A-002: the panel's gesture spread — empty under pointer, so the
            // desktop mounts nothing (the negative assertion).
            {...panelPan.panHandlers()}
            ref={(node) => local.ref?.(node)}
            class={className()}
            style={style()}
            onLayout={handleLayout}
          >
            {content()}
          </View>
        </DrawerDialogContext.Provider>
      </DrawerContext.Provider>
    </SurfaceContext.Provider>
  );
}

const fallbackContext: DrawerContextValue = {
  slots: () => drawerVariants({ placement: "bottom", variant: "opaque" }),
  placement: () => "bottom",
  variant: () => "opaque",
  isDismissable: () => true,
  isOpen: () => false,
  isEntering: () => false,
  isExiting: () => false,
  isPresented: () => false,
  scrollAtTop: () => true,
  open: () => {},
  close: () => {},
  toggle: () => {},
};
