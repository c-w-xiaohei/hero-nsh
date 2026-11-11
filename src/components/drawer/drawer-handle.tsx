import type { JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, View } from "nsh";
import { DrawerContext } from "./drawer-context";
import { drawerVariants, type DrawerSlots } from "./drawer.styles";

export interface DrawerHandleProps extends Omit<ViewProps, "children" | "class" | "ref"> { children?: JSX.Element; className?: string; render?: unknown; ref?: (node: ViewRef) => void; }

export function DrawerHandle(props: DrawerHandleProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "render", "ref"] as const);
  const context = DrawerContext();
  const slots = (): DrawerSlots => context?.slots() ?? drawerVariants();

  // R-027: center the decorative handle and use top placement's zero bottom padding.
  const classes = computed(() => {
    const base = slots().handle();
    return [context?.placement() === "top" ? `${base} pb-0` : base, local.className]
      .filter(Boolean).join(" ");
  });

  return (
    <View
      {...rest}
      accessibilityElementsHidden={true}
      class={classes()}
      ref={(node) => local.ref?.(node)}
    >
      {/* R-028, R-045: real bar replaces the upstream child-selector styling. */}
      <View class="h-1 w-9 rounded-xs bg-separator" />
    </View>
  );
}
