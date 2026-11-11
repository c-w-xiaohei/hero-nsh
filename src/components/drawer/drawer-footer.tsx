import type { JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, Text, View } from "nsh";
import { DrawerDialogContext } from "./create-drawer-part-order";
import { DrawerContext } from "./drawer-context";
import {
  drawerFooterAfterBodyClasses,
  drawerFooterAfterHeaderClasses,
  drawerVariants,
  type DrawerSlots,
} from "./drawer.styles";

export interface DrawerFooterProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; render?: unknown; ref?: (node: ViewRef) => void; }

export function DrawerFooter(props: DrawerFooterProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "render", "ref"] as const);
  const context = DrawerContext();
  const slots = (): DrawerSlots => context?.slots() ?? drawerVariants();

  // R-031 / R-032: `.drawer__header + .drawer__footer` and
  // `.drawer__body + .drawer__footer` both land on `mt-5`, read from the
  // Dialog's registration table. The slot itself keeps `mt-0`, so a footer
  // written first, after another footer, or outside a Dialog has no gap.
  const previous = DrawerDialogContext()?.register("footer");

  const gap =
    previous === "header"
      ? drawerFooterAfterHeaderClasses
      : previous === "body"
        ? drawerFooterAfterBodyClasses
        : undefined;

  const classes = computed(() => [slots().footer(), local.className, gap].filter(Boolean).join(" "));

  // R-026: `.drawer__footer` actions are laid out in a right-aligned row.
  return (
    <View
      {...rest}
      class={classes()}
      ref={(node) => local.ref?.(node)}
    >
      {typeof local.children === "string" || typeof local.children === "number" ? (
        <Text>{local.children}</Text>
      ) : local.children}
    </View>
  );
}
