import type { JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, Text, View } from "nsh";

import { DrawerDialogContext } from "./create-drawer-part-order";
import { DrawerContext } from "./drawer-context";
import { drawerVariants } from "./drawer.styles";

export interface DrawerHeaderProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  render?: unknown;
  ref?: (node: ViewRef) => void;
}

/** R-023: Drawer.Header's flex-column slot and caller classes. */
export function DrawerHeader(props: DrawerHeaderProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "render", "ref"] as const);
  const context = DrawerContext();
  const slots = () => context?.slots() ?? drawerVariants();

  // R-030 / R-031: Body and Footer written after this header read the entry.
  DrawerDialogContext()?.register("header");

  const classes = computed(() =>
    [slots().header(), local.className].filter((part) => part !== undefined && part !== "").join(" "),
  );

  return (
    <View {...rest} ref={(node) => local.ref?.(node)} class={classes()}>
      {typeof local.children === "string" || typeof local.children === "number" ? (
        <Text>{local.children}</Text>
      ) : local.children}
    </View>
  );
}
