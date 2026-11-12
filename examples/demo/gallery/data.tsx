import { Text, View } from "nsh";
import type { JSX } from "nsh";
import { parseDate } from "@internationalized/date";
import {
  Accordion,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumbs,
  Button,
  Calendar,
  Card,
  Chip,
  CircleDashedIcon,
  CloseIcon,
  DangerIcon,
  Description,
  Disclosure,
  DisclosureGroup,
  EmptyState,
  ExternalLinkIcon,
  Header,
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconMinus,
  IconPlus,
  IconSearch,
  InfoIcon,
  Label,
  Link,
  ListBox,
  Meter,
  Pagination,
  ProgressBar,
  ProgressCircle,
  ScrollShadow,
  Separator,
  Skeleton,
  Spinner,
  SuccessIcon,
  Surface,
  Table,
  Tabs,
  Tag,
  TagGroup,
  Toolbar,
  Typography,
  WarningIcon,
} from "hero-nsh";
import { Section } from "../ui";

/** A bordered stage that keeps each component's own surface readable. */
function Frame(props: { children?: JSX.Element; className?: string }) {
  const layout = props.className ?? "flex-row flex-wrap items-center gap-4";

  return (
    <View class={`rounded-3xl border border-separator/60 p-4 ${layout}`}>
      {props.children}
    </View>
  );
}

/**
 * One labelled state row: the small muted caption the catalogue uses for every
 * variant axis (`colors`, `sizes`, `disabled`, …). Two components in a row is
 * the default; a stack is passed in for taller samples.
 */
function State(props: {
  label: string;
  children?: JSX.Element;
  className?: string;
  /** The root's width; `md:w-auto` keeps a paired state at its content width. */
  rootClassName?: string;
}) {
  const layout = props.className ?? "flex-row flex-wrap items-center gap-3";

  return (
    <View class={`${props.rootClassName ?? "w-full"} flex-col items-start gap-1.5`}>
      <Text class="text-xs text-muted">{props.label}</Text>
      <View class={layout}>{props.children}</View>
    </View>
  );
}

const MEMBERS = [
  { id: "1", name: "Ada Lovelace", role: "Engineer", status: "Active" },
  { id: "2", name: "Grace Hopper", role: "Research", status: "Active" },
  { id: "3", name: "Alan Turing", role: "Support", status: "Away" },
  { id: "4", name: "Katherine Johnson", role: "Finance", status: "Invited" },
] as const;

const STATUS_COLOR = {
  Active: "success",
  Away: "warning",
  Invited: "default",
} as const;

/* A 16 × 16 opaque PNG, inline: the image avatar loads without the network. */
const AVATAR_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR42mOUS173n4ECwMRAIRg1YNSAUQMGiwEAGY0CTqYl9Z8AAAAASUVORK5CYII=";

const ACTIVITY = [
  { id: "a1", who: "Grace Hopper", what: "shipped order #1041", when: "12 min" },
  { id: "a2", who: "Alan Turing", what: "opened a refund request", when: "1 hour" },
  { id: "a3", who: "Katherine Johnson", what: "updated the return policy", when: "3 hours" },
  { id: "a4", who: "Ada Lovelace", what: "invited two teammates", when: "yesterday" },
];

const FAQ = [
  {
    id: "shipping",
    title: "When does an order ship?",
    body: "Orders leave the warehouse the same day when placed before 14:00. Tracking arrives by email.",
  },
  {
    id: "returns",
    title: "How do returns work?",
    body: "Open the order, choose Return, and print the label. Refunds land within three business days.",
  },
  {
    id: "billing",
    title: "Can I change the billing email?",
    body: "Yes. Billing settings take effect on the next invoice, never on one already issued.",
  },
];

const SURFACES = ["default", "secondary", "tertiary", "transparent"] as const;

const COLORS = ["default", "accent", "success", "warning", "danger"] as const;

const CHIP_VARIANTS = ["primary", "secondary", "soft", "tertiary"] as const;

const ICONS = [
  { name: "IconChevronDown", icon: IconChevronDown },
  { name: "IconChevronUp", icon: IconChevronUp },
  { name: "IconChevronLeft", icon: IconChevronLeft },
  { name: "IconChevronRight", icon: IconChevronRight },
  { name: "ExternalLinkIcon", icon: ExternalLinkIcon },
  { name: "CircleDashedIcon", icon: CircleDashedIcon },
  { name: "CloseIcon", icon: CloseIcon },
  { name: "InfoIcon", icon: InfoIcon },
  { name: "WarningIcon", icon: WarningIcon },
  { name: "DangerIcon", icon: DangerIcon },
  { name: "SuccessIcon", icon: SuccessIcon },
  { name: "IconMinus", icon: IconMinus },
  { name: "IconPlus", icon: IconPlus },
  { name: "IconSearch", icon: IconSearch },
  { name: "IconCalendar", icon: IconCalendar },
] as const;

