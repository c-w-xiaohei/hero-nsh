/**
 * `icons`: the shared icon set of HeroUI 3.2.7, ported as fifteen standalone
 * components. They are not a compound: upstream exports flat functions, and the
 * set is imported by other components that draw a default icon.
 *
 * The names keep upstream's mixed `Icon*` / `*Icon` pattern exactly; there are
 * no aliases and no namespace object.
 */
export {
  CircleDashedIcon,
  CloseIcon,
  DangerIcon,
  ExternalLinkIcon,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconMinus,
  IconPlus,
  IconSearch,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
} from "./icons";

export type { IconProps } from "./icon-base";
