import { Typography } from "@heroui/react";
import { Stage } from "@scenario/stage";

/*
 * Shared Typography scenarios, written with HeroUI's API only, so the
 * reference app (npm @heroui/react 3.2.7) and this library render the same
 * JSX. Typography is a pure display component: no scenario needs probe().
 *
 * `basic`, `body`, `heading`, `paragraph`, `code` and `prose` back the ported
 * upstream cases (port sheet 4b T-001 … T-007). The remaining entries merge
 * the upstream stories: HeadingScale, BodySizes, InlineCode, Alignment,
 * WeightScale, MutedColor, Truncation and ProseBlock.
 *
 * ProseBlock is rewritten, not copied: NSH has no HTML elements, so the bare
 * `h1` / `p` / `code` become Typography parts. The story's `<blockquote>`,
 * `<ul>` / `<ol>`, `<hr>` and `<a>` have no part and no descendant selector,
 * so they stay out of the scenario (port sheet R-011 … R-014, R-016).
 */

function Basic() {
  return (
    <Stage>
      <Typography>HeroUI Typography</Typography>
    </Stage>
  );
}

function Body() {
  return (
    <Stage>
      <Typography>Body copy</Typography>
    </Stage>
  );
}

function Heading() {
  return (
    <Stage>
      <Typography.Heading level={2}>Section title</Typography.Heading>
    </Stage>
  );
}

function Paragraph() {
  return (
    <Stage>
      <Typography.Paragraph size="sm">Small copy</Typography.Paragraph>
    </Stage>
  );
}

function Code() {
  return (
    <Stage>
      <Typography.Code>const x = 1;</Typography.Code>
    </Stage>
  );
}

function Prose() {
  return (
    <Stage>
      <Typography.Prose>Prose content</Typography.Prose>
    </Stage>
  );
}

/* Story `HeadingScale`: all six levels mount, so the type table is exercised
 * in full. */
function Headings() {
  return (
    <Stage>
      <Typography.Heading level={1}>Heading Level 1</Typography.Heading>
      <Typography.Heading level={2}>Heading Level 2</Typography.Heading>
      <Typography.Heading level={3}>Heading Level 3</Typography.Heading>
      <Typography.Heading level={4}>Heading Level 4</Typography.Heading>
      <Typography.Heading level={5}>Heading Level 5</Typography.Heading>
      <Typography.Heading level={6}>Heading Level 6</Typography.Heading>
    </Stage>
  );
}

/* Story `BodySizes`: the three Paragraph sizes, each under a body-xs label. */
function BodySizes() {
  return (
    <Stage>
      <Typography color="muted" type="body-xs" weight="semibold">
        BODY — DEFAULT (BASE)
      </Typography>
      <Typography.Paragraph>
        Until now, trying to style an article, document, or blog post with Tailwind has been a
        tedious task that required a keen eye for typography and a lot of complex custom CSS.
      </Typography.Paragraph>
      <Typography color="muted" type="body-xs" weight="semibold">
        BODY — SMALL
      </Typography>
      <Typography.Paragraph size="sm">
        By default, Tailwind removes all of the default browser styling from paragraphs, headings,
        lists and more. This ends up being really useful for building application UIs because you
        spend less time undoing user-agent styles.
      </Typography.Paragraph>
      <Typography color="muted" type="body-xs" weight="semibold">
        BODY — EXTRA SMALL
      </Typography>
      <Typography.Paragraph size="xs">
        Fine print, captions, and secondary information are rendered at the smallest body size.
        This size is ideal for metadata, timestamps, or auxiliary details that should not compete
        with the primary content.
      </Typography.Paragraph>
    </Stage>
  );
}

/* Regression X-001: `color` belongs to the code parts as well, and upstream's
 * class order (`.typography--code` before `.typography--color-*`) lets a
 * resolved muted color override the code box's own `text-foreground`. The
 * last paragraph is the control: a code that only inherits the parent's muted
 * color keeps its own foreground, because the code class is what paints it. */
