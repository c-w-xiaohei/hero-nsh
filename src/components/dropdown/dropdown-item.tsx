import type { MouseEvent as NshMouseEvent, ViewRef } from "nsh";
import { cleanup } from "nsh";

import { MenuContext } from "../menu/menu-context";
import {
  MenuItemRoot,
  type MenuItemRenderProps,
  type MenuItemRootProps,
} from "../menu/menu-item";
import { DropdownPopoverContext, DropdownSubmenuRowContext } from "./dropdown-context";

/* -------------------------------------------------------------------------------------------------
 * Item
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Dropdown.Item` / `DropdownItem`: HeroUI passes
 * `MenuItemRoot`'s props straight through (`dropdown.tsx`: `DropdownItem` is a
 * `MenuItemRoot` with no extra styling of its own).
 */
export interface DropdownItemProps<T = unknown> extends MenuItemRootProps<T> {}

/**
 * Dropdown.Item / DropdownItem: Menu's row with `.dropdown__popover
 * [data-slot="menu-item"]`'s `px-2.5` (R-032) and — as the trigger item of a
 * `Dropdown.SubmenuTrigger` — the submenu wiring React Aria injects through
 * `MenuItemContext` (the trigger's `aria-haspopup` / `aria-expanded`, the
 * anchor, the hover timing and the open/close entries).
 *
 * Only the trigger row reads `DropdownSubmenuRowContext`: a `Menu` replaces
 * that context for the rows it holds (`Menu.tsx:384`), so a row inside the
 * submenu is a plain `menuitem` that acts on press, as upstream.
 */
export function DropdownItem<T>(props: DropdownItemProps<T>) {
  const submenu = DropdownSubmenuRowContext();
  const popover = DropdownPopoverContext();
  const menu = MenuContext();

  // R-032: `.dropdown__popover [data-slot="menu-item"]` → `px-2.5`, before the
  // caller's classes so theirs still win.
  const className = (values: MenuItemRenderProps) => {
    const value = props.className;
    const resolved = typeof value === "function" ? value(values) : value;

    return ["px-2.5", resolved ?? ""]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");
  };

  let unregisterRow: (() => void) | undefined;

  const handleRef = (next: ViewRef) => {
    unregisterRow?.();
    unregisterRow = undefined;

    if (submenu) {
      // The row is the submenu's anchor. Coming back from the submenu means
      // restoring the parent menu's focus; the virtual focus never left this
      // row, so focusing the menu root is the whole move.
      unregisterRow = submenu.registerRow({
        ref: next,
        focus: () => menu?.focusRoot(),
      });
    }

    props.ref?.(next);
  };

  const handleMouseEnter = (event: NshMouseEvent) => {
    props.onMouseEnter?.(event);
    submenu?.rowEnter();
  };

  const handleMouseLeave = (event: NshMouseEvent) => {
    props.onMouseLeave?.(event);
    submenu?.rowLeave();
  };

  if (submenu) {
    cleanup(() => unregisterRow?.());
  }

  // ArrowLeft on this row closes its submenu, and only an open one counts:
  // a closed submenu lets the key fall through to the collection
  // (`useSubmenuTrigger.ts:188-210`).
  const closeSubmenu = () => {
    if (!submenu?.isOpen()) {
      return false;
    }

    submenu.closeSubmenu();

    return true;
  };

  return (
    <MenuItemRoot
      {...props}
      ref={handleRef}
      className={className}
      aria-haspopup={submenu ? "menu" : props["aria-haspopup"]}
      aria-expanded={submenu ? submenu.isOpen() : props["aria-expanded"]}
      openSubmenu={
        submenu ? (focusFirst?: boolean) => submenu.openSubmenu(focusFirst) : props.openSubmenu
      }
      closeSubmenu={submenu ? closeSubmenu : props.closeSubmenu}
      onAction={() => {
        // A press that reaches a row during the 100ms exit hold must not act:
        // upstream's `pointer-events: none` blocks it at the pointer, which the
        // NSH test harness cannot observe, so the row refuses the action too.
        if (!popover || popover.isOpen()) {
          props.onAction?.();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
}
