import { mount, Text, View } from "nsh";
import {
  Accordion,
  Avatar,
  Chip,
  Button,
  Card,
  CloseButton,
  Description,
  Disclosure,
  DisclosureGroup,
  Kbd,
  Label,
  Link,
  Menu,
  ProgressBar,
  Surface,
  Tag,
  TagGroup,
  Typography,
} from "hero-nsh";
import { Grid, Page, Section } from "./ui";

const FAQ = [
  {
    title: "Who can see my email?",
    content: "Workspace admins always can. Teammates see it only if you turn it on in Settings.",
  },
  {
    title: "How do I leave the workspace?",
    content: "Open Settings, then Advanced, and choose Leave workspace. An admin can invite you back.",
  },
  {
    title: "Can I change my handle?",
    content: "Yes, twice every 30 days. Old links keep working for a week.",
  },
];

function Identity() {
  return (
    <Card>
      <Card.Header>
        <View class="flex-row flex-wrap items-center gap-4 gap-y-2">
          <Avatar>
            <Avatar.Fallback>AL</Avatar.Fallback>
          </Avatar>
          <View class="flex-auto gap-0.5">
            <View class="flex-row items-center gap-2">
              <Card.Title>Ada Lovelace</Card.Title>
              <Chip color="accent">Admin</Chip>
            </View>
            <Card.Description>ada@acme.com · Berlin</Card.Description>
          </View>
          <Button variant="secondary">Edit profile</Button>
        </View>
      </Card.Header>
      <Card.Content className="gap-3">
        <TagGroup aria-label="Skills" selectionMode="multiple">
          <TagGroup.List>
            <Tag id="analytics">Analytics</Tag>
            <Tag id="billing">Billing</Tag>
            <Tag id="ops">Operations</Tag>
          </TagGroup.List>
        </TagGroup>
        <Link href="https://example.com/ada">example.com/ada</Link>
      </Card.Content>
    </Card>
  );
}

function About() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>About</Card.Title>
        <Card.Description>Shown on your public profile.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Typography.Paragraph className="max-w-[600px]">
          Mathematician, occasional programmer, and the person who keeps the billing runbooks in
          order. Ask me about invoices, exports, or why the March report is late.
        </Typography.Paragraph>
        <View class="self-start rounded-md bg-default px-1.5 py-0.5">
          <Text class="font-mono text-sm text-foreground">timezone: Europe/Berlin</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

function Details() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Details</Card.Title>
        <Card.Description>Contact details and membership.</Card.Description>
      </Card.Header>
      <Card.Content>
        <DisclosureGroup>
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
      </Card.Content>
    </Card>
  );
}

function Shortcuts() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Shortcuts</Card.Title>
        <Card.Description>Everywhere in Acme.</Card.Description>
      </Card.Header>
      <Card.Content className="gap-2">
        <View class="flex-row items-center justify-between gap-3">
          <Text class="text-sm text-foreground">Search</Text>
          <Kbd>
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>K</Kbd.Content>
          </Kbd>
        </View>
        <View class="flex-row items-center justify-between gap-3">
          <Text class="text-sm text-foreground">New order</Text>
          <Kbd>
            <Kbd.Abbr keyValue="command" />
            <Kbd.Content>N</Kbd.Content>
          </Kbd>
        </View>
        <View class="flex-row items-center justify-between gap-3">
          <Text class="text-sm text-foreground">Close a dialog</Text>
          <Kbd>
            <Kbd.Content>Esc</Kbd.Content>
          </Kbd>
        </View>
      </Card.Content>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Quick actions</Card.Title>
      </Card.Header>
      <Card.Content>
        <Menu aria-label="Quick actions" className="w-full">
          <Menu.Item id="invite" textValue="Invite a teammate">
            <Label>Invite a teammate</Label>
          </Menu.Item>
          <Menu.Item id="export" textValue="Export my data">
            <Label>Export my data</Label>
          </Menu.Item>
          <Menu.Item id="sign-out" textValue="Sign out everywhere">
            <Label>Sign out everywhere</Label>
          </Menu.Item>
        </Menu>
      </Card.Content>
    </Card>
  );
}

function App() {
  return (
    <Page
      title="Profile"
      note="Your public details across the workspace."
      actions={<Button>Save changes</Button>}
    >
      <Surface className="flex-row items-center gap-3 rounded-3xl p-4">
        <View class="flex-auto gap-0.5">
          <Text class="text-sm font-medium text-foreground">Your profile is 80% complete</Text>
          <ProgressBar value={80}>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </View>
        <CloseButton aria-label="Dismiss the profile prompt" />
      </Surface>

      <Identity />

      <Section title="About">
        <About />
      </Section>

      <Grid>
        <Details />
        <Shortcuts />
        <QuickActions />
      </Grid>

      <Section title="FAQ">
        <Card>
          <Card.Content>
            <Accordion allowsMultipleExpanded>
              {FAQ.map((item) => (
                <Accordion.Item>
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      {item.title}
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>{item.content}</Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Card.Content>
        </Card>
      </Section>
    </Page>
  );
}

mount(App);