function CodeColor() {
  return (
    <Stage>
      <Typography color="muted">Muted body control</Typography>
      <Typography.Code color="muted">Muted code span</Typography.Code>
      <Typography type="code" color="muted">
        Muted typed code
      </Typography>
      <Typography.Paragraph>
        Paragraph with <Typography.Code color="muted">Muted nested code</Typography.Code> inside.
      </Typography.Paragraph>
      <Typography.Paragraph color="muted">
        Muted paragraph with <Typography.Code>Inherited code</Typography.Code> inside.
      </Typography.Paragraph>
    </Stage>
  );
}

/* Regression X-002: the inline code box carries upstream's `px-1.5 py-0.5`
 * (`heroui/packages/styles/components/typography.css:117-119`: 6 and 2 points).
 * Four U+2588 FULL BLOCK characters fill their monospace cells, so the painted
 * box's edge minus the glyph ink is the padding itself, with no side bearing
 * left to guess; the reference app draws the same shapes.
 *
 * The paragraph's line is `leading-7` (28), taller than the chip, so the line
 * never stretches the box: its height is the code's own `text-sm` line (20)
 * plus the two paddings. */
function CodePadding() {
  return (
    <Stage>
      <Typography.Paragraph className="leading-7">
        <Typography.Code>{"████"}</Typography.Code>
      </Typography.Paragraph>
    </Stage>
  );
}

/* Story `InlineCode`: a Code nested in a Paragraph is an inline span of the
 * same paragraph, as upstream's `<code>` inside `<p>`. */
function InlineCode() {
  return (
    <Stage>
      <Typography.Paragraph>
        Install the package with <Typography.Code>pnpm add @heroui/react</Typography.Code> and
        import <Typography.Code>{"<Typography>"}</Typography.Code> from the library.
      </Typography.Paragraph>
      <Typography.Paragraph size="sm">
        The <Typography.Code>typographyVariants</Typography.Code> function accepts{" "}
        <Typography.Code>type</Typography.Code>, <Typography.Code>align</Typography.Code>,{" "}
        <Typography.Code>color</Typography.Code>, and <Typography.Code>weight</Typography.Code>{" "}
        props.
      </Typography.Paragraph>
    </Stage>
  );
}

/* Story `Alignment`: the four align values, each under a body-xs label. */
function Alignment() {
  return (
    <Stage>
      <Typography color="muted" type="body-xs" weight="semibold">
        START (DEFAULT)
      </Typography>
      <Typography align="start">
        Text aligned to the start edge. In LTR layouts this means left-aligned; in RTL it flips
        automatically.
      </Typography>
      <Typography color="muted" type="body-xs" weight="semibold">
        CENTER
      </Typography>
      <Typography align="center">
        Center-aligned text works well for hero sections, headings, and call-to-action blocks
        where symmetry is important.
      </Typography>
      <Typography color="muted" type="body-xs" weight="semibold">
        END
      </Typography>
      <Typography align="end">
        End-aligned text is useful for numerical columns, timestamps, or any content that benefits
        from right-alignment in LTR contexts.
      </Typography>
      <Typography color="muted" type="body-xs" weight="semibold">
        JUSTIFY
      </Typography>
      <Typography align="justify">
        Justified text stretches each line so that both left and right edges are flush. This style
        is common in print design and long-form reading experiences where a clean text block is
        desired.
      </Typography>
    </Stage>
  );
}

/* Story `WeightScale`. */
function Weights() {
  return (
    <Stage>
      <Typography weight="normal">Normal weight — the browser default for body text.</Typography>
      <Typography weight="medium">Medium weight — slightly heavier for subtle emphasis.</Typography>
      <Typography weight="semibold">Semibold weight — used for subheadings and labels.</Typography>
      <Typography weight="bold">Bold weight — strong emphasis for important content.</Typography>
    </Stage>
  );
}

/* Story `MutedColor`: the default and muted colors side by side. */
function Colors() {
  return (
    <Stage>
      <Typography.Heading level={3}>Account Settings</Typography.Heading>
      <Typography.Paragraph>
        Manage your account preferences and personal information below.
      </Typography.Paragraph>
      <Typography.Paragraph color="muted" size="sm">
        Changes to your profile may take up to 24 hours to propagate across all services. Contact
        support if you need immediate assistance.
      </Typography.Paragraph>
    </Stage>
  );
}

