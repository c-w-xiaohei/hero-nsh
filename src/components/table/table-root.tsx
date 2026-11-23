import type { JSX, StyleProp, ViewProps, ViewRef, ViewStyle } from "nsh";
import { computed, split, View } from "nsh";

import { createDensity, createInput } from "../../primitives/environment";
import { densityKey } from "../../tokens/density";
import { TableContext } from "./table-context";
import { tableVariants, type TableVariants } from "./table.styles";

export interface TableRootProps
  extends Omit<ViewProps, "children" | "class" | "style" | "ref"> {
  children?: JSX.Element;
  className?: string;
  style?: StyleProp<ViewStyle>;

  /** `"primary"` (the default) or `"secondary"` (§1, one dimension only). */
  variant?: TableVariants["variant"];

  /**
   * The table's layout direction, HeroUI's `dir`. NSH inherits `direction` from
   * the root view, and the same value reaches `ColumnResizer`'s
   * `resizableDirection` render value through `TableContext`.
   */
  dir?: "ltr" | "rtl";

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
 * variant. R-001 and R-004 are the base and variant classes in
 * `table.styles.ts`.
 */
export function TableRoot(props: TableRootProps) {
  const [local, rest] = split(props, [
    "children",
    "className",
    "style",
    "ref",
    "id",
    "variant",
    "dir",
    "render",
    "onLayout",
  ] as const);

  const variant = computed<"primary" | "secondary">(() => local.variant ?? "primary");
  // A-001: the environment's `input`/`density` accessors feed the two new
  // axes next to `variant` — the default environment resolves
  // `pointer`/`default`, which reproduces the port's classes verbatim.
  const input = createInput();
  const envDensity = createDensity();
  const slots = computed(() =>
    tableVariants({ variant: variant(), input: input(), density: densityKey(envDensity()) }),
  );
  const direction = computed(() => local.dir);

  return (
    <TableContext.Provider value={{ variant, slots, direction }}>
      <View
        {...(rest as any)}
        ref={(node) => local.ref?.(node)}
        nativeID={local.id ?? (rest as any).nativeID}
        onLayout={local.onLayout}
        class={[slots().base(), local.className].filter(Boolean).join(" ")}
        style={[direction() ? { direction: direction() } : undefined, local.style]}
      >
        {local.children}
      </View>
    </TableContext.Provider>
  );
}
