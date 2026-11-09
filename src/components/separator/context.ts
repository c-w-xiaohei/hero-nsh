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
   * The classes a container root would otherwise apply to the Separator
   * through a descendant selector (`h-1/2 self-center` inside a vertical
   * toolbar, `w-1/2 justify-self-center` inside a horizontal one).
   */
  partClass?: () => string | undefined;
}

export const SeparatorContext = context<SeparatorContextValue | undefined>(undefined);
