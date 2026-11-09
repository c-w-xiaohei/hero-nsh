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

/** The color token names of theme/hero-nsh.theme.json (its theme, light and dark sets). */
export type ThemeColorToken =
  | "accent"
  | "accent-foreground"
  | "accent-hover"
  | "accent-soft"
  | "accent-soft-foreground"
  | "accent-soft-hover"
  | "backdrop"
  | "background"
  | "background-inverse"
  | "background-secondary"
  | "background-tertiary"
  | "black"
  | "border"
  | "border-secondary"
  | "border-tertiary"
  | "danger"
  | "danger-foreground"
  | "danger-hover"
  | "danger-soft"
  | "danger-soft-foreground"
  | "danger-soft-hover"
  | "default"
  | "default-foreground"
  | "default-hover"
  | "default-soft"
  | "default-soft-foreground"
  | "default-soft-hover"
  | "eclipse"
  | "field"
  | "field-background"
  | "field-border"
  | "field-border-focus"
  | "field-border-hover"
  | "field-focus"
  | "field-foreground"
  | "field-hover"
  | "field-placeholder"
  | "field-radius"
  | "focus"
  | "font-sans"
  | "foreground"
  | "link"
  | "muted"
  | "overlay"
  | "overlay-foreground"
  | "radius"
  | "scrollbar"
  | "scrollbar-thumb"
  | "scrollbar-track"
  | "segment"
  | "segment-foreground"
  | "separator"
  | "separator-secondary"
  | "separator-tertiary"
  | "snow"
  | "success"
  | "success-foreground"
  | "success-hover"
  | "success-soft"
  | "success-soft-foreground"
  | "success-soft-hover"
  | "surface"
  | "surface-foreground"
  | "surface-hover"
  | "surface-secondary"
  | "surface-secondary-foreground"
  | "surface-tertiary"
  | "surface-tertiary-foreground"
  | "warning"
  | "warning-foreground"
  | "warning-hover"
  | "warning-soft"
  | "warning-soft-foreground"
  | "warning-soft-hover"
  | "white";

/**
 * The color of the theme token `name`, as `#rrggbbaa`. A consumer's default
 * theme lacks these names, so the lookup is asserted to the consumer's token
 * set; the value still comes from `token()`, which is reactive.
 */
export function themeToken(name: ThemeColorToken): string {
  return token(name as keyof Tokens) as string;
}