/* Story `Truncation`: the same long text with and without `truncate`, held to
 * the story's max-w-xs so the ellipsis actually has a width to exceed. */
function Truncate() {
  return (
    <Stage>
      <Typography color="muted" type="body-xs" weight="semibold">
        WITHOUT TRUNCATION
      </Typography>
      <Typography className="max-w-xs">
        This is a long piece of text that will wrap naturally across multiple lines in a narrow
        container without any truncation applied.
      </Typography>
      <Typography color="muted" type="body-xs" weight="semibold">
        WITH TRUNCATION
      </Typography>
      <Typography truncate className="max-w-xs">
        This is a long piece of text that will be truncated with an ellipsis when it exceeds the
        available width of its container.
      </Typography>
    </Stage>
  );
}

/* Story `ProseBlock`, rewritten with Typography parts (no HTML elements). The
 * quote, lists, divider and link of the story are commented out: they have no
 * part and no descendant selector in NSH (port sheet 8). */
function ProseArticle() {
  return (
    <Stage>
      <Typography.Prose className="max-w-2xl">
        <Typography.Heading level={1}>Getting Started with HeroUI</Typography.Heading>
        <Typography.Paragraph>
          HeroUI is a modern React component library built on top of{" "}
          <Typography weight="semibold">Tailwind CSS v4</Typography> and{" "}
          <Typography weight="semibold">React Aria</Typography>. It provides accessible,
          customizable primitives that you can compose into complex interfaces.
        </Typography.Paragraph>
        <Typography.Heading level={2}>Installation</Typography.Heading>
        <Typography.Paragraph>
          Add the library to your project using your preferred package manager. The{" "}
          <Typography.Code>@heroui/react</Typography.Code> package includes every component:
        </Typography.Paragraph>
        <Typography.Code>pnpm add @heroui/react</Typography.Code>
        <Typography.Heading level={3}>Quick Setup</Typography.Heading>
        <Typography.Paragraph>
          Import the stylesheet in your application entry point and wrap your app with the
          provider:
        </Typography.Paragraph>
        {/* blockquote: no element, caller composes View + Text (R-012). */}
        <Typography.Heading level={3}>Key Features</Typography.Heading>
        <Typography.Paragraph>
          Fully accessible components built on React Aria primitives, a compound component API
          inspired by Radix UI, Tailwind CSS v4 styling with BEM-inspired class naming, and dark
          mode support out of the box.
        </Typography.Paragraph>
        <Typography.Heading level={3}>Component Categories</Typography.Heading>
        <Typography.Paragraph>
          Layout — Card, Surface, Header, Separator. Navigation — Tabs, Accordion, Breadcrumbs,
          Link. Forms — TextField, Checkbox, Radio, Select, Switch. Feedback — Alert, Spinner,
          Toast, Progress. Typography — Typography, Heading, Code, Prose.
        </Typography.Paragraph>
        {/* hr: no element, caller writes View with a top border (R-016). */}
        <Typography.Heading level={2}>Next Steps</Typography.Heading>
        <Typography.Paragraph>
          Explore the component stories in Storybook to see every variant and composition in
          action. Each component ships with comprehensive documentation and live examples.
        </Typography.Paragraph>
      </Typography.Prose>
    </Stage>
  );
}

/* Port sheet 4b: className is appended after the base classes, so the caller
 * wins (the root's text-base is overridden by text-2xl). */
function Custom() {
  return (
    <Stage>
      <Typography className="text-2xl">Custom size</Typography>
    </Stage>
  );
}

export const typographyScenarios = {
  "typography/basic": Basic,
  "typography/body": Body,
  "typography/heading": Heading,
  "typography/paragraph": Paragraph,
  "typography/code": Code,
  "typography/code-color": CodeColor,
  "typography/code-padding": CodePadding,
  "typography/prose": Prose,
  "typography/headings": Headings,
  "typography/body-sizes": BodySizes,
  "typography/inline-code": InlineCode,
  "typography/alignment": Alignment,
  "typography/weights": Weights,
  "typography/colors": Colors,
  "typography/truncate": Truncate,
  "typography/prose-article": ProseArticle,
  "typography/custom": Custom,
};