function CardSamples() {
  return (
    <Frame className="flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-stretch">
      <Card className="min-w-[220px] flex-auto">
        <Card.Header>
          <Card.Title>Monthly revenue</Card.Title>
          <Card.Description>Compared with October</Card.Description>
        </Card.Header>
        <Card.Content className="gap-2">
          <Text class="text-2xl font-semibold text-foreground">$24,680</Text>
          <Chip color="success" size="sm">
            +12.4%
          </Chip>
        </Card.Content>
        <Card.Footer>
          <Text class="text-xs text-muted">Updated 4 minutes ago</Text>
        </Card.Footer>
      </Card>

      <Card className="min-w-[220px] flex-auto" variant="secondary">
        <Card.Header>
          <Card.Title>Open invoices</Card.Title>
          <Card.Description>Three are past due</Card.Description>
        </Card.Header>
        <Card.Content className="gap-2">
          <Text class="text-2xl font-semibold text-foreground">7</Text>
          <Text class="text-xs text-muted">$3,120 outstanding</Text>
        </Card.Content>
        <Card.Footer>
          <Button size="sm" variant="secondary">
            Review invoices
          </Button>
        </Card.Footer>
      </Card>

      <Card className="min-w-[220px] flex-auto" variant="tertiary">
        <Card.Header>
          <Card.Title>Trial ends</Card.Title>
          <Card.Description>November 30</Card.Description>
        </Card.Header>
        <Card.Content className="gap-2">
          <Text class="text-2xl font-semibold text-foreground">9 days</Text>
          <Text class="text-xs text-muted">Then Pro at $29 per seat</Text>
        </Card.Content>
        <Card.Footer>
          <Button size="sm" variant="secondary">
            Compare plans
          </Button>
        </Card.Footer>
      </Card>

      <Card className="min-w-[220px] flex-auto" variant="transparent">
        <Card.Header>
          <Card.Title>Audit log</Card.Title>
          <Card.Description>Nothing but the fields</Card.Description>
        </Card.Header>
        <Card.Content className="gap-2">
          <Text class="text-2xl font-semibold text-foreground">2,481</Text>
          <Text class="text-xs text-muted">Events kept for 90 days</Text>
        </Card.Content>
        <Card.Footer>
          <Text class="text-xs text-muted">transparent variant</Text>
        </Card.Footer>
      </Card>
    </Frame>
  );
}

function SurfaceSamples() {
  return (
    <Frame>
      {SURFACES.map((variant) => (
        <View class="flex-col items-center gap-2">
          <Surface className="size-16 rounded-2xl" variant={variant} />
          <Text class="text-xs text-muted">{variant}</Text>
        </View>
      ))}
    </Frame>
  );
}

function TableSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="variant: primary" className="w-full flex-col">
        <Table className="w-full">
          <Table.ScrollContainer>
            <Table.Content aria-label="Members">
              <Table.Header>
                <Table.Column isRowHeader>Member</Table.Column>
                <Table.Column>Role</Table.Column>
                <Table.Column>Status</Table.Column>
              </Table.Header>
              <Table.Body>
                {MEMBERS.map((member) => (
                  <Table.Row id={member.id}>
                    <Table.Cell>{member.name}</Table.Cell>
                    <Table.Cell>{member.role}</Table.Cell>
                    <Table.Cell>
                      <View class="w-fit">
                        <Chip color={STATUS_COLOR[member.status]} size="sm">
                          {member.status}
                        </Chip>
                      </View>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
              <Table.Footer>
                <Text class="text-xs text-muted">4 members</Text>
              </Table.Footer>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </State>

      <State label="variant: secondary" className="w-full flex-col">
        <Table className="w-full" variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Recent invoices">
              <Table.Header>
                <Table.Column isRowHeader>Invoice</Table.Column>
                <Table.Column>Amount</Table.Column>
                <Table.Column>Status</Table.Column>
              </Table.Header>
              <Table.Body>
                <Table.Row id="1041">
                  <Table.Cell>#1041</Table.Cell>
                  <Table.Cell>$79.00</Table.Cell>
                  <Table.Cell>Paid</Table.Cell>
                </Table.Row>
                <Table.Row id="1040">
                  <Table.Cell>#1040</Table.Cell>
                  <Table.Cell>$124.50</Table.Cell>
                  <Table.Cell>Refunded</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </State>

      <State label="empty" className="w-full flex-col">
        <Table className="w-full">
          <Table.ScrollContainer>
            <Table.Content aria-label="Archived members">
              <Table.Header>
                <Table.Column isRowHeader>Member</Table.Column>
                <Table.Column>Role</Table.Column>
                <Table.Column>Status</Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => <EmptyState>No archived members.</EmptyState>}
              />
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </State>
    </Frame>
  );
}

function ListBoxSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="default with one selected" className="w-full flex-col">
        <ListBox
          aria-label="Recent activity"
          className="w-full"
          defaultSelectedKeys={["a1"]}
          selectionMode="single"
        >
          {ACTIVITY.slice(0, 3).map((entry) => (
            <ListBox.Item id={entry.id} textValue={`${entry.who} ${entry.what}`}>
              <Avatar size="sm">
                <Avatar.Fallback>{entry.who.charAt(0)}</Avatar.Fallback>
              </Avatar>
              <View class="flex-auto flex-col gap-0.5">
                <Label>{entry.who}</Label>
                <Description>{entry.what}</Description>
              </View>
              <Text class="text-xs text-muted">{entry.when}</Text>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </State>

      <State label="disabled item" className="w-full flex-col">
        <ListBox aria-label="Billing actions" className="w-full" selectionMode="single">
          <ListBox.Item id="download" textValue="Download invoice">
            <View class="flex-auto flex-col gap-0.5">
              <Label>Download invoice</Label>
              <Description>PDF, 84 KB</Description>
            </View>
            <ListBox.ItemIndicator />
          </ListBox.Item>
          <ListBox.Item id="void" isDisabled textValue="Void invoice">
            <View class="flex-auto flex-col gap-0.5">
              <Label>Void invoice</Label>
              <Description>Already paid, cannot be voided</Description>
            </View>
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </State>

      <State label="sections" className="w-full flex-col">
        <ListBox aria-label="Workspace menu" className="w-full" selectionMode="single">
          <ListBox.Section aria-label="This week">
            <Header>This week</Header>
            <ListBox.Item id="inbox" textValue="Inbox">
              <View class="flex-auto flex-col gap-0.5">
                <Label>Inbox</Label>
                <Description>12 unread</Description>
              </View>
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="mentions" textValue="Mentions">
              <View class="flex-auto flex-col gap-0.5">
                <Label>Mentions</Label>
                <Description>3 waiting on you</Description>
              </View>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox.Section>
          <Separator className="my-1" variant="tertiary" />
          <ListBox.Section aria-label="Later">
            <Header>Later</Header>
            <ListBox.Item id="snoozed" textValue="Snoozed">
              <View class="flex-auto flex-col gap-0.5">
                <Label>Snoozed</Label>
                <Description>Until Monday 09:00</Description>
              </View>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox.Section>
        </ListBox>
      </State>

      <State label="variant: danger" className="w-full flex-col">
        <ListBox aria-label="Danger actions" className="w-full" variant="danger">
          <ListBox.Item id="delete" textValue="Delete workspace" variant="danger">
            <View class="flex-auto flex-col gap-0.5">
              <Label>Delete workspace</Label>
              <Description>Removes every project and member</Description>
            </View>
            <ListBox.ItemIndicator />
          </ListBox.Item>
        </ListBox>
      </State>
    </Frame>
  );
}

function AccordionSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="variant: default" className="w-full flex-col">
        <Accordion>
          {FAQ.slice(0, 2).map((item) => (
            <Accordion.Item id={item.id}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  {item.title}
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>{item.body}</Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </State>

      <State label="variant: surface" className="w-full flex-col">
        <Accordion defaultExpandedKeys={["shipping"]} variant="surface">
          {FAQ.map((item) => (
            <Accordion.Item id={item.id}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  {item.title}
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>{item.body}</Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </State>
    </Frame>
  );
}

function DisclosureSample() {
  return (
    <View class="w-full flex-col gap-5">
      <State label="expanded" className="w-full flex-col">
        <Disclosure
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          defaultExpanded
        >
          <Disclosure.Heading>
            <Disclosure.Trigger>
              Payment method
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>
              <View class="flex-col gap-3 rounded-xl bg-surface-secondary p-3">
                <View class="flex-row items-center justify-between gap-3">
                  <View class="gap-0.5">
                    <Text class="text-sm font-medium text-foreground">Visa ending in 4242</Text>
                    <Text class="text-xs text-muted">Expires March 2028</Text>
                  </View>
                  <Chip color="success" size="sm" variant="soft">
                    Default
                  </Chip>
                </View>
                <Text class="text-xs text-muted">
                  Charged on the 1st. Card details are held by the processor, not by this
                  workspace.
                </Text>
              </View>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </State>

      <State label="disabled" className="w-full flex-col">
        <Disclosure
          className="w-full rounded-xl border border-border bg-surface px-3 py-2"
          isDisabled
        >
          <Disclosure.Heading>
            <Disclosure.Trigger>
              Advanced security
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>Only the workspace owner can open this section.</Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </State>

      <Text class="text-xs text-muted">
        One section on its own: nothing else opens or closes with it. For that,
        hand several of them to a DisclosureGroup.
      </Text>
    </View>
  );
}

function DisclosureGroupSample() {
  return (
    <Frame className="flex-col gap-2">
      <DisclosureGroup defaultExpandedKeys={["contact"]}>
        <Disclosure className="rounded-xl border border-border bg-surface px-3 py-2" id="contact">
          <Disclosure.Heading>
            <Disclosure.Trigger>
              Contact
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>ada@acme.com · +49 30 1234 5678</Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
        <Disclosure className="rounded-xl border border-border bg-surface px-3 py-2" id="membership">
          <Disclosure.Heading>
            <Disclosure.Trigger>
              Membership
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>Admin since March 2023. Two workspaces.</Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
        <Disclosure className="rounded-xl border border-border bg-surface px-3 py-2" id="security">
          <Disclosure.Heading>
            <Disclosure.Trigger>
              Security
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>Two-factor authentication is on since June 2024.</Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </DisclosureGroup>
      <Text class="text-xs text-muted">
        One open at a time: expanding Security collapses Contact. The items share
        one expanded set, the same one Accordion reads.
      </Text>
    </Frame>
  );
}

function TabsSample() {
  return (
    <Frame className="w-full flex-col gap-6">
      <State label="variant: primary, one tab disabled" className="w-full flex-col">
        <Tabs defaultSelectedKey="overview">
          <Tabs.ListContainer className="w-fit">
            <Tabs.List aria-label="Workspace sections">
              <Tabs.Tab id="overview">
                Overview
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="activity">
                Activity
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="settings" isDisabled>
                Settings
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="overview" className="pt-4">
            <Typography.Paragraph size="sm">
              Every order, refund and member change from the last seven days.
            </Typography.Paragraph>
          </Tabs.Panel>
          <Tabs.Panel id="activity" className="pt-4">
            <Typography.Paragraph size="sm">
              Grace shipped order #1041 twelve minutes ago.
            </Typography.Paragraph>
          </Tabs.Panel>
          <Tabs.Panel id="settings" className="pt-4">
            <Typography.Paragraph size="sm">
              Notifications go to the workspace owner by default.
            </Typography.Paragraph>
          </Tabs.Panel>
        </Tabs>
      </State>

      <State label="variant: secondary" className="w-full flex-col">
        <Tabs defaultSelectedKey="all" variant="secondary">
          <Tabs.ListContainer className="w-fit">
            <Tabs.List aria-label="Invoice filter">
              <Tabs.Tab id="all">
                All
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="paid">
                Paid
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="open">
                Open
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="all" className="pt-4">
            <Typography.Paragraph size="sm">96 invoices this quarter.</Typography.Paragraph>
          </Tabs.Panel>
          <Tabs.Panel id="paid" className="pt-4">
            <Typography.Paragraph size="sm">91 paid.</Typography.Paragraph>
          </Tabs.Panel>
          <Tabs.Panel id="open" className="pt-4">
            <Typography.Paragraph size="sm">5 still open.</Typography.Paragraph>
          </Tabs.Panel>
        </Tabs>
      </State>

      <View class="w-full flex-col gap-4 md:flex-row">
        <State label="align: start" className="flex-col" rootClassName="w-full md:w-auto">
          <Tabs align="start" className="w-56" defaultSelectedKey="one">
            <Tabs.ListContainer className="w-full">
              <Tabs.List aria-label="Aligned start">
                <Tabs.Tab id="one">
                  One
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="two">
                  Two
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="one" className="pt-4">
              <Typography.Paragraph size="sm">Left aligned.</Typography.Paragraph>
            </Tabs.Panel>
            <Tabs.Panel id="two" className="pt-4">
              <Typography.Paragraph size="sm">Second.</Typography.Paragraph>
            </Tabs.Panel>
          </Tabs>
        </State>

        <State label="align: end" className="flex-col" rootClassName="w-full md:w-auto">
          <Tabs align="end" className="w-56" defaultSelectedKey="one">
            <Tabs.ListContainer className="w-full">
              <Tabs.List aria-label="Aligned end">
                <Tabs.Tab id="one">
                  One
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="two">
                  Two
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="one" className="pt-4">
              <Typography.Paragraph size="sm">Right aligned.</Typography.Paragraph>
            </Tabs.Panel>
            <Tabs.Panel id="two" className="pt-4">
              <Typography.Paragraph size="sm">Second.</Typography.Paragraph>
            </Tabs.Panel>
          </Tabs>
        </State>
      </View>

      <State label="orientation: vertical" className="w-full flex-col">
        <Tabs defaultSelectedKey="profile" orientation="vertical">
          <Tabs.ListContainer className="w-fit">
            <Tabs.List aria-label="Settings sections">
              <Tabs.Tab id="profile">
                Profile
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="billing">
                Billing
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="security">
                Security
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="profile">
            <Typography.Paragraph size="sm">Ada Lovelace, Engineer.</Typography.Paragraph>
          </Tabs.Panel>
          <Tabs.Panel id="billing">
            <Typography.Paragraph size="sm">Invoices go to billing@acme.com.</Typography.Paragraph>
          </Tabs.Panel>
          <Tabs.Panel id="security">
            <Typography.Paragraph size="sm">Two-factor authentication is on.</Typography.Paragraph>
          </Tabs.Panel>
        </Tabs>
      </State>
    </Frame>
  );
}

function PaginationRow(props: { size?: "sm" | "md" | "lg"; active: number; summary: string }) {
  return (
    <Pagination size={props.size}>
      <Pagination.Summary>{props.summary}</Pagination.Summary>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous aria-label="Previous page" isDisabled={props.active === 1}>
            <Pagination.PreviousIcon />
          </Pagination.Previous>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Link isActive={props.active === 1}>1</Pagination.Link>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Link isActive={props.active === 2}>2</Pagination.Link>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Link isActive={props.active === 3}>3</Pagination.Link>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Ellipsis />
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Link isActive={props.active === 10}>10</Pagination.Link>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Next aria-label="Next page">
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

function PaginationSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="size: sm, page 1 of 10" className="w-full flex-col">
        <PaginationRow active={1} size="sm" summary="1–10 of 96" />
      </State>
      <State label="size: md, page 3 of 10" className="w-full flex-col">
        <PaginationRow active={3} summary="21–30 of 96 orders" />
      </State>
      <State label="size: lg, page 10 of 10" className="w-full flex-col">
        <PaginationRow active={10} size="lg" summary="91–96 of 96" />
      </State>
    </Frame>
  );
}

function BreadcrumbsSample() {
  return (
    <Frame className="w-full flex-col gap-4">
      <State label="multi-level, last item is current" className="w-full flex-col">
        <Breadcrumbs>
          <Breadcrumbs.Item href="#workspace">Workspace</Breadcrumbs.Item>
          <Breadcrumbs.Item href="#team">Team</Breadcrumbs.Item>
          <Breadcrumbs.Item href="#members">Members</Breadcrumbs.Item>
          <Breadcrumbs.Item>Ada Lovelace</Breadcrumbs.Item>
        </Breadcrumbs>
      </State>
      <State label="disabled crumb" className="w-full flex-col">
        <Breadcrumbs>
          <Breadcrumbs.Item href="#workspace">Workspace</Breadcrumbs.Item>
          <Breadcrumbs.Item isDisabled>Billing</Breadcrumbs.Item>
          <Breadcrumbs.Item>Invoices</Breadcrumbs.Item>
        </Breadcrumbs>
      </State>
    </Frame>
  );
}

function ToolbarSample() {
  return (
    <Frame className="w-full flex-col items-start gap-5">
      <State label="horizontal" className="flex-col items-start">
        <Toolbar aria-label="Document actions">
          <Button variant="secondary">Edit</Button>
          <Button variant="tertiary">Duplicate</Button>
          <Button variant="ghost">Archive</Button>
        </Toolbar>
      </State>
      <State label="horizontal, isAttached" className="flex-col items-start">
        <Toolbar isAttached aria-label="Attached document actions">
          <Button size="sm" variant="secondary">
            Edit
          </Button>
          <Button size="sm" variant="ghost">
            Share
          </Button>
          <Button size="sm" variant="ghost">
            Delete
          </Button>
        </Toolbar>
      </State>
      <State label="orientation: vertical" className="flex-col items-start">
        <Toolbar aria-label="Vertical document actions" orientation="vertical">
          <Button variant="secondary">Edit</Button>
          <Button variant="tertiary">Duplicate</Button>
          <Button variant="ghost">Archive</Button>
        </Toolbar>
      </State>
    </Frame>
  );
}

function TagGroupSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="selected and disabled" className="w-full flex-col">
        <TagGroup
          aria-label="Skills"
          defaultSelectedKeys={["analytics", "billing"]}
          selectionMode="multiple"
        >
          <TagGroup.List>
            <Tag id="analytics">Analytics</Tag>
            <Tag id="billing">Billing</Tag>
            <Tag id="ops">Operations</Tag>
            <Tag id="design" isDisabled>
              Design
            </Tag>
          </TagGroup.List>
        </TagGroup>
      </State>

      <State label="sizes" className="w-full flex-col gap-3">
        <TagGroup aria-label="Small tags" size="sm">
          <TagGroup.List>
            <Tag id="sm-a">Small</Tag>
            <Tag id="sm-b">12 pt</Tag>
          </TagGroup.List>
        </TagGroup>
        <TagGroup aria-label="Medium tags" size="md">
          <TagGroup.List>
            <Tag id="md-a">Medium</Tag>
            <Tag id="md-b">default</Tag>
          </TagGroup.List>
        </TagGroup>
        <TagGroup aria-label="Large tags" size="lg">
          <TagGroup.List>
            <Tag id="lg-a">Large</Tag>
            <Tag id="lg-b">14 pt</Tag>
          </TagGroup.List>
        </TagGroup>
      </State>

      <View class="w-full flex-col gap-4 md:flex-row">
        <State label="variant: default" className="flex-col" rootClassName="w-full md:w-auto">
          <TagGroup aria-label="Default variant">
            <TagGroup.List>
              <Tag id="d-a">Draft</Tag>
              <Tag id="d-b">Review</Tag>
            </TagGroup.List>
          </TagGroup>
        </State>
        <State label="variant: surface" className="flex-col" rootClassName="w-full md:w-auto">
          <TagGroup aria-label="Surface variant" variant="surface">
            <TagGroup.List>
              <Tag id="s-a">Draft</Tag>
              <Tag id="s-b">Review</Tag>
            </TagGroup.List>
          </TagGroup>
        </State>
      </View>

      <State label="removable" className="w-full flex-col">
        <TagGroup
          aria-label="Filters"
          defaultSelectedKeys={["status"]}
          onRemove={() => {}}
          selectionMode="multiple"
        >
          <TagGroup.List>
            <Tag id="status">Status: Active</Tag>
            <Tag id="owner">Owner: Ada</Tag>
            <Tag id="region">Region: EU</Tag>
          </TagGroup.List>
        </TagGroup>
      </State>
    </Frame>
  );
}

function ChipSample() {
  return (
    <Frame className="w-full flex-col gap-4">
      {CHIP_VARIANTS.map((variant) => (
        <State label={`variant: ${variant} × color`} className="flex-row flex-wrap items-center gap-2">
          {COLORS.map((color) => (
            <Chip color={color} variant={variant}>
              {color}
            </Chip>
          ))}
        </State>
      ))}

      <State label="sizes" className="flex-row flex-wrap items-center gap-2">
        <Chip color="accent" size="sm">
          Small
        </Chip>
        <Chip color="accent">Medium</Chip>
        <Chip color="accent" size="lg">
          Large
        </Chip>
      </State>
    </Frame>
  );
}

function BadgeSample() {
  return (
    <Frame className="w-full flex-col gap-6">
      {(["primary", "secondary", "soft"] as const).map((variant) => (
        <State label={`variant: ${variant} × color`} className="flex-row flex-wrap items-center gap-6">
          {COLORS.map((color) => (
            <Badge.Anchor>
              <Avatar>
                <Avatar.Fallback>{color.charAt(0).toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <Badge color={color} variant={variant}>
                {color.slice(0, 2)}
              </Badge>
            </Badge.Anchor>
          ))}
        </State>
      ))}

      <State label="sizes" className="flex-row flex-wrap items-center gap-6">
        <Badge.Anchor>
          <Avatar size="sm">
            <Avatar.Fallback>AL</Avatar.Fallback>
          </Avatar>
          <Badge color="accent" size="sm">
            3
          </Badge>
        </Badge.Anchor>
        <Badge.Anchor>
          <Avatar>
            <Avatar.Fallback>GH</Avatar.Fallback>
          </Avatar>
          <Badge color="accent">12</Badge>
        </Badge.Anchor>
        <Badge.Anchor>
          <Avatar size="lg">
            <Avatar.Fallback>KJ</Avatar.Fallback>
          </Avatar>
          <Badge color="accent" size="lg">
            5
          </Badge>
        </Badge.Anchor>
      </State>

      <State label="placements" className="flex-row flex-wrap items-center gap-6">
        {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(
          (placement) => (
            <Badge.Anchor>
              <Avatar>
                <Avatar.Fallback>{placement.charAt(0).toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <Badge color="success" placement={placement} size="sm" />
            </Badge.Anchor>
          ),
        )}
      </State>
    </Frame>
  );
}

function AvatarSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="colors" className="flex-row flex-wrap items-center gap-4">
        {COLORS.map((color, index) => (
          <Avatar color={color}>
            <Avatar.Fallback>{String.fromCharCode(65 + index)}</Avatar.Fallback>
          </Avatar>
        ))}
      </State>

      <State label="sizes" className="flex-row flex-wrap items-center gap-4">
        <Avatar size="sm">
          <Avatar.Fallback>SM</Avatar.Fallback>
        </Avatar>
        <Avatar size="md">
          <Avatar.Fallback>MD</Avatar.Fallback>
        </Avatar>
        <Avatar size="lg">
          <Avatar.Fallback>LG</Avatar.Fallback>
        </Avatar>
      </State>

      <State label="variant: soft × color" className="flex-row flex-wrap items-center gap-4">
        {COLORS.map((color, index) => (
          <Avatar color={color} variant="soft">
            <Avatar.Fallback>{String.fromCharCode(65 + index)}</Avatar.Fallback>
          </Avatar>
        ))}
      </State>

      <State label="image, and image that fails to load" className="flex-row flex-wrap items-center gap-4">
        <Avatar size="lg">
          <Avatar.Image alt="Ada Lovelace" src={AVATAR_IMAGE} />
          <Avatar.Fallback>AL</Avatar.Fallback>
        </Avatar>
        <Avatar color="accent" size="lg">
          <Avatar.Image alt="" src="" />
          <Avatar.Fallback>AL</Avatar.Fallback>
        </Avatar>
        <Text class="text-xs text-muted">image / fallback</Text>
      </State>

      <State label="group: max 3 of 5" className="flex-row flex-wrap items-center gap-4">
        <AvatarGroup max={3} size="sm">
          <Avatar>
            <Avatar.Fallback>A</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>B</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>C</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>D</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>E</Avatar.Fallback>
          </Avatar>
        </AvatarGroup>
      </State>

      <State label="group: isGrid" className="flex-row flex-wrap items-center gap-4">
        <AvatarGroup isGrid max={4} size="sm">
          <Avatar>
            <Avatar.Fallback>A</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>B</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>C</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>D</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>E</Avatar.Fallback>
          </Avatar>
        </AvatarGroup>
      </State>

      <State label="group: overlap ring" className="flex-row flex-wrap items-center gap-4">
        <AvatarGroup max={4} overlap="ring" size="sm">
          <Avatar>
            <Avatar.Fallback>A</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>B</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>C</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>D</Avatar.Fallback>
          </Avatar>
          <Avatar>
            <Avatar.Fallback>E</Avatar.Fallback>
          </Avatar>
        </AvatarGroup>
      </State>
    </Frame>
  );
}

function MeterSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="values: 25 / 60 / 100" className="flex-row flex-wrap items-start gap-4">
        {[25, 60, 100].map((value) => (
          <View class="w-[160px]">
            <Meter value={value}>
              <Label>{value}%</Label>
              <Meter.Output />
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
          </View>
        ))}
      </State>

      <State label="colors" className="flex-row flex-wrap items-start gap-4">
        {COLORS.map((color) => (
          <View class="w-[150px]">
            <Meter color={color} value={60}>
              <Label>{color}</Label>
              <Meter.Output />
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
          </View>
        ))}
      </State>

      <State label="sizes" className="flex-row flex-wrap items-start gap-4">
        {(["sm", "md", "lg"] as const).map((size) => (
          <View class="w-[150px]">
            <Meter size={size} value={60}>
              <Label>{size}</Label>
              <Meter.Output />
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
          </View>
        ))}
      </State>
    </Frame>
  );
}

function ProgressBarSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="values: 25 / 60 / 100" className="flex-row flex-wrap items-start gap-4">
        {[25, 60, 100].map((value) => (
          <View class="w-[160px]">
            <ProgressBar value={value}>
              <Label>{value}%</Label>
              <ProgressBar.Output />
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </View>
        ))}
      </State>

      <State label="colors" className="flex-row flex-wrap items-start gap-4">
        {COLORS.map((color) => (
          <View class="w-[150px]">
            <ProgressBar color={color} value={60}>
              <Label>{color}</Label>
              <ProgressBar.Output />
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </View>
        ))}
      </State>

      <State label="sizes" className="flex-row flex-wrap items-start gap-4">
        {(["sm", "md", "lg"] as const).map((size) => (
          <View class="w-[150px]">
            <ProgressBar size={size} value={60}>
              <Label>{size}</Label>
              <ProgressBar.Output />
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </View>
        ))}
      </State>
    </Frame>
  );
}

function ProgressCircleSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="values 25 / 60 / 100 across sizes sm / md / lg" className="flex-row flex-wrap items-center gap-6">
        {(
          [
            { value: 25, size: "sm" },
            { value: 60, size: "md" },
            { value: 100, size: "lg" },
          ] as const
        ).map((sample) => (
          <View class="flex-row items-center gap-2">
            <ProgressCircle aria-label={`${sample.value} percent`} size={sample.size} value={sample.value}>
              <ProgressCircle.Track>
                <ProgressCircle.TrackCircle />
                <ProgressCircle.FillCircle />
              </ProgressCircle.Track>
            </ProgressCircle>
            <Text class="text-sm text-foreground">{`${sample.value}% · ${sample.size}`}</Text>
          </View>
        ))}
      </State>

      <State label="colors" className="flex-row flex-wrap items-center gap-5">
        {COLORS.map((color) => (
          <View class="flex-col items-center gap-1">
            <ProgressCircle aria-label={`${color} progress`} color={color} value={60}>
              <ProgressCircle.Track>
                <ProgressCircle.TrackCircle />
                <ProgressCircle.FillCircle />
              </ProgressCircle.Track>
            </ProgressCircle>
            <Text class="text-xs text-muted">{color}</Text>
          </View>
        ))}
      </State>
    </Frame>
  );
}

function SpinnerSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="sizes" className="flex-row flex-wrap items-center gap-6">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
        <Spinner size="xl" />
      </State>

      <State label="colors (current inherits its parent's text color)" className="flex-row flex-wrap items-center gap-6">
        <Spinner color="accent" />
        <Spinner color="success" />
        <Spinner color="warning" />
        <Spinner color="danger" />
        <View class="text-danger">
          <Spinner color="current" />
        </View>
      </State>
    </Frame>
  );
}

function SkeletonSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="animationType: shimmer" className="w-full flex-col">
        <View class="w-full max-w-[340px] flex-row items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <View class="flex-auto flex-col gap-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </View>
        </View>
      </State>

      <State label="animationType: pulse" className="w-full flex-col">
        <View class="w-full max-w-[340px] flex-col gap-2">
          <Skeleton animationType="pulse" className="h-20 w-full rounded-2xl" />
          <Skeleton animationType="pulse" className="h-3 w-3/4" />
        </View>
      </State>

      <State label="animationType: none" className="w-full flex-col">
        <View class="w-full max-w-[340px] flex-col gap-2">
          <Skeleton animationType="none" className="h-3 w-1/2" />
          <Skeleton animationType="none" className="h-3 w-2/3" />
        </View>
      </State>
    </Frame>
  );
}

function SeparatorSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="horizontal: default / secondary / tertiary" className="w-full flex-col gap-3">
        {(["default", "secondary", "tertiary"] as const).map((variant) => (
          <View class="w-full flex-col gap-1">
            <Text class="text-xs text-muted">{variant}</Text>
            <Separator variant={variant} />
          </View>
        ))}
      </State>

      <State label="vertical: default / secondary / tertiary" className="h-8 flex-row items-center gap-4">
        <Text class="text-sm text-foreground">Left</Text>
        <Separator orientation="vertical" />
        <Text class="text-sm text-foreground">Middle</Text>
        <Separator orientation="vertical" variant="secondary" />
        <Text class="text-sm text-foreground">Middle</Text>
        <Separator orientation="vertical" variant="tertiary" />
        <Text class="text-sm text-muted">Right</Text>
      </State>
    </Frame>
  );
}

function ScrollShadowSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="orientation: vertical, content overflows" className="w-full flex-col">
        <ScrollShadow className="h-[160px] w-full max-w-[360px]">
          <View class="flex-col gap-2 p-1">
            {Array.from({ length: 9 }, (_, index) => (
              <View class="flex-row items-center justify-between gap-3 rounded-xl bg-default px-3 py-2">
                <Text class="text-sm text-foreground">{`Invoice #10${41 - index}`}</Text>
                <Text class="text-xs text-muted">Paid</Text>
              </View>
            ))}
          </View>
        </ScrollShadow>
      </State>

      <State label="orientation: horizontal, content overflows" className="w-full flex-col">
        <ScrollShadow className="w-full max-w-[360px]" orientation="horizontal">
          <View class="flex-row gap-2 p-1">
            {Array.from({ length: 8 }, (_, index) => (
              <View class="h-20 w-28 flex-col justify-between rounded-xl bg-default p-3">
                <Text class="text-xs text-muted">Card</Text>
                <Text class="text-sm font-medium text-foreground">{index + 1}</Text>
              </View>
            ))}
          </View>
        </ScrollShadow>
      </State>

      <State label="hideScrollBar" className="flex-row flex-wrap items-center gap-4">
        <ScrollShadow
          className="h-24 w-full max-w-[240px]"
          hideScrollBar
          size={24}
        >
          <View class="flex-col gap-2 p-1">
            {Array.from({ length: 6 }, (_, index) => (
              <Text class="text-sm text-foreground">{`Row ${index + 1}`}</Text>
            ))}
          </View>
        </ScrollShadow>
      </State>
    </Frame>
  );
}

