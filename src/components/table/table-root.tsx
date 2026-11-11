import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { TableContext } from "./table-context";
import { tableVariants, type TableVariants } from "./table.styles";

export interface TableRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;

  /** `"primary"` (the default) or `"secondary"` (§1, one dimension only). */
  variant?: TableVariants["variant"];

  /** Only the callback form: an undefined ref is a ref store (§_common). */
  ref?: (node: ViewRef) => void;

  /** Upstream a DOM id; here the view's `nativeID`. */
  id?: string;

  /** Replaces the host element upstream: accepted, no effect (§8). */
  render?: unknown;
}

/**
 * `Table.Root` / `TableRoot`: HeroUI's `Table` root, a `div` with the variant's
 * slot classes. It owns the slots and nothing else (`Table.Content` owns the
 * state, port sheet §2); the provider is what lets the parts below read the
 * variant.
 */
export function TableRoot(props: TableRootProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "variant",
    "render",
    "onLayout",
  ] as const);

  const variant = computed<"primary" | "secondary">(() => local.variant ?? "primary");
  const slots = computed(() => tableVariants({ variant: variant() }));

  return (
    <TableContext.Provider value={{ variant, slots }}>
      <View
        {...(rest as any)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id}
        onLayout={local.onLayout}
        class={[slots().base(), local.className].filter(Boolean).join(" ")}
        style={local.style}
      >
        {local.children}
      </View>
    </TableContext.Provider>
  );
}
