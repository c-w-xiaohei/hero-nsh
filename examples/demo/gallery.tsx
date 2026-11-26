import { mount, Text, View } from "nsh";
import "./fonts";
import { Page, Section } from "./ui";
import { DataSection } from "./gallery/data";
import { DemosSection } from "./gallery/demos";
import { FeedbackSection } from "./gallery/feedback";
import { FormsSection } from "./gallery/forms";

/**
 * The published site's front page: the standalone example apps first, then
 * every component `hero-nsh` exports, grouped the way HeroUI's documentation
 * groups them, on one scrolling page. The catalogue is not a product screen:
 * each block shows the component in its usual states, drawn with the theme this
 * package ships, so what you see is what a bare consumer gets. Overlays
 * (popover, menu, modal, drawer, tooltip, toast) open from a trigger, so they
 * are reached by pressing their button.
 *
 * The page is split into one file per group:
 *   gallery/demos.tsx     the standalone apps, linked
 *   gallery/forms.tsx     actions and everything that takes input
 *   gallery/data.tsx      content: cards, tables, lists, progress, typography
 *   gallery/feedback.tsx  alerts, and the things that float over the page
 */
const GROUPS = [
  {
    title: "Forms",
    items: "Button, ToggleButton, Link, Kbd, TextField, InputGroup, SearchField, Select, ComboBox, Autocomplete, NumberField, DateField, TimeField, InputOTP, Checkbox, Radio, Switch, Slider, Form, Fieldset, and the color controls",
  },
  {
    title: "Data display",
    items: "Card, Surface, Table, ListBox, Accordion, Disclosure, Tabs, Pagination, Breadcrumbs, Toolbar, Tag, Chip, Badge, Avatar, Meter, progress, Spinner, Skeleton, Separator, ScrollShadow, EmptyState, Typography",
  },
  {
    title: "Feedback",
    items: "Alert, AlertDialog, Modal, Drawer, Popover, Dropdown, Menu, Tooltip, Toast, CloseButton",
  },
];

function Contents() {
  return (
    <Section title="Component catalogue">
      <View class="flex flex-col gap-2 md:flex-row md:items-start">
        {GROUPS.map((group) => (
          <View class="flex-auto gap-1 rounded-xl bg-surface p-3">
            <Text class="text-sm font-medium text-surface-foreground">{group.title}</Text>
            <Text class="text-xs text-muted">{group.items}</Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function App() {
  return (
    <Page
      title="Hero NSH"
      note="Example apps and every export of hero-nsh, drawn with the theme the package ships."
      maxWidth="max-w-[1100px]"
    >
      <DemosSection />
      <Contents />
      <FormsSection />
      <DataSection />
      <FeedbackSection />
    </Page>
  );
}

mount(() => <App />);
