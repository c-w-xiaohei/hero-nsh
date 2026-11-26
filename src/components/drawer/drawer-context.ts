import type { Accessor, Point } from "nsh";
import { computed, context } from "nsh";

import { createInput } from "../../primitives/environment";
import type { DrawerPlacement, DrawerSlots, DrawerVariants } from "./drawer.styles";
import { drawerVariants } from "./drawer.styles";

/**
 * The drag channel `Drawer.Dialog` hands the parts inside it (adapt sheet
 * A-001/A-002). Declared structurally so this module keeps no import from
 * `src/primitives`: the Dialog provides the real `createPan` accessors,
 * which are assignable to this shape. `null` under a default environment —
 * the gesture path does not exist there at all.
 */
export interface DrawerDrag {
  /** The Handle's responder props (`createPan` press-claim); empty when the gesture is not attached. */
  panHandlers: () => object;

  /** The panel's own responder props, for the A-005 fixture `DragProbe` key count; already spread on the Dialog's root view. */
  panelPanHandlers: () => object;

  /** The drag's current translateY, read by the A-005 fixture `DragProbe` (`AnimatedValue` has no synchronous read). */
  offset: Accessor<number>;
}

export interface DrawerContextValue {
  slots: Accessor<DrawerSlots>;
  placement: Accessor<DrawerPlacement>;
  variant: Accessor<DrawerVariants["variant"]>;
  isDismissable: Accessor<boolean>;
  isOpen: Accessor<boolean>;
  /** The first frame after opening: the panel and backdrop still hold their off state. */
  isEntering: Accessor<boolean>;
  /** The exit hold: the dialog owns the panel's slide out. */
  isExiting: Accessor<boolean>;
  /** The host presented the dialog (`onOpen`); nothing is visible before this. */
  isPresented: Accessor<boolean>;
  /** The touch-only swipe-to-dismiss master switch (`Drawer.Backdrop`/`Drawer.Content`, default true). */
  isSwipeable?: Accessor<boolean | undefined>;
  /** The Dialog's drag channel, re-provided with its own pan mounted (A-001). */
  drag?: DrawerDrag;
  /** Whether the Body's scroll view sits at its start edge (A-003); `true` where nothing scrolls. */
  scrollAtTop?: Accessor<boolean>;
  /** `Drawer.Body` reports its scroll offset here on every `onScroll` (A-003). */
  reportScrollOffset?: (offset: Point) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const DrawerContext = context<DrawerContextValue | null>(null);

export function createDrawerContextValue(options: {
  isOpen: Accessor<boolean>;
  setOpen: (open: boolean | ((previous: boolean) => boolean)) => void;
  placement?: Accessor<DrawerPlacement | undefined>;
  variant?: Accessor<DrawerVariants["variant"] | undefined>;
}): DrawerContextValue {
  const placement = () => options.placement?.() ?? "bottom";
  const variant = () => options.variant?.() ?? "opaque";
  const isDismissable = () => true;
  // A-004: the `input` axis is read at the slots production line.
  const input = createInput();
  const value: DrawerContextValue = {
    slots: computed(() =>
      drawerVariants({ input: input(), placement: placement(), variant: variant() }),
    ),
    placement,
    variant,
    isDismissable,
    isOpen: options.isOpen,
    isEntering: () => false,
    isExiting: () => false,
    isPresented: () => false,
    // A-003: nothing scrolls without a Backdrop's channel, so the panel is
    // always claimable here.
    scrollAtTop: () => true,
    open: () => options.setOpen(true),
    close: () => options.setOpen(false),
    toggle: () => options.setOpen((previous) => !previous),
  };
  return value;
}
