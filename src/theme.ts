/*
 * The color tokens of the theme this package ships as `theme/hero-nsh.theme.json`.
 *
 * `token()` is typed against the consuming app's own `Tokens`, so a consumer
 * that does not install our theme.json has no "link", "default-foreground" or
 * "success" in `keyof Tokens` and calling `token("link")` does not type-check.
 * Every color lookup in `src` goes through `themeToken`, which keeps our token
 * names checked here and still reads the token reactively at the call site.
 */

import { token } from "nsh";
import type { Tokens } from "nsh";

/** The color token names used by the components. */
export type ThemeColorToken =
  | "accent"
  | "danger"
  | "default"
  | "default-foreground"
  | "foreground"
  | "link"
  | "success"
  | "warning";

/**
 * The color of the theme token `name`, as `#rrggbbaa`. A consumer's default
 * theme lacks these names, so the lookup is asserted to the consumer's token
 * set; the value still comes from `token()`, which is reactive.
 */
export function themeToken(name: ThemeColorToken): string {
  return token(name as keyof Tokens) as string;
}
