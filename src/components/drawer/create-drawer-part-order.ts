import { cleanup, context } from "nsh";

/**
 * The parts whose adjacency carries a margin in HeroUI's CSS:
 * `.drawer__header + .drawer__body` (R-030), `.drawer__header + .drawer__footer`
 * (R-031) and `.drawer__body + .drawer__footer` (R-032).
 */
export type DrawerDialogPart = "body" | "footer" | "header";

/**
 * The registration table `Drawer.Dialog` gives its subtree. NSH has no
 * adjacent-sibling selector and no way for a parent to walk its children, so
 * each of the three parts registers itself where it is written and learns
 * which part came before it (port sheet §4 R-030–R-032, research 4.2).
 *
 * `Handle` and `CloseTrigger` are not in the table: both slots sit above the
 * text parts in every HeroUI example, and the port sheet records the
 * adjacency difference for parts that a caller interposes.
 */
export interface DrawerPartOrder {
  /**
   * Registers a part and returns the part registered immediately before it,
   * `undefined` for the first one. The registration is removed when the part
   * unmounts.
   */
  register: (part: DrawerDialogPart) => DrawerDialogPart | undefined;
}

/** The context `Drawer.Dialog` provides; `null` outside one. */
export const DrawerDialogContext = context<DrawerPartOrder | null>(null);

/**
 * A fresh order table. Static children register in the order they are
 * written; a part that appears only conditionally registers when it mounts,
 * which is why the returned "previous" is read once at registration.
 */
export function createDrawerPartOrder(): DrawerPartOrder {
  const parts: DrawerDialogPart[] = [];

  return {
    register(part) {
      const previous = parts.length === 0 ? undefined : parts[parts.length - 1];

      parts.push(part);
      cleanup(() => {
        const index = parts.lastIndexOf(part);

        if (index >= 0) {
          parts.splice(index, 1);
        }
      });

      return previous;
    },
  };
}
