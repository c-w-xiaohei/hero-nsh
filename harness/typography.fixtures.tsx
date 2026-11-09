import { mount } from "nsh";
import { Typography } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";

/*
 * NSH-only Typography fixture for the inline code regressions (X-003 / X-004).
 *
 * `onTextLayout` is an NSH `Text` host prop with no HeroUI equivalent, so these
 * cases cannot live in a shared scenario: the reference app would receive an
 * unknown attribute. The callback reports every laid-out line's box, which is
 * the only channel that sees a line's height (`spanStyle` reports font size but
 * no leading).
 *
 * Three body-sm paragraphs (14 / 24) at the same width carry the same copy:
 *
 *   plain-sm   the paragraph alone. Every line is 24; the control.
 *   code-sm    the same copy with `Typography.Code` inline where the code goes.
 *              Every line must still be 24, and the code's resolved size must
 *              stay 14: the chip is a 20-point attachment inside a 24-point
 *              strut, so it has no reason to grow the line, and it must inherit
 *              the paragraph's leading instead of getting body's 16 / 28.
 *   base-span  the same copy with a nested body `Typography` span, whose
 *              16 / 28 is the shape the port wrongly put on the code root. Its
 *              line must grow to 28, which proves the probe sees growth rather
 *              than reporting the strut for every line.
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 */

const COPY =
  "Typography lays out running text at a fixed size and leading, so an inline code chip has to sit inside the paragraph line instead of stretching it. A chip that carries its own body layout, or one whose box is taller than the line it sits in, breaks the rhythm of every paragraph that mentions an API name.";

type TextLayoutEvent = {
  lines: Array<{ text: string; bounds: { size: { height: number } } }>;
};

function linesProbe(name: "plain-sm" | "code-sm" | "base-span") {
  return (event: TextLayoutEvent) =>
    probe("lines")({
      name,
      lines: event.lines.map((line) => ({
        text: line.text,
        height: line.bounds.size.height,
      })),
    });
}

function Fixture() {
  return (
    <Stage>
      <Typography.Paragraph size="sm" className="w-80" onTextLayout={linesProbe("plain-sm")}>
        {COPY}
      </Typography.Paragraph>
      <Typography.Paragraph size="sm" className="w-80" onTextLayout={linesProbe("code-sm")}>
        {"Typography lays out running text at a fixed size and leading, so an inline code chip has to sit inside the paragraph line instead of stretching it. "}
        <Typography.Code>typographyVariants</Typography.Code>
        {" A chip that carries its own body layout, or one whose box is taller than the line it sits in, breaks the rhythm of every paragraph that mentions an API name."}
      </Typography.Paragraph>
      <Typography.Paragraph size="sm" className="w-80" onTextLayout={linesProbe("base-span")}>
        {"Typography lays out running text at a fixed size and leading, so an inline code chip has to sit inside the paragraph line instead of stretching it. "}
        <Typography className="text-base leading-7">baseSpanVariant</Typography>
        {" A chip that carries its own body layout, or one whose box is taller than the line it sits in, breaks the rhythm of every paragraph that mentions an API name."}
      </Typography.Paragraph>
    </Stage>
  );
}

mount(Fixture);
