import type { ViewRef } from "nsh";
import { cleanup, signal } from "nsh";

import {
  MenuRoot,
  type MenuRenderProps,
  type MenuRootProps,
} from "../menu/menu-root";
import {
  DropdownContext,
  DropdownPopoverContext,
  DropdownSubmenuLayerContext,
  DropdownSubmenuRowContext,
} from "./dropdown-context";
import { dropdownVariants } from "./dropdown.styles";

/* -------------------------------------------------------------------------------------------------
 * Menu
 * -----------------------------------------------------------------------------------------------*/

/**
 * The props of `Dropdown.Menu` / `DropdownMenu`: React Aria Components'
 * `Menu`, unchanged. The rows are caller-written `Dropdown.Item`s, so the
 * collection semantics come from Menu; this part only narrows the padding and
 * wires the close channel to the dropdown.
 */
export interface DropdownMenuProps<T = unknown> extends MenuRootProps<T> {}

/**
 * Dropdown.Menu / DropdownMenu: RAC's `Menu` with `.dropdown__menu`'s padding
 * (`p-1.5` over Menu's `p-1`) and its `gap-0.5`, the root dropdown's close
 * channel, the submenu keyboard exits and the open focus strategy. It also
 * registers itself as its popover's focus target.
 */
export function DropdownMenu<T>(props: DropdownMenuProps<T>) {
  const dropdown = DropdownContext();
  const popover = DropdownPopoverContext();
  const submenu = DropdownSubmenuLayerContext();

  const slots = dropdown?.slots ?? dropdownVariants();

  // R-034: `.dropdown__menu [data-slot="separator"]` is the same rule MenuRoot
  // already hands every Separator (`ms-[3%] w-[94%]`), so this part adds no
  // second registration.

  const menuNode = signal<ViewRef | undefined>(undefined);

  const unregisterFocus = popover?.registerMenuFocus(() => menuNode()?.focus());

  if (unregisterFocus) {
    cleanup(unregisterFocus);
  }

  // R-031 / R-033: the slot's classes come after Menu's own base classes, so
  // `p-1.5` wins over `.menu`'s `p-1`; the caller's classes still come last.
  const className = (values: MenuRenderProps) => {
    const value = props.className;
    const resolved = typeof value === "function" ? value(values) : value;

    return [slots.menu(), resolved ?? ""]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" ");
  };

  // React Aria's close rule: the menu's `onClose` is the root dropdown's close
  // (`react-aria-components/src/Menu.tsx`: `props.onClose || triggerState?.close`),
  // even for a menu inside a submenu. An explicit `onClose` replaces it.
  const onClose = () => {
    if (props.onClose) {
      props.onClose();

      return;
    }

    dropdown?.close();
  };

  // The first change of port sheet §5: ArrowLeft. Inside a submenu it closes
  // that submenu and puts the virtual focus back on its trigger row; at the
  // top level it has no submenu of its own, so the collection keeps the key.
  const onArrowLeft = submenu ? () => submenu.closeAndFocusRow() : undefined;

  const handleFocus = () => {
    popover?.markMenuFocused();
    props.onFocus?.();
  };

  // React Aria's `MenuTrigger` hands the open's focus strategy to the Menu
  // (`autoFocus: state.focusStrategy || true`, `Menu.tsx:161`): a keyboard
  // open focuses the first or last row, a pointer open focuses the menu root
  // alone. A submenu opened by the keyboard does the same; one opened by hover
  // or press leaves the focus on the trigger row.
  const focusFirstItemOnFocus = (): boolean | "first" | "last" => {
    if (submenu) {
      return submenu.focusOnOpen() ? "first" : false;
    }

    if (dropdown) {
      return dropdown.openFocusStrategy() ?? false;
    }

    return props.autoFocus !== undefined && props.autoFocus !== false;
  };

  return (
    // Upstream every `Menu` replaces `MenuItemContext` for its own rows
    // (`Menu.tsx:384`, `:493`), so the rows of a submenu are plain menuitems,
    // not submenu triggers in turn. The row context is the same channel here;
    // the layer context is a second provider and stays visible below.
    <DropdownSubmenuRowContext.Provider value={undefined}>
      <MenuRoot
        {...props}
        ref={(node) => {
          menuNode.set(node);
          props.ref?.(node);
        }}
        className={className}
        shouldCloseOnSelect={
          props.shouldCloseOnSelect ?? dropdown?.shouldCloseOnSelect()
        }
        focusFirstItemOnFocus={focusFirstItemOnFocus()}
        // The popover keeps the collection mounted while its layer is closed,
        // so the next open must start from its strategy instead of the row the
        // last one left behind (upstream unmounts the closed Menu).
        resetFocusKeyWhen={() => (popover ? !popover.isOpen() : false)}
        autoFocus={
          props.autoFocus && popover ? popover.isOpen() : props.autoFocus
        }
        onClose={onClose}
        onAction={(key) => {
          // Only the action channel needs the guard: React Aria's pointer-events
          // already keeps the exiting layer inert on a real host, and the menu's
          // action callback is what a press during the hold must not reach.
          if (!popover || popover.isOpen()) {
            props.onAction?.(key);
          }
        }}
        onArrowLeft={onArrowLeft}
        onFocus={handleFocus}
      />
    </DropdownSubmenuRowContext.Provider>
  );
}
