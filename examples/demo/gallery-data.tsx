import { Text, View } from "nsh";
import type { JSX } from "nsh";
import {
  Accordion,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumbs,
  Button,
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
import { Section } from "./ui";

/** A bordered stage that keeps each component's own surface readable. */
function Frame(props: { children?: JSX.Element; className?: string }) {
  const layout = props.className ?? "flex-row flex-wrap items-center gap-4";

  return (
    <View class={`rounded-3xl border border-separator/60 p-4 ${layout}`}>
      {props.children}
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
    <Frame className="flex-col gap-4 sm:flex-row sm:items-stretch">
      <Card className="flex-auto">
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

      <Card className="flex-auto" variant="secondary">
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
    <Frame className="flex-col gap-3">
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
    </Frame>
  );
}

function ListBoxSample() {
  return (
    <Frame className="flex-col gap-3">
      <ListBox aria-label="Recent activity" className="w-full" selectionMode="single">
        {ACTIVITY.map((entry) => (
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
    </Frame>
  );
}

function AccordionSample() {
  return (
    <Frame className="flex-col">
      <Accordion allowsMultipleExpanded defaultExpandedKeys={["shipping"]} variant="surface">
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
    </Frame>
  );
}

function DisclosureSample() {
  return (
    <View class="flex-col gap-2">
      <Disclosure defaultExpanded>
        <Disclosure.Heading>
          <Disclosure.Trigger>
            Payment method
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>Visa ending in 4242. Expires in March 2028.</Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
      <Disclosure>
        <Disclosure.Heading>
          <Disclosure.Trigger>
            Billing address
            <Disclosure.Indicator />
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body>Torstraße 12, 10119 Berlin.</Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </View>
  );
}

function DisclosureGroupSample() {
  return (
    <Frame className="flex-col gap-2">
      <DisclosureGroup allowsMultipleExpanded defaultExpandedKeys={["contact"]}>
        <Disclosure id="contact">
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
        <Disclosure id="membership">
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
      </DisclosureGroup>
    </Frame>
  );
}

function TabsSample() {
  return (
    <Frame className="w-full flex-col">
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
            <Tabs.Tab id="settings">
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
    </Frame>
  );
}

function PaginationSample() {
  return (
    <Frame className="w-full flex-col gap-3">
      <Pagination>
        <Pagination.Summary>Showing 1–10 of 96 orders</Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous aria-label="Previous page" isDisabled>
              <Pagination.PreviousIcon />
            </Pagination.Previous>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link isActive>1</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>2</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>3</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Link>10</Pagination.Link>
          </Pagination.Item>
          <Pagination.Item>
            <Pagination.Next aria-label="Next page">
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Frame>
  );
}

function BreadcrumbsSample() {
  return (
    <Frame className="flex-col gap-3">
      <Breadcrumbs>
        <Breadcrumbs.Item href="#workspace">Workspace</Breadcrumbs.Item>
        <Breadcrumbs.Item href="#team">Team</Breadcrumbs.Item>
        <Breadcrumbs.Item>Members</Breadcrumbs.Item>
      </Breadcrumbs>
    </Frame>
  );
}

function ToolbarSample() {
  return (
    <Frame className="flex-col items-start gap-3">
      <Toolbar aria-label="Document actions">
        <Button variant="secondary">Edit</Button>
        <Button variant="tertiary">Duplicate</Button>
        <Button variant="ghost">Archive</Button>
      </Toolbar>
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
    </Frame>
  );
}

function TagGroupSample() {
  return (
    <Frame className="flex-col items-start gap-3">
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
    </Frame>
  );
}

function ChipSample() {
  return (
    <Frame className="flex-col items-start gap-3">
      <View class="flex-row flex-wrap items-center gap-2">
        <Chip>Default</Chip>
        <Chip color="accent">Accent</Chip>
        <Chip color="success" variant="soft">
          Delivered
        </Chip>
        <Chip color="warning" variant="soft">
          Pending
        </Chip>
        <Chip color="danger" variant="primary">
          Failed
        </Chip>
        <Chip variant="tertiary">Draft</Chip>
      </View>
      <View class="flex-row flex-wrap items-center gap-2">
        <Chip color="accent" size="sm">
          Small
        </Chip>
        <Chip color="accent">Medium</Chip>
        <Chip color="accent" size="lg">
          Large
        </Chip>
      </View>
    </Frame>
  );
}

function BadgeSample() {
  return (
    <Frame className="flex-row flex-wrap items-center gap-8">
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
        <Badge color="danger" variant="soft">
          12
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar size="lg">
          <Avatar.Fallback>KJ</Avatar.Fallback>
        </Avatar>
        <Badge color="success" size="lg">
          5
        </Badge>
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Fallback>AT</Avatar.Fallback>
        </Avatar>
        <Badge color="success" placement="bottom-right" size="sm" />
      </Badge.Anchor>

      <Badge.Anchor>
        <Avatar>
          <Avatar.Fallback>LB</Avatar.Fallback>
        </Avatar>
        <Badge color="warning" placement="bottom-left" size="sm" />
      </Badge.Anchor>
    </Frame>
  );
}

function AvatarSample() {
  return (
    <Frame className="flex-col items-start gap-4">
      <View class="flex-row flex-wrap items-center gap-4">
        <Avatar>
          <Avatar.Fallback>AL</Avatar.Fallback>
        </Avatar>
        <Avatar color="accent">
          <Avatar.Fallback>GH</Avatar.Fallback>
        </Avatar>
        <Avatar color="success" variant="soft">
          <Avatar.Fallback>AT</Avatar.Fallback>
        </Avatar>
        <Avatar color="warning" variant="soft">
          <Avatar.Fallback>KJ</Avatar.Fallback>
        </Avatar>
        <Avatar size="lg">
          <Avatar.Fallback>LB</Avatar.Fallback>
        </Avatar>
      </View>

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
    </Frame>
  );
}

function MeterSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <View class="w-full max-w-[420px]">
        <Meter value={68}>
          <Label>Storage</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
      </View>
      <View class="w-full max-w-[420px]">
        <Meter color="success" value={92}>
          <Label>Completed tasks</Label>
          <Meter.Output />
          <Meter.Track>
            <Meter.Fill />
          </Meter.Track>
        </Meter>
      </View>
    </Frame>
  );
}

function ProgressBarSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <View class="w-full max-w-[420px]">
        <ProgressBar value={74}>
          <Label>Monthly goal</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
      <View class="w-full max-w-[420px]">
        <ProgressBar color="warning" value={38}>
          <Label>Budget used</Label>
          <ProgressBar.Output />
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </View>
    </Frame>
  );
}

