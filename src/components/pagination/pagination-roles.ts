import type { AccessibilityRole } from "nsh";

const ACCESSIBILITY_ROLES: ReadonlySet<string> = new Set<AccessibilityRole>([
  "none",
  "button",
  "link",
  "search",
  "image",
  "imagebutton",
  "keyboardkey",
  "text",
  "adjustable",
  "header",
  "summary",
  "alert",
  "checkbox",
  "combobox",
  "menu",
  "menubar",
  "menuitem",
  "progressbar",
  "radio",
  "radiogroup",
  "scrollbar",
  "spinbutton",
  "switch",
  "tab",
  "tablist",
  "timer",
  "toolbar",
  "list",
  "grid",
  "table",
  "row",
  "cell",
  "columnheader",
  "rowgroup",
  "listbox",
  "option",
  "group",
  "region",
  "navigation",
  "tree",
  "treeitem",
  "menuitemcheckbox",
  "menuitemradio",
]);

/**
 * Maps an ARIA role to the closest NSH role; `presentation` is ARIA's `none`.
 *
 * Local copy of `src/components/button/roles.ts`: the root `View` takes an
 * `AccessibilityRole`, while HeroUI's `role` prop is React's `AriaRole`
 * string, so an outside value falls back to the component's own role instead
 * of reaching the host as an unknown role.
 */
export function toAccessibilityRole(
  role: string | undefined,
  fallback: AccessibilityRole,
): AccessibilityRole {
  return toOptionalAccessibilityRole(role) ?? fallback;
}

/**
 * The same mapping without a fallback, for the parts whose upstream element
 * carries no role of its own (`<li>`'s implicit `listitem` has no NSH
 * counterpart, so `Pagination.Item` reports none unless the caller names one).
 */
export function toOptionalAccessibilityRole(
  role: string | undefined,
): AccessibilityRole | undefined {
  if (!role) {
    return undefined;
  }

  if (role === "presentation") {
    return "none";
  }

  return ACCESSIBILITY_ROLES.has(role) ? (role as AccessibilityRole) : undefined;
}
