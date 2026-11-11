import { host, mount, Text } from "nsh";
import type { JSX } from "nsh";
import { AlertDialog, Button } from "@heroui/react";
import { probe } from "@scenario/probe";

/*
 * NSH-only AlertDialog fixture (port sheet 4c, G-001), not a shared scenario.
 *
 * G-001 reads resolved geometry, which a HeroUI-only scenario cannot record: it
 * needs `onLayout` on the parts. This fixture renders the same part tree as
 * `alert-dialog/basic` (the upstream fixture's JSX) and records each part's box:
 *
 *   container  the positioning carrier: taller than, and containing, the card
 *   dialog     the card itself
 *   header     the heading row, above the body
 *   body       the content column, above the footer
 *   footer     the action row, never above the body
 *
 * It sits next to harness/nsh.json on purpose: NSH takes the entry's own
 * directory as the app root, so a fixture under harness/tests/... would find no
 * nsh.json and lose the `@heroui/react` alias and the theme.
 */

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

type LayoutName = "container" | "dialog" | "header" | "body" | "footer";

function layoutProbe(name: LayoutName) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function Geometry() {
  return (
    <AlertDialog defaultOpen onOpenChange={probe("openChange")}>
      <Button>Delete Project</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container onLayout={layoutProbe("container")}>
          <AlertDialog.Dialog onLayout={layoutProbe("dialog")}>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header onLayout={layoutProbe("header")}>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete project permanently?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body onLayout={layoutProbe("body")}>
              <Text>This action cannot be undone.</Text>
              <Text>The project and everything inside it is deleted permanently.</Text>
            </AlertDialog.Body>
            <AlertDialog.Footer onLayout={layoutProbe("footer")}>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button slot="close" variant="danger">
                Delete Project
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

const entries: Record<string, () => JSX.Element> = {
  geometry: Geometry,
};

function Fixture() {
  const name = String(host.params.fixture ?? "");
  const Entry = entries[name];

  if (!Entry) return <Text>{`unknown fixture: ${name}`}</Text>;

  return <Entry />;
}

mount(Fixture);
