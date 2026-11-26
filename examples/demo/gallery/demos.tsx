import { Text, UrlScheme } from "nsh";
import { Card, Link } from "hero-nsh";
import { Grid, Section } from "../ui";

/**
 * The standalone example apps, linked from the catalogue. Each one is its own
 * `nsh package --target web` build under `/demos/` on the published site, so
 * the links only resolve there; `nsh run` starts one page at a time.
 *
 * The mobile entry is the phone-first demo: it mounts its subtree in
 * `EnvironmentScope input="touch" width="compact"`, so the touch branches run
 * even in a desktop browser.
 *
 * A `Link` opens a URL outside the app; a relative path only fires its press
 * handlers. The href is therefore made absolute against the page's own address
 * before it reaches `Link`; on the published site that is the site's base.
 */
function siteBase(): string {
  const current = UrlScheme.url();
  if (!current) {
    return "https://c-w-xiaohei.github.io/hero-nsh/";
  }
  return current.endsWith("/")
    ? current
    : current.slice(0, current.lastIndexOf("/") + 1);
}

function demoHref(path: string): string {
  return `${siteBase()}${path}`;
}

const DEMOS = [
  {
    title: "Mobile",
    href: "demos/mobile/",
    description:
      "A phone-first app: touch targets, a snapping sheet, swipe-to-dismiss and compact overlays.",
  },
  {
    title: "Dashboard",
    href: "demos/dashboard/",
    description: "Metrics, activity and goals on one product overview.",
  },
  {
    title: "Login",
    href: "demos/login/",
    description: "A sign-in card with fields, validation and a submit path.",
  },
  {
    title: "Orders",
    href: "demos/orders/",
    description: "A table inside tabs, with filters, search and pagination.",
  },
  {
    title: "Profile",
    href: "demos/profile/",
    description: "A profile page built from cards, tags and disclosures.",
  },
  {
    title: "Settings",
    href: "demos/settings/",
    description: "A long settings form with dates, colors and one-time codes.",
  },
];

export function DemosSection() {
  return (
    <Section title="Example apps">
      <Grid cols="md:grid-cols-2">
        {DEMOS.map((demo) => (
          <Card>
            <Card.Header>
              <Card.Title>{demo.title}</Card.Title>
              <Card.Description>{demo.description}</Card.Description>
            </Card.Header>
            <Card.Footer>
              <Link href={demoHref(demo.href)}>
                <Text class="text-accent">{`Open ${demo.title}`}</Text>
              </Link>
            </Card.Footer>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}