function EmptyStateSample() {
  return (
    <Frame className="w-full flex-col gap-4">
      <State label="default text" className="w-full flex-col">
        <EmptyState />
      </State>
      <State label="custom content" className="w-full flex-col">
        <EmptyState>No members match this filter.</EmptyState>
        <EmptyState className="p-4">No invoices yet. The first one arrives on the 1st.</EmptyState>
      </State>
    </Frame>
  );
}

function TypographySample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <State label="types: h1 … h6, body sizes, code" className="w-full flex-col">
        <Typography.Heading level={1}>Heading 1</Typography.Heading>
        <Typography.Heading level={2}>Heading 2</Typography.Heading>
        <Typography.Heading level={3}>Heading 3</Typography.Heading>
        <Typography.Heading level={4}>Heading 4</Typography.Heading>
        <Typography.Heading level={5}>Heading 5</Typography.Heading>
        <Typography.Heading level={6}>Heading 6</Typography.Heading>
        <Typography.Paragraph>Body, 16 / 28.</Typography.Paragraph>
        <Typography.Paragraph size="sm">Body small, 14 / 24.</Typography.Paragraph>
        <Typography.Paragraph size="xs">Body extra small, 12 / 20.</Typography.Paragraph>
        <View class="w-fit rounded-md bg-default px-2 py-1">
          <Typography.Code>npm run billing:sync</Typography.Code>
        </View>
      </State>

      <State label="align: start / center / end / justify" className="w-full flex-row flex-wrap items-start gap-4">
        {(["start", "center", "end", "justify"] as const).map((align) => (
          <View class="w-40 flex-col gap-1">
            <Text class="text-xs text-muted">{align}</Text>
            <Typography align={align}>
              Three words, one sentence, wrapped across the column.
            </Typography>
          </View>
        ))}
      </State>

      <State label="color: default / muted" className="flex-row flex-wrap items-start gap-6">
        <Typography color="default">Default foreground</Typography>
        <Typography color="muted">Muted foreground</Typography>
      </State>

      <State label="weight: normal / medium / semibold / bold" className="flex-row flex-wrap items-start gap-6">
        {(["normal", "medium", "semibold", "bold"] as const).map((weight) => (
          <Typography weight={weight}>{weight}</Typography>
        ))}
      </State>

      <State label="truncate" className="w-full flex-col">
        <View class="w-48">
          <Typography truncate>
            A very long line that has to end in an ellipsis instead of wrapping.
          </Typography>
        </View>
      </State>

      <State label="prose" className="w-full flex-col">
        <Typography.Prose className="max-w-[620px]">
          <Typography.Heading level={3}>Billing runbook</Typography.Heading>
          <Typography.Paragraph>
            Every workspace keeps one owner who can change the payment method. Support can read the
            invoice history, but only the owner can refund a charge.
          </Typography.Paragraph>
          <Typography.Paragraph size="sm" color="muted">
            Run the nightly sync before closing the month.
          </Typography.Paragraph>
          <View class="w-fit rounded-md bg-default px-2 py-1">
            <Typography.Code>npm run billing:sync</Typography.Code>
          </View>
        </Typography.Prose>
      </State>
    </Frame>
  );
}

