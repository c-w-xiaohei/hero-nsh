import { context, type Accessor } from "nsh";

import type { SurfaceVariants } from "./surface.styles";

/**
 * What a Surface hands the components under it.
 *
 * Upstream the value is `{ variant?: SurfaceVariants["variant"] }`, created
 * with `createContext<SurfaceContext>({})` in `surface.tsx`, and the docs teach
 * consumers to read it as `const { variant } = useContext(SurfaceContext)`.
 * NSH has no DOM and no React context, so the value is an accessor object
 * (D17): `const variant = SurfaceContext().variant; variant?.()`. Every member
 * stays optional so a component rendered outside a Surface reads it the same
 * way it reads upstream's `{}` default.
 */
export interface SurfaceContextValue {
  variant?: Accessor<SurfaceVariants["variant"]>;
}

/**
 * The context constant HeroUI exports, with the same empty-object default:
 * outside a Surface a consumer gets `{}` and every member is `undefined`.
 */
export const SurfaceContext = context<SurfaceContextValue>({});
