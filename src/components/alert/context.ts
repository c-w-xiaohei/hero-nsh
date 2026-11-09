import { context } from "nsh";
import type { Accessor } from "nsh";

import type { alertVariants } from "./alert.styles";

/**
 * The status dimension of Alert, as upstream's inline literal union.
 */
export type AlertStatus = "default" | "accent" | "success" | "warning" | "danger";

/**
 * What `Alert.Root` tells its four parts: the root instance's resolved slot
 * table, so every part reads its own slot from the same `tv()` result, and the
 * raw `status`, so `Alert.Indicator` can pick the default icon and the icon's
 * paint token.
 *
 * HeroUI's context is `{ slots?, status? }`, created with
 * `createContext<AlertContext>({})`; NSH has no React context, so the two
 * members are accessors and the default is the same empty object (D17). Every
 * member stays optional, which is what makes a part rendered outside an
 * `Alert` look exactly as it does upstream: no slot classes, only the caller's
 * `className`.
 *
 * The context is internal, as upstream's is: it is not exported from
 * `src/index.ts`.
 */
export interface AlertContextValue {
  /** The root instance's resolved variant table. */
  slots?: Accessor<ReturnType<typeof alertVariants>>;

  /** The raw status; `undefined` outside an Alert and means "default" inside. */
  status?: Accessor<AlertStatus | undefined>;
}

export const AlertContext = context<AlertContextValue>({});
