import { context } from "nsh";
import type { Accessor } from "nsh";

import type { CardVariants } from "./card.styles";

/**
 * What `Card.Root` tells its five parts.
 *
 * Upstream the value is `{ slots?: ReturnType<typeof cardVariants> }`, created
 * with `createContext<CardContext>({})`: the root builds the table once and
 * every part reads its own slot function from it. NSH has no React context, so
 * the value carries the dimensions instead and each part resolves its own
 * slot through `cardVariants` (D17; port sheet R-020).
 *
 * `variant` and `density` are accessors, and staying optional is what makes a
 * part rendered outside a `Card` look exactly as it does upstream: no slot
 * class at all, only the caller's `className`. A part reads only the
 * dimensions its slot keys on (adapt sheet A-002).
 *
 * The context is internal, as upstream's is: `CardContext` is not exported
 * from the component's entry.
 */
export interface CardContextValue {
  /** The root's variant dimension; `undefined` outside a Card. */
  variant?: Accessor<CardVariants["variant"]>;

  /** The mounted density preset; `undefined` outside a Card. */
  density?: Accessor<CardVariants["density"]>;
}

export const CardContext = context<CardContextValue>({});
