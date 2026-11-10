import { context } from "nsh";

import type { ColorFieldState } from "./create-color-field-state";

/**
 * The field state, for anything inside a `ColorField.Root` that needs it.
 * React Aria Components provides the same value as `ColorFieldStateContext`
 * (`react-aria-components/src/ColorField.tsx`); the parts HeroUI exposes do not
 * read it — they get their input wiring from `ColorInputGroupFieldContext` —
 * but a caller's own child can, exactly as upstream.
 *
 * Internal path only: it is not exported from the package entry, as upstream
 * exports it from `react-aria-components` rather than from HeroUI.
 */
export const ColorFieldStateContext = context<ColorFieldState | null>(null);
