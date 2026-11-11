import { signal, Text } from "nsh";
import { Button, Drawer } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

function DrawerFixture(props: { defaultOpen?: boolean; isOpen?: boolean; isDismissable?: boolean; isKeyboardDismissDisabled?: boolean; placement?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Drawer defaultOpen={props.defaultOpen} isOpen={props.isOpen} onOpenChange={probe("openChange")}>
      <Button>Open Drawer</Button>
      <Drawer.Backdrop isDismissable={props.isDismissable} isKeyboardDismissDisabled={props.isKeyboardDismissDisabled}>
        <Drawer.Content placement={props.placement}>
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.CloseTrigger />
            <Drawer.Header><Drawer.Heading>Drawer Title</Drawer.Heading></Drawer.Header>
            <Drawer.Body><Text>Drawer body content</Text><Button>Inside action</Button></Drawer.Body>
            <Drawer.Footer><Button slot="close">Confirm</Button></Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

function Basic() { return <Stage><DrawerFixture /></Stage>; }
function DefaultOpen() { return <Stage><DrawerFixture defaultOpen /></Stage>; }
function EscapeDisabled() { return <Stage><DrawerFixture defaultOpen isKeyboardDismissDisabled /></Stage>; }
function NotDismissable() { return <Stage><DrawerFixture defaultOpen isDismissable={false} /></Stage>; }
function RightPlacement() { return <Stage><DrawerFixture defaultOpen placement="right" /></Stage>; }
function Controlled() {
  const open = signal(false);
  return <Stage><Button onPress={() => open.set(true)}>Open Drawer</Button><Drawer isOpen={open()} onOpenChange={probe("openChange")}>
    <Drawer.Backdrop><Drawer.Content><Drawer.Dialog><Drawer.Header><Drawer.Heading>Drawer Title</Drawer.Heading></Drawer.Header><Drawer.Body><Text>Drawer body content</Text></Drawer.Body></Drawer.Dialog></Drawer.Content></Drawer.Backdrop>
  </Drawer></Stage>;
}
function Stacked() {
  return <Stage><Drawer defaultOpen><Button>Open parent drawer</Button><Drawer.Backdrop><Drawer.Content><Drawer.Dialog>
    <Drawer.Handle /><Drawer.Header><Drawer.Heading>Parent Drawer</Drawer.Heading></Drawer.Header><Drawer.Body>
      <Drawer defaultOpen><Button>Open child drawer</Button><Drawer.Backdrop><Drawer.Content><Drawer.Dialog>
        <Drawer.Handle /><Drawer.Header><Drawer.Heading>Child Drawer</Drawer.Heading></Drawer.Header><Drawer.Body><Text>Child drawer body</Text></Drawer.Body>
      </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer>
    </Drawer.Body>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer></Stage>;
}
function Labelled() {
  return <Stage><Drawer defaultOpen><Button>Open Drawer</Button><Drawer.Backdrop><Drawer.Content><Drawer.Dialog>
    <Drawer.Header><Drawer.Heading>title</Drawer.Heading></Drawer.Header><Drawer.Body><Text>description</Text></Drawer.Body>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer></Stage>;
}
function layout(name: string) {
  return (event: { bounds: { origin: { x: number; y: number }; size: { width: number; height: number } } }) =>
    probe("layout")({ name, x: event.bounds.origin.x, y: event.bounds.origin.y, width: event.bounds.size.width, height: event.bounds.size.height });
}
function GeometryBottom() {
  return <Stage><Drawer defaultOpen><Button>Open Drawer</Button><Drawer.Backdrop><Drawer.Content><Drawer.Dialog>
    <Drawer.Handle /><Drawer.CloseTrigger /><Drawer.Header onLayout={layout("header")}><Drawer.Heading>Drawer Title</Drawer.Heading></Drawer.Header>
    <Drawer.Body onLayout={layout("body")}><Text>Drawer body content</Text></Drawer.Body><Drawer.Footer onLayout={layout("footer")}><Button slot="close">Confirm</Button></Drawer.Footer>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer></Stage>;
}
function GeometryRight() {
  return <Stage><Drawer defaultOpen><Button>Open Drawer</Button><Drawer.Backdrop><Drawer.Content placement="right"><Drawer.Dialog>
    <Drawer.Handle /><Drawer.CloseTrigger /><Drawer.Header onLayout={layout("header")}><Drawer.Heading>Drawer Title</Drawer.Heading></Drawer.Header>
    <Drawer.Body onLayout={layout("body")}><Text>Drawer body content</Text></Drawer.Body><Drawer.Footer onLayout={layout("footer")}><Button slot="close">Confirm</Button></Drawer.Footer>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer></Stage>;
}

function SpacingSections() {
  return <Stage><Drawer defaultOpen><Button>Open Drawer</Button><Drawer.Backdrop><Drawer.Content><Drawer.Dialog onLayout={layout("dialog")}>
    <Drawer.Header onLayout={layout("header")}><Drawer.Heading>Drawer Title</Drawer.Heading></Drawer.Header>
    <Drawer.Body onLayout={layout("body")}><Text>Drawer body content</Text></Drawer.Body>
    <Drawer.Footer onLayout={layout("footer")}><Button>Confirm</Button></Drawer.Footer>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer></Stage>;
}
function SpacingHeaderFooter() {
  return <Stage><Drawer defaultOpen><Button>Open Drawer</Button><Drawer.Backdrop><Drawer.Content><Drawer.Dialog onLayout={layout("dialog")}>
    <Drawer.Header onLayout={layout("header")}><Drawer.Heading>Drawer Title</Drawer.Heading></Drawer.Header>
    <Drawer.Footer onLayout={layout("footer")}><Button>Confirm</Button></Drawer.Footer>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer></Stage>;
}
function SpacingFooterOnly() {
  return <Stage><Drawer defaultOpen><Button>Open Drawer</Button><Drawer.Backdrop><Drawer.Content><Drawer.Dialog onLayout={layout("dialog")}>
    <Drawer.Footer onLayout={layout("footer")}><Button>Confirm</Button></Drawer.Footer>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer></Stage>;
}
function SpacingHeaderOnly() {
  return <Stage><Drawer defaultOpen><Button>Open Drawer</Button><Drawer.Backdrop><Drawer.Content><Drawer.Dialog onLayout={layout("dialog")}>
    <Drawer.Header onLayout={layout("header")}><Drawer.Heading>Drawer Title</Drawer.Heading></Drawer.Header>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer></Stage>;
}

export const drawerScenarios: Record<string, Component> = {
  "drawer/basic": Basic,
  "drawer/default-open": DefaultOpen,
  "drawer/escape-disabled": EscapeDisabled,
  "drawer/not-dismissable": NotDismissable,
  "drawer/right-placement": RightPlacement,
  "drawer/controlled": Controlled,
  "drawer/stacked": Stacked,
  "drawer/labelled": Labelled,
  "drawer/geometry-bottom": GeometryBottom,
  "drawer/geometry-right": GeometryRight,
  "drawer/spacing-sections": SpacingSections,
  "drawer/spacing-header-footer": SpacingHeaderFooter,
  "drawer/spacing-footer-only": SpacingFooterOnly,
  "drawer/spacing-header-only": SpacingHeaderOnly,
};
