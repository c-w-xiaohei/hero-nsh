import { cleanup, context } from "nsh";

/**
 * The parts whose adjacency carries a margin in HeroUI's CSS:
 * `.modal__header + .modal__body` (R-058), `.modal__header + .modal__footer`
 * (R-059) and `.modal__body + .modal__footer` (R-060).
 */
export type ModalDialogPart = "body" | "footer" | "header";

/**
 * The registration table `Modal.Dialog` gives its subtree. NSH has no
 * adjacent-sibling selector and no way for a parent to walk its children, so
 * each of the three parts registers itself where it is written and learns
 * which part came before it (port sheet §2, research 4.2).
 */
export interface ModalPartOrder {
  /**
   * Registers a part and returns the part registered immediately before it,
   * `undefined` for the first one. The registration is removed when the part
   * unmounts.
   */
  register: (part: ModalDialogPart) => ModalDialogPart | undefined;
}

/** The context `Modal.Dialog` provides; `null` outside one. */
export const ModalDialogContext = context<ModalPartOrder | null>(null);

/**
 * A fresh order table. Static children register in the order they are
 * written; a part that appears only conditionally registers when it mounts,
 * which is why the returned "previous" is read once at registration.
 */
export function createModalPartOrder(): ModalPartOrder {
  const parts: ModalDialogPart[] = [];

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
