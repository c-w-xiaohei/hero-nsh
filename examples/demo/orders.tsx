import { mount, Text, View } from "nsh";
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Chip,
  CloseButton,
  Description,
  Dropdown,
  EmptyState,
  Label,
  Link,
  ListBox,
  Modal,
  Pagination,
  SearchField,
  Select,
  Skeleton,
  Tabs,
} from "hero-nsh";
import { Page } from "./ui";

const ORDERS = [
  { id: "1042", name: "Ada Lovelace", detail: "#1042 · today", state: "Open", amount: "$240.00", urgent: true },
  { id: "1041", name: "Grace Hopper", detail: "#1041 · yesterday", state: "Open", amount: "$96.00", urgent: false },
  { id: "1040", name: "Alan Turing", detail: "#1040 · 2 days ago", state: "Shipped", amount: "$1,280.00", urgent: false },
  { id: "1039", name: "Katherine Johnson", detail: "#1039 · 3 days ago", state: "Shipped", amount: "$48.00", urgent: false },
];

const SORTS = [
  { id: "newest", name: "Newest first" },
  { id: "oldest", name: "Oldest first" },
  { id: "amount", name: "Largest amount" },
];

function Filters() {
  return (
    <View class="w-full gap-4 rounded-3xl bg-surface p-4 shadow-surface dark:shadow-surface-dark lg:w-[240px] lg:shrink-0">
      <Text class="text-sm font-medium text-foreground">Filters</Text>
      <SearchField className="w-full" name="search">
        <Label>Search orders</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Name or number" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      <Select className="w-full" defaultSelectedKey="newest">
        <Label>Sort by</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {SORTS.map((sort) => (
              <ListBox.Item id={sort.id} textValue={sort.name}>
                {sort.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <View class="flex-row items-center gap-2 rounded-full bg-default px-3 py-1.5">
        <Text class="text-xs text-default-foreground">Open only</Text>
        <CloseButton aria-label="Clear the status filter" />
      </View>

      <Dropdown>
        <Button variant="secondary">Bulk actions</Button>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item id="archive" textValue="Archive">
              <Label>Archive</Label>
            </Dropdown.Item>
            <Dropdown.Item id="export" textValue="Export">
              <Label>Export as CSV</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </View>
  );
}

function OrderList() {
  return (
    <ListBox aria-label="Orders" className="w-full" selectionMode="single">
      {ORDERS.map((order) => (
        <ListBox.Item id={order.id} textValue={`#${order.id} ${order.name}`}>
          <Badge.Anchor>
            <Avatar>
              <Avatar.Fallback>{order.name.charAt(0)}</Avatar.Fallback>
            </Avatar>
            {order.urgent ? <Badge>!</Badge> : null}
          </Badge.Anchor>
          <View class="flex-auto min-w-[120px] flex-col gap-1">
            <View class="flex-row flex-wrap items-center gap-2">
              <Label>{order.name}</Label>
              {order.urgent ? <Chip color="danger">Urgent</Chip> : null}
              <Chip color={order.state === "Open" ? "accent" : "default"}>{order.state}</Chip>
            </View>
            <Description>{order.detail}</Description>
          </View>
          <Text class="text-sm text-foreground">{order.amount}</Text>
          <ListBox.ItemIndicator />
        </ListBox.Item>
      ))}
    </ListBox>
  );
}

function App() {
  return (
    <Page
      title="Orders"
      note="Everything sold this month, newest first."
      actions={
        <View class="flex-row flex-wrap items-center gap-2">
          <Link href="https://example.com/exports">Export</Link>
          <Modal>
            <Button variant="secondary">Refund policy</Button>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Refund policy</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <Text class="text-sm text-foreground">
                      Orders can be refunded within 30 days of delivery. Refunds return to the
                      original payment method in three to five business days.
                    </Text>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button slot="close">Got it</Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
          <Button>New order</Button>
        </View>
      }
    >
      <Breadcrumbs>
        <Breadcrumbs.Item href="#home">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item href="#orders">Orders</Breadcrumbs.Item>
        <Breadcrumbs.Item>All orders</Breadcrumbs.Item>
      </Breadcrumbs>

      <Tabs>
        <Tabs.ListContainer className="w-fit">
          <Tabs.List aria-label="Order state">
            <Tabs.Tab id="all">
              All
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="open">
              Open
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="shipped">
              Shipped
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="gap-4 pt-4" id="all">
          <View class="flex-col gap-4 lg:flex-row lg:items-start">
            <Filters />
            <View class="flex-1 gap-4">
              <View class="rounded-3xl bg-surface p-2 shadow-surface dark:shadow-surface-dark">
                <View class="flex-row items-center justify-between px-3 pb-1 pt-2">
                  <Text class="text-xs font-medium text-muted">Order</Text>
                  <Text class="text-xs font-medium text-muted">Amount</Text>
                </View>
                <OrderList />
              </View>
              <View class="flex-row items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Text class="text-sm text-muted">Loading more orders…</Text>
              </View>
              <Pagination>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous aria-label="Previous page">
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
                <Pagination.Next aria-label="Next page">
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </View>
          </View>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="open">
          <EmptyState>No open orders right now. Everything is packed.</EmptyState>
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="shipped">
          <EmptyState>No shipped orders yet this month.</EmptyState>
        </Tabs.Panel>
      </Tabs>
    </Page>
  );
}

mount(App);
