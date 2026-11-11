import type { JSX, ScrollProps, ScrollRef } from "nsh";
import { computed, Scroll, split, Text } from "nsh";

import { DrawerDialogContext } from "./create-drawer-part-order";
import { DrawerContext } from "./drawer-context";
import { drawerBodyAfterHeaderClasses, drawerVariants } from "./drawer.styles";

export interface DrawerBodyProps extends Omit<ScrollProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  render?: unknown;
  ref?: (node: ScrollRef) => void;
}

/** R-025: Drawer.Body's content sizing and typography. R-043/R-044: native vertical scrolling replaces CSS overflow and touch-action. */
export function DrawerBody(props: DrawerBodyProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "render", "ref"] as const);
  const context = DrawerContext();
  const slots = () => context?.slots() ?? drawerVariants();

  // R-030: `.drawer__header + .drawer__body` -> `mt-2`, read once at
  // registration. A body written first, after a footer, or outside a Dialog
  // gets the slot's own zero vertical margin.
  const previous = DrawerDialogContext()?.register("body");
  const gap = previous === "header" ? drawerBodyAfterHeaderClasses : undefined;

  const classes = computed(() =>
    [slots().body(), local.className, gap].filter((part) => part !== undefined && part !== "").join(" "),
  );

  return (
    <Scroll {...rest} ref={(node) => local.ref?.(node)} class={classes()} horizontal={false}>
      {typeof local.children === "string" || typeof local.children === "number" ? (
        <Text>{local.children}</Text>
      ) : local.children}
    </Scroll>
  );
}
