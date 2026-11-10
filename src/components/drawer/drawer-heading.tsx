import type { JSX, ViewProps, ViewRef } from "nsh";
import { computed, split, Text, View } from "nsh";

import { DrawerContext } from "./drawer-context";
import { drawerVariants } from "./drawer.styles";

export interface DrawerHeadingProps extends Omit<ViewProps, "children" | "class" | "ref"> {
  children?: JSX.Element;
  className?: string;
  slot?: string;
  level?: number;
  render?: unknown;
  ref?: (node: ViewRef) => void;
}

/** R-024: Drawer.Heading / DrawerHeading's title slot and heading level. */
export function DrawerHeading(props: DrawerHeadingProps): JSX.Element {
  const [local, rest] = split(props, ["children", "className", "slot", "level", "render", "ref"] as const);
  const context = DrawerContext();
  const slots = () => context?.slots() ?? drawerVariants();
  const classes = computed(() =>
    [slots().heading(), local.className].filter((part) => part !== undefined && part !== "").join(" "),
  );

  return (
    <View
      {...rest}
      ref={(node) => local.ref?.(node)}
      role="header"
      accessibilityLevel={local.level ?? 2}
      class={classes()}
    >
      {typeof local.children === "string" || typeof local.children === "number" ? (
        <Text>{local.children}</Text>
      ) : local.children}
    </View>
  );
}
