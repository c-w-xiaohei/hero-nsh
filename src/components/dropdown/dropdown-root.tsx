import type { JSX, Point } from "nsh";
import { signal, split } from "nsh";

import { createOverlayTrigger } from "../../primitives/create-overlay-trigger";
import { OverlayTriggerContext } from "../../primitives/create-overlay-trigger";
import type {
  DropdownContextValue,
  DropdownTriggerMode,
} from "./dropdown-context";
import { DropdownContext } from "./dropdown-context";
import { dropdownVariants } from "./dropdown.styles";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Dropdown` / `Dropdown.Root`: HeroUI's `DropdownRootProps`,
 * which is `MenuTrigger`'s props plus the variant table. `MenuTrigger` is not a
 * `forwardRef` component, so no `ref`; it renders no element, so `className`
 * and the DOM props are accepted without effect.
 */
export interface DropdownRootProps {
  /** The trigger and the popover. Read once, inside both providers. */
  children?: JSX.Element;

  /** The open state in controlled mode. */
  isOpen?: boolean;

  /** The initial open state in uncontrolled mode (default `false`). */
  defaultOpen?: boolean;

  /** Called whenever the open state changes. */
  onOpenChange?: (isOpen: boolean) => void;

  /** Disables the trigger; the trigger's own `isDisabled` is OR-ed in. */
  isDisabled?: boolean;

  /** What opens the menu. @default "press" */
  trigger?: DropdownTriggerMode;

  /** Passed to the menu as its close-on-select default. */
  shouldCloseOnSelect?: boolean;

  /** Accepted, no effect: `MenuTrigger` renders no element to carry it. */
  className?: string;

  /**
   * Accepted, no effect: upstream's `MenuTrigger` writes `placement:
   * "bottom start"` and never reads `align` (React Aria Components
   * `Menu.tsx:160`). Change the side through `Dropdown.Popover`'s `placement`.
   */
  align?: string;
  direction?: "ltr" | "rtl";

  /** Accepted, no effect: NSH has no element to attach DOM handlers to. */
  "aria-label"?: string;
  slot?: string;
  render?: unknown;
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  hidden?: boolean;
  inert?: boolean;
}

/**
 * Dropdown / DropdownRoot: HeroUI's `MenuTrigger`. It renders no view of its
 * own (a wrapper would change the layout and the press chain) and provides the
 * shared open state to the trigger and the popover.
 */
export function DropdownRoot(props: DropdownRootProps) {
  const [local] = split(props, [
    "children",
    "isOpen",
    "defaultOpen",
    "onOpenChange",
    "isDisabled",
    "trigger",
    "shouldCloseOnSelect",
    "className",
    "align",
    "direction",
    "aria-label",
    "slot",
    "render",
    "dir",
    "lang",
    "hidden",
    "inert",
  ] as const);

  const trigger = createOverlayTrigger({
    isOpen: () => local.isOpen,
    defaultOpen: () => local.defaultOpen,
    onOpenChange: (isOpen) => local.onOpenChange?.(isOpen),
  });

  const triggerMode = (): DropdownTriggerMode => local.trigger ?? "press";

  const contextMenuPoint = signal<Point | undefined>(undefined);

  // React Aria's `MenuTriggerState.focusStrategy`: the key that opened the menu
  // decides where its focus lands. A pointer open passes none, so the menu root
  // takes the focus without selecting a row, as upstream.
  const openFocusStrategy = signal<"first" | "last" | undefined>(undefined);

  // A press on a Button placed in this root arrives here instead of a plain
  // toggle, so `longPress` and `contextMenu` keep their own entry points.
  // Keyboard activation opens in every mode but `contextMenu`, where upstream
  // only listens for the secondary button.
  const triggerPress = (source: "keyboard" | "pointer") => {
    if (source === "keyboard" ? triggerMode() !== "contextMenu" : triggerMode() === "press") {
      if (source === "keyboard") {
        openFocusStrategy.set("first");
        trigger.setIsOpen(true);
      } else {
        openFocusStrategy.set(undefined);
        trigger.toggle();
      }
    }
  };

  // The keys of `MenuTrigger`'s trigger props (`useMenuTrigger.ts:88-100`),
  // shared by `Dropdown.Trigger` and a Button placed in the root: ArrowDown
  // opens on the first row, ArrowUp on the last. The gate is the second
  // argument upstream and it differs per family: the plain arrows do nothing in
  // `longPress` mode (`open(trigger !== 'longPress', e, 'first')`), the Alt
  // arrows stay live in every mode, and the Alt forms of Return and Space open
  // only in `longPress` mode, on the first row (`open(trigger === 'longPress',
  // e, 'first')`) — in `press` mode upstream does nothing for those two, since
  // a plain Return already arrives as the trigger's press.
  const triggerKeyOpen = (
    strategy: "first" | "last",
    keys: "arrow" | "altArrow" | "activation" = "altArrow",
  ) => {
    if (keys === "arrow" && triggerMode() === "longPress") {
      return;
    }

    if (keys === "activation" && triggerMode() !== "longPress") {
      return;
    }

    openFocusStrategy.set(strategy);
    trigger.setIsOpen(true);
  };

  const contextValue: DropdownContextValue = {
    slots: dropdownVariants(),
    isOpen: trigger.isOpen,
    setIsOpen: trigger.setIsOpen,
    toggle: trigger.toggle,
    close: trigger.close,
    isDisabled: () => local.isDisabled ?? false,
    triggerMode,
    shouldCloseOnSelect: () => local.shouldCloseOnSelect,
    contextMenuPoint,
    setContextMenuPoint: (point) => contextMenuPoint.set(point),
    openFocusStrategy,
    setOpenFocusStrategy: (strategy) => openFocusStrategy.set(strategy),
  };

  const triggerLongPress = () => {
    if (triggerMode() === "longPress") {
      trigger.setIsOpen(true);
    }
  };

  const overlayContext = {
    ...trigger.context,
    triggerPress,
    triggerLongPress,
    triggerKeyOpen,
  };

  // `_common` exception: a component that provides a context reads
  // `props.children` once, inside the providers, at the placement. It is read
  // as the value it is, not through a helper that remaps the array: a remapped
  // children array is a snapshot, and the parts inside it stop reacting to
  // their own state (measured: the popover's branch never re-rendered).
  return (
    <DropdownContext.Provider value={contextValue}>
      <OverlayTriggerContext.Provider value={overlayContext}>
        {local.children}
      </OverlayTriggerContext.Provider>
    </DropdownContext.Provider>
  );
}
