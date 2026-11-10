import { mount, Text, View } from "nsh";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  CloseButton,
  Description,
  Label,
  ListBox,
  Meter,
  Popover,
  ProgressBar,
  ProgressCircle,
  ScrollShadow,
  Surface,
  ToggleButton,
  Toolbar,
} from "hero-nsh";
import { Page, Row, Section } from "./ui";

const ACTIVITY = [
  { id: "1", who: "Grace", what: "shipped order #1041", when: "12 minutes ago" },
  { id: "2", who: "Alan", what: "opened a refund request", when: "1 hour ago" },
  { id: "3", who: "Katherine", what: "updated the return policy", when: "3 hours ago" },
  { id: "4", who: "Ada", what: "invited two teammates", when: "yesterday" },
  { id: "5", who: "Linus", what: "connected Stripe", when: "yesterday" },
];

function Stat(props: { label: string; value: string; delta: string; note: string; up?: boolean }) {
  return (
    <Card className="w-full sm:w-[240px]">
      <Card.Header>
        <Card.Title>{props.label}</Card.Title>
        <Card.Description>{props.note}</Card.Description>
      </Card.Header>
      <Card.Content className="gap-2">
        <View class="flex-row items-center gap-2">
          <Text class="text-2xl font-semibold text-foreground">{props.value}</Text>
          <Chip color={props.up === false ? "default" : "success"}>{props.delta}</Chip>
        </View>
      </Card.Content>
    </Card>
  );
}

function Goals() {
  return (
    <Row>
      <Card className="w-full sm:w-[300px]">
        <Card.Header>
          <Card.Title>Monthly goal</Card.Title>
          <Card.Description>$18,400 of $25,000</Card.Description>
        </Card.Header>
        <Card.Content>
          <ProgressBar value={74}>
            <ProgressBar.Output />
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </Card.Content>
      </Card>

      <Card className="w-full sm:w-[300px]">
        <Card.Header>
          <Card.Title>Storage</Card.Title>
          <Card.Description>68 GB of 100 GB</Card.Description>
        </Card.Header>
        <Card.Content>
          <Meter value={68}>
            <Meter.Output />
            <Meter.Track>
              <Meter.Fill />
            </Meter.Track>
          </Meter>
        </Card.Content>
      </Card>

      <Card className="w-full sm:w-[300px]">
        <Card.Header>
          <Card.Title>Uptime</Card.Title>
          <Card.Description>Last 30 days</Card.Description>
        </Card.Header>
        <Card.Content>
          <View class="flex-row items-center gap-3">
            <ProgressCircle aria-label="Uptime" value={99}>
              <ProgressCircle.Track>
                <ProgressCircle.TrackCircle />
                <ProgressCircle.FillCircle />
              </ProgressCircle.Track>
            </ProgressCircle>
            <Text class="text-sm text-foreground">99.98%</Text>
          </View>
        </Card.Content>
      </Card>
    </Row>
  );
}

function Activity() {
  return (
    <Card>
      <Card.Header>
        <View class="flex-row items-center justify-between gap-3">
          <Card.Title>Recent activity</Card.Title>
          <Popover>
            <Button variant="ghost">How is this counted?</Button>
            <Popover.Content>
              <Popover.Dialog>
                <Popover.Heading>Recent activity</Popover.Heading>
                <Text class="text-sm text-foreground">
                  Every order, refund and member change from the last seven days.
                </Text>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </View>
      </Card.Header>
      <Card.Content>
        <ScrollShadow className="h-56 w-full">
          <ListBox aria-label="Recent activity" className="w-full">
            {ACTIVITY.map((entry) => (
              <ListBox.Item id={entry.id} textValue={`${entry.who} ${entry.what}`}>
                <Avatar>
                  <Avatar.Fallback>{entry.who.charAt(0)}</Avatar.Fallback>
                </Avatar>
                <View class="flex-auto flex-col">
                  <Label>{entry.who}</Label>
                  <Description>{entry.what}</Description>
                </View>
                <Text class="text-xs text-muted">{entry.when}</Text>
              </ListBox.Item>
            ))}
          </ListBox>
        </ScrollShadow>
      </Card.Content>
    </Card>
  );
}

function App() {
  return (
    <Page
      title="Overview"
      note="What happened in the workspace this week."
      actions={
        <Toolbar aria-label="Date range">
          <ToggleButton defaultSelected>7 days</ToggleButton>
          <ToggleButton>30 days</ToggleButton>
          <Button variant="tertiary">Export</Button>
        </Toolbar>
      }
    >
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Three invoices failed to collect.</Alert.Title>
          <Alert.Description>Update the payment method before Friday.</Alert.Description>
        </Alert.Content>
        <Button variant="danger-soft">Review</Button>
      </Alert>

      <Surface className="flex-row items-center gap-3 rounded-2xl p-4">
        <View class="flex-auto gap-0.5">
          <Text class="text-sm font-medium text-foreground">New: bulk refunds</Text>
          <Text class="text-xs text-muted">Select several orders and refund them at once.</Text>
        </View>
        <CloseButton aria-label="Dismiss the announcement" />
      </Surface>

      <Section title="Numbers">
        <Row>
          <Stat label="Active users" value="1,284" delta="+8%" note="Compared with last week" />
          <Stat label="Revenue" value="$24.6k" delta="+12%" note="Compared with last week" />
          <Stat label="Open tickets" value="12" delta="-3" note="Compared with last week" up={false} />
        </Row>
      </Section>

      <Section title="This month">
        <Goals />
      </Section>

      <Activity />
    </Page>
  );
}

mount(App);
