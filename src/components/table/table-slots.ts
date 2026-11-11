import type { Accessor } from "nsh";
import { computed } from "nsh";

import { TableContext } from "./table-context";
import { tableVariants } from "./table.styles";

/**
 * The slot classes of the table around this part. A part used outside a
 * `Table.Root` still renders (HeroUI's wrappers read `{}` from their context
 * and lose the classes), so the primary variant is the fallback.
 */
export function useTableSlots(): Accessor<ReturnType<typeof tableVariants>> {
  const table = TableContext();

  if (!table) {
    return () => tableVariants({ variant: "primary" });
  }

  return computed(() => table.slots());
}

/** The variant of the table around this part (`"primary"` outside a Root). */
export function useTableVariant(): Accessor<"primary" | "secondary"> {
  const table = TableContext();

  return computed(() => table?.variant() ?? "primary");
}
