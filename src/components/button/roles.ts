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

/** Maps an ARIA role to the closest NSH role; `presentation` is ARIA's `none`. */
export function toAccessibilityRole(
  role: string | undefined,
  fallback: AccessibilityRole,
): AccessibilityRole {
  if (!role) {
    return fallback;
  }

  if (role === "presentation") {
    return "none";
  }

  return ACCESSIBILITY_ROLES.has(role) ? (role as AccessibilityRole) : fallback;
}
