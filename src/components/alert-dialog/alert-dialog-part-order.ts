import { cleanup, context } from "nsh";

/**
 * The parts whose adjacency carries a margin in HeroUI's CSS:
 * `.alert-dialog__header + .alert-dialog__body` (R-064),
 * `.alert-dialog__header + .alert-dialog__footer` (R-065) and
 * `.alert-dialog__body + .alert-dialog__footer` (R-066).
 */
export type AlertDialogDialogPart = "body" | "footer" | "header";

/**
 * The registration table `AlertDialog.Dialog` gives its subtree. NSH has no
 * adjacent-sibling selector and no way for a parent to walk its children, so
 * each of the three parts registers itself where it is written and learns
 * which part came before it (port sheet §2, research 4.2).
 */
export interface AlertDialogPartOrder {
  /**
   * Registers a part and returns the part registered immediately before it,
   * `undefined` for the first one. The registration is removed when the part
   * unmounts.
   */
  register: (part: AlertDialogDialogPart) => AlertDialogDialogPart | undefined;
}

/** The context `AlertDialog.Dialog` provides; `null` outside one. */
export const AlertDialogDialogContext = context<AlertDialogPartOrder | null>(null);

/**
 * A fresh order table. Static children register in the order they are written;
 * a part that appears only conditionally registers when it mounts, which is why
 * the returned "previous" is read once at registration.
 */
export function createAlertDialogPartOrder(): AlertDialogPartOrder {
  const parts: AlertDialogDialogPart[] = [];

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
