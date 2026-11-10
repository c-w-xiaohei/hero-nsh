import { context } from "nsh";

/**
 * What a container root tells the Separators inside it.
 *
 * HeroUI reaches the same thing through CSS descendant selectors: `.toolbar
 * .separator--vertical { @apply h-1/2 self-center; }` and `.toolbar
 * .separator--horizontal { @apply w-1/2 justify-self-center; }` (port sheet §5).
 * NSH has no descendant selectors and a parent cannot see its children's types,
 * so the container hands the extra classes down through this context instead.
 *
 * The shape matches Description's `partClass`: the container decides the
 * classes, and the part only appends them after its own variant classes.
 * Rendering a Separator outside such a container leaves the context undefined
 * and changes nothing.
 *
 * Internal only: not part of the public entry (`src/index.ts`), so the public
 * API stays identical to HeroUI's. Toolbar imports this file by path.
 */
export interface SeparatorContextValue {
  /**
   * The orientation the container wants its Separators to take, when the
   * Separator itself sets none. A Toolbar runs its separators across its own
   * axis, so a horizontal toolbar provides `"vertical"` (upstream writes the
   * opposite axis into React Aria's `SeparatorContext`). Undefined means the
   * container has no opinion and the Separator keeps its own default.
   */
  orientation?: () => "horizontal" | "vertical";

  /**
   * The classes a container root would otherwise apply to the Separator
   * through a descendant selector (`h-1/2 self-center` inside a vertical
   * toolbar, `w-1/2 justify-self-center` inside a horizontal one). It receives
   * the orientation the Separator resolved — its own prop, or the one this
   * context provided — because the two descendant blocks upstream select on
   * exactly that class.
   */
  partClass?: (orientation: "horizontal" | "vertical") => string | undefined;
}

export const SeparatorContext = context<SeparatorContextValue | undefined>(undefined);
