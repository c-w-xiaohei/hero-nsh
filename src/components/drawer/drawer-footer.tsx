import type { JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, Text, View } from "nsh";
import { DrawerContext } from "./drawer-context";
import { drawerVariants, type DrawerSlots } from "./drawer.styles";

export interface DrawerFooterProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; render?: unknown; ref?: (node: ViewRef) => void; }

export function DrawerFooter(props: DrawerFooterProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "render", "ref"] as const);
  const context = DrawerContext();
  const slots = (): DrawerSlots => context?.slots() ?? drawerVariants();
  const classes = computed(() => [slots().footer(), local.className].filter(Boolean).join(" "));

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