function HeaderSample() {
  return (
    <Frame className="w-full flex-col gap-4">
      <View class="w-full flex-col gap-1">
        <Header>Recent activity</Header>
        <Text class="px-2 text-sm text-foreground">Orders, refunds and member changes.</Text>
      </View>
      <View class="w-full flex-col gap-1">
        <Header className="text-foreground">Billing</Header>
        <Text class="px-2 text-sm text-foreground">Two invoices need attention.</Text>
      </View>
    </Frame>
  );
}

function IconsSample() {
  return (
    <Frame className="flex-row flex-wrap items-center gap-6">
      {ICONS.map(({ name, icon: Icon }) => (
        <View class="flex-col items-center gap-2">
          <Icon />
          <Text class="text-xs text-muted">{name}</Text>
        </View>
      ))}
    </Frame>
  );
}

/**
 * The year picker has no root of its own: its six parts read the state Calendar
 * (or RangeCalendar) provides, so the smallest honest example is a Calendar
 * whose header carries the trigger. It is shown with the year panel open.
 */
function CalendarSample() {
  return (
    <Frame className="w-full flex-col gap-3">
      <State label="default month with a selected day" className="w-full flex-col">
        <View class="w-fit rounded-2xl bg-surface p-3">
          <Calendar aria-label="Event date" defaultValue={parseDate("2026-08-15")}>
            <Calendar.Header>
              <Calendar.Heading />
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </View>
      </State>
      <State label="min and max value: days outside them are disabled" className="w-full flex-col">
        <View class="w-fit rounded-2xl bg-surface p-3">
          <Calendar
            aria-label="Billing period"
            defaultValue={parseDate("2026-08-10")}
            maxValue={parseDate("2026-08-20")}
            minValue={parseDate("2026-08-05")}
          >
            <Calendar.Header>
              <Calendar.Heading />
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </View>
      </State>
    </Frame>
  );
}

function CalendarYearPickerSample() {
  return (
    <Frame className="w-full flex-col gap-3">
      <State label="Calendar with the year picker trigger in its header" className="w-full flex-col">
        <View class="w-fit rounded-2xl bg-surface p-3">
          <Calendar
            aria-label="Event date"
            defaultValue={parseDate("2026-08-15")}
            maxValue={parseDate("2030-12-31")}
            minValue={parseDate("2020-01-01")}
          >
            <Calendar.Header>
              <Calendar.YearPickerTrigger>
                <Calendar.YearPickerTriggerHeading />
                <Calendar.YearPickerTriggerIndicator />
              </Calendar.YearPickerTrigger>
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
            </Calendar.Grid>
            <Calendar.YearPickerGrid>
              <Calendar.YearPickerGridBody>
                {({ year }) => <Calendar.YearPickerCell year={year} />}
              </Calendar.YearPickerGridBody>
            </Calendar.YearPickerGrid>
          </Calendar>
        </View>
      </State>
      <Text class="text-xs text-muted">
        The trigger in the header opens the panel; Escape or a year press closes it.
      </Text>
    </Frame>
  );
}

export function DataSection() {
  return (
    <Section title="Data">
      <View class="gap-8">
        <Section title="Card">
          <CardSamples />
        </Section>

        <Section title="Surface">
          <SurfaceSamples />
        </Section>

        <Section title="Table">
          <TableSample />
        </Section>

        <Section title="Calendar">
          <CalendarSample />
        </Section>

        <Section title="Calendar Year Picker">
          <CalendarYearPickerSample />
        </Section>

        <Section title="ListBox">
          <ListBoxSample />
        </Section>

        <Section title="Accordion">
          <AccordionSample />
        </Section>

        <Section title="Disclosure">
          <DisclosureSample />
        </Section>

        <Section title="DisclosureGroup">
          <DisclosureGroupSample />
        </Section>

        <Section title="Tabs">
          <TabsSample />
        </Section>

        <Section title="Pagination">
          <PaginationSample />
        </Section>

        <Section title="Breadcrumbs">
          <BreadcrumbsSample />
        </Section>

        <Section title="Toolbar">
          <ToolbarSample />
        </Section>

        <Section title="Tag / TagGroup">
          <TagGroupSample />
        </Section>

        <Section title="Chip">
          <ChipSample />
        </Section>

        <Section title="Badge">
          <BadgeSample />
        </Section>

        <Section title="Avatar / AvatarGroup">
          <AvatarSample />
        </Section>

        <Section title="Meter">
          <MeterSample />
        </Section>

        <Section title="ProgressBar">
          <ProgressBarSample />
        </Section>

        <Section title="ProgressCircle">
          <ProgressCircleSample />
        </Section>

        <Section title="Spinner">
          <SpinnerSample />
        </Section>

        <Section title="Skeleton">
          <SkeletonSample />
        </Section>

        <Section title="Separator">
          <SeparatorSample />
        </Section>

        <Section title="ScrollShadow">
          <ScrollShadowSample />
        </Section>

        <Section title="EmptyState">
          <EmptyStateSample />
        </Section>

        <Section title="Typography">
          <TypographySample />
        </Section>

        <Section title="Header">
          <HeaderSample />
        </Section>

        <Section title="Icons">
          <IconsSample />
        </Section>
      </View>
    </Section>
  );
}