function ProgressCircleSample() {
  return (
    <Frame className="flex-row flex-wrap items-center gap-8">
      <View class="flex-row items-center gap-3">
        <ProgressCircle aria-label="Uptime" value={99}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <Text class="text-sm text-foreground">99.98%</Text>
      </View>
      <View class="flex-row items-center gap-3">
        <ProgressCircle aria-label="Upload" color="success" size="lg" value={64}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <Text class="text-sm text-foreground">Uploading</Text>
      </View>
    </Frame>
  );
}

function SpinnerSample() {
  return (
    <Frame className="flex-row flex-wrap items-center gap-8">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner color="success" size="lg" />
      <Spinner color="warning" size="xl" />
      <Spinner color="danger" />
    </Frame>
  );
}

function SkeletonSample() {
  return (
    <Frame className="w-full flex-col gap-4">
      <View class="w-full max-w-[340px] flex-row items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <View class="flex-auto flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
        </View>
      </View>
      <View class="w-full max-w-[340px] flex-col gap-2">
        <Skeleton animationType="pulse" className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </View>
    </Frame>
  );
}

function SeparatorSample() {
  return (
    <Frame className="w-full flex-col gap-5">
      <View class="w-full flex-col gap-2">
        <Text class="text-sm text-foreground">Above the line</Text>
        <Separator />
        <Text class="text-sm text-muted">Below the line</Text>
      </View>
      <View class="h-6 flex-row items-center gap-4">
        <Text class="text-sm text-foreground">Left</Text>
        <Separator orientation="vertical" />
        <Text class="text-sm text-foreground">Middle</Text>
        <Separator orientation="vertical" variant="tertiary" />
        <Text class="text-sm text-muted">Right</Text>
      </View>
    </Frame>
  );
}

function ScrollShadowSample() {
  return (
    <Frame className="w-full flex-col gap-2">
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
      <Text class="text-xs text-muted">Scroll to fade the edges.</Text>
    </Frame>
  );
}

function EmptyStateSample() {
  return (
    <Frame className="w-full flex-col gap-3">
      <EmptyState>No members match this filter.</EmptyState>
      <Separator variant="tertiary" />
      <EmptyState className="p-4">No invoices yet. The first one arrives on the 1st.</EmptyState>
    </Frame>
  );
}

function TypographySample() {
  return (
    <Frame className="w-full flex-col gap-4">
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
