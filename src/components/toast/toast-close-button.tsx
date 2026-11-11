import type { JSX, PressEvent } from "nsh";
import { computed } from "nsh";

import { CloseButtonRoot } from "../close-button/close-button-root";
import type {
  CloseButtonRenderProps,
  CloseButtonRootProps,
} from "../close-button/close-button-root";
import { joinClassNames } from "./class-names";
import { isToastControlReachable, ToastContext, ToastItemContext } from "./toast-context";
import { toastVariants } from "./toast.styles";

/**
 * The props of `Toast.CloseButton` (= `ToastCloseButton`): HeroUI 3.2.7's
 * `ComponentPropsWithRef<typeof CloseButton>` — every HeroUI `CloseButton`
 * prop (`children`, `className`, `aria-label`, `onPress`, …). Its default
 * accessible label is `"Close"` upstream and in the ported CloseButton.
 */
export interface ToastCloseButtonProps extends CloseButtonRootProps {}

/**
 * `Toast.CloseButton` / `ToastCloseButton`: the dismiss control of a toast,
 * rendered by the merged `CloseButton` (port sheet §1 row `Toast.CloseButton`,
 * §5). The close slot carries R-042's box, R-043's transition and R-045's
 * hover colour; the reveal / hide pairs come from the single toast's context,
 * because NSH cannot write the descendant selectors they replace.
 */
export function ToastCloseButton(props: ToastCloseButtonProps): JSX.Element {
  const region = ToastContext();
  const item = ToastItemContext();

  // R-042 / R-043 / R-045: `.toast__close-button` → `pointer-events-none
  // absolute -end-1 -top-1 size-5 p-0 border-border bg-default opacity-0
  // sm:border sm:bg-overlay transition-opacity duration-150 ease-smooth
  // motion-reduce:transition-none hover:bg-default`, from the `close` slot of
  // `toast.styles.ts`; outside a provider the table's defaults stand.
  const slots = () => region.slots?.() ?? toastVariants();

  // R-046: the four hover / hovered reveal selectors collapse into the toast
  // root's `group`: `.toast[data-frontmost="true"]:hover …` and
  // `.toast[data-expanded="true"]:hover …` → `group-hover:pointer-events-auto
  // group-hover:opacity-100` while this toast is frontmost or the stack is
  // expanded. Upstream never reveals it while exiting.
  const isRevealed = computed(
    () =>
      (item.isFrontmost?.() === true || item.isExpanded?.() === true) &&
      item.isExiting?.() !== true,
  );

  // R-026: a collapsed non-front toast hides the close button; R-047: an
  // exiting toast always hides it. The `data-exiting` rule is later upstream,
  // so it wins over the reveal — hence the hide pair is appended last and the
  // reveal pair is dropped entirely once the toast exits.
  const isForcedHidden = computed(
    () => item.contentHidden?.() === true || item.isExiting?.() === true,
  );

  const className = (values: CloseButtonRenderProps) => {
    const own = props.className;
    const ownClass = typeof own === "function" ? own(values) : own;

    return joinClassNames(
      slots().close(),
      ownClass,
      isRevealed() ? "group-hover:pointer-events-auto group-hover:opacity-100" : undefined,
      isForcedHidden() ? "pointer-events-none opacity-0" : undefined,
    );
  };

  // React Aria hands the toast's `closeButtonProps` down through the `close`
  // slot; its `onPress` runs before the caller's own handler, so the dismiss
  // comes first and the caller's `onPress` still hears the press.
  const handlePress = (event: PressEvent) => {
    item.close?.();
    props.onPress?.(event);
  };

  return (
    <CloseButtonRoot
      {...props}
      // Only the frontmost toast's controls are Tab stops, as the same rule
      // gives the root (`toast.tsx:240`); a hidden toast is `inert` and an
      // exiting one's buttons get `tabIndex = -1` (`:250-258`). The caller may
      // still force the choice.
      excludeFromTabOrder={props.excludeFromTabOrder ?? !isToastControlReachable(item)}
      className={className}
      onPress={handlePress}
    >
      {props.children}
    </CloseButtonRoot>
  );
}
