import { Text } from "nsh";
import type { JSX } from "nsh";

/**
 * Upstream every Alert part is a DOM element, so `title` is that element's
 * native attribute: the browser's hover hint. NSH has no `title`, so it feeds
 * `tooltip` (the visible hint) and `accessibilityHint`, as `Kbd` and `Badge`
 * do (port sheet §8).
 *
 * Both helpers take the already-read value, so the caller keeps the prop read
 * in one tracked place.
 */
export function titleText(title: string | undefined): string | undefined {
  return title !== undefined && title.length > 0 ? title : undefined;
}

export function titleTooltip(title: string | undefined): JSX.Element | undefined {
  const text = titleText(title);

  return text === undefined ? undefined : <Text>{text}</Text>;
}
