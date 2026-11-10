import type { StyleProp, ViewStyle } from "nsh";

import type { ToastRenderValues } from "./children";

/**
 * Joins class strings in order, dropping empty ones.
 *
 * HeroUI's `composeSlotClassName` puts the slot class first and the caller's
 * `className` after it; NSH's "later wins" rule then gives the caller the last
 * say on any property it restates.
 *
 * Local copy of `src/components/alert/class-names.ts`; port sheet §5 proposes
 * lifting it into `src/primitives/class-names.ts` and this unit keeps its own
 * copy until that lands.
 */
export function joinClassNames(...parts: (string | false | null | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ");
}

/**
 * `className` as upstream accepts it: a string, or a function called once per
 * evaluation with the toast (on a toast) and the computed default classes. The
 * caller's string is appended after the slot classes.
 */
export function resolveClassName(
  value: string | ((values: ToastRenderValues) => string) | undefined,
  values: ToastRenderValues,
): string {
  const className = typeof value === "function" ? value(values) : value;

  return joinClassNames(values.defaultClassName, className);
}

/** `style` as upstream accepts it: NSH style keys, or a function of the same render values. */
export function resolveStyle(
  value: StyleProp<ViewStyle> | ((values: ToastRenderValues) => StyleProp<ViewStyle>) | undefined,
  values: ToastRenderValues,
): StyleProp<ViewStyle> {
  return typeof value === "function" ? value(values) : value;
}
