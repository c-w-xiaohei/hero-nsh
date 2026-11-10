import type { JSX } from "nsh";
import { View } from "nsh";

import { renderChildren } from "./children";

/**
 * Puts a host tooltip on a part that is built on a `nsh/base` accordion
 * element.
 *
 * `nsh/base`'s `Accordion`, `AccordionItem` and `AccordionPanel` declare
 * `tooltip` (they extend `ComponentHostProps`) but drop it: a hint set on them
 * never appears, while the same hint on a core `View` shows after the host's
 * half-second delay (measured on the windows platform, headless and on the web
 * target; fixlog round 2). The hint therefore belongs to a box of this port's
 * own, drawn around the base element **only when the app gives a tooltip**: a
 * part without one has the base element's own tree, exactly as before.
 *
 * The value goes through `renderChildren`, because NSH draws no bare string
 * inside a view and `JSX.Element` includes `string` and `number`.
 */
export function withTooltip(
  tooltip: JSX.Element | undefined,
  node: JSX.Element,
): JSX.Element {
  if (tooltip === undefined || tooltip === null || tooltip === false) {
    return node;
  }

  return <View tooltip={renderChildren(tooltip)}>{node}</View>;
}
