/**
 * `icons`: the shared icon set of HeroUI 3.2.7, ported as fifteen standalone
 * components. They are not a compound: upstream exports flat functions, and the
 * set is imported by other components that draw a default icon.
 *
 * The names keep upstream's mixed `Icon*` / `*Icon` pattern exactly; there are
 * no aliases and no namespace object.
 *
 * Mobile 落点: the component files carry no axis — a decorative Canvas has no
 * hit area, no hover dependence and no overlay container (adapt sheet
 * A-001…A-006, all 保留). The two `接轴` spots are realized outside this tree:
 * // A-007 — the `case === "mobile"` scope branch in
 * `harness/icons.fixtures.tsx` (EnvironmentScope fed from
 * `host.params.input`/`density`);
 * // A-008 — `harness/tests/components/icons/icons.mobile.test.tsx`, the
 * M-001…M-006 assertions running headless+web under the desktop pin.
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
