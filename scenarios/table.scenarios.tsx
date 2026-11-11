import { Checkbox, Table } from "@heroui/react";
import { Stage } from "@scenario/stage";
import { probe } from "@scenario/probe";
import type { Component } from "./types";

type LayoutEvent = {
  bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function layout(name: string) {
  return (event: LayoutEvent) =>
    probe("layout")({
      name,
      x: event.bounds.origin.x,
      y: event.bounds.origin.y,
      width: event.bounds.size.width,
      height: event.bounds.size.height,
    });
}

function WideTable() {
  return (
    <Stage>
      <Table className="w-[420px]" onLayout={layout("root")}>
        <Table.ScrollContainer onLayout={layout("scroll")}>
          <Table.Content className="min-w-[800px]" onLayout={layout("content")}>
            <Table.Header>
              <Table.Column>Member</Table.Column>
              <Table.Column>Role</Table.Column>
            </Table.Header>
            <Table.Body>
              <Table.Row id="one">
                <Table.Cell>Ada</Table.Cell>
                <Table.Cell>Engineer</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        <Table.Footer onLayout={layout("footer")}>Pagination</Table.Footer>
      </Table>
    </Stage>
  );
}

function ContentRows() {
  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.Content>
          <Table.Header>
            <Table.Column onLayout={layout("header-member")}>Member</Table.Column>
            <Table.Column onLayout={layout("header-role")}>Role</Table.Column>
          </Table.Header>
          <Table.Body>
            <Table.Row id="short" onLayout={layout("short-row")}>
              <Table.Cell onLayout={layout("short-cell")}>Ada</Table.Cell>
              <Table.Cell>Engineer</Table.Cell>
            </Table.Row>
            <Table.Row id="long" onLayout={layout("long-row")}>
              <Table.Cell onLayout={layout("long-cell")}>
                Grace — grace@example.test — additional text to wrap and increase this cell's intrinsic height.
              </Table.Cell>
              <Table.Cell>Research engineer</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Content>
      </Table>
    </Stage>
  );
}

function FooterOrder(props: { rows: boolean }) {
  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.Content>
          <Table.Header>
            <Table.Column>Member</Table.Column>
          </Table.Header>
          <Table.Body onLayout={layout("body")}>
            {props.rows && (
              <>
                <Table.Row id="one"><Table.Cell>Ada</Table.Cell></Table.Row>
                <Table.Row id="two"><Table.Cell>Grace</Table.Cell></Table.Row>
                <Table.Row id="three"><Table.Cell>Lin</Table.Cell></Table.Row>
              </>
            )}
          </Table.Body>
        </Table.Content>
        <Table.Footer onLayout={layout("footer")}>Pagination</Table.Footer>
      </Table>
    </Stage>
  );
}

export const tableScenarios: Record<string, Component> = {
  "table/layout-wide": WideTable,
  "table/layout-content-rows": ContentRows,
  "table/layout-footer-empty": () => <FooterOrder rows={false} />,
  "table/layout-footer-rows": () => <FooterOrder rows />,
};


function SelectionTable() {
  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.Content
          aria-label="Selection"
          selectionMode="multiple"
          onSelectionChange={(keys) => probe("selection")(keys === "all" ? "all" : [...keys])}
        >
          <Table.Header>
            <Table.Column>
              <Checkbox aria-label="Select all" slot="selection">
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            </Table.Column>
            <Table.Column>Member</Table.Column>
          </Table.Header>
          <Table.Body>
            <Table.Row id="one">
              <Table.Cell>
                <Checkbox aria-label="Select Ada" slot="selection">
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </Table.Cell>
              <Table.Cell>Ada</Table.Cell>
            </Table.Row>
            <Table.Row id="two">
              <Table.Cell>
                <Checkbox aria-label="Select Grace" slot="selection">
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </Table.Cell>
              <Table.Cell>Grace</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Content>
      </Table>
    </Stage>
  );
}

function ResizableTable() {
  return (
    <Stage>
      <Table className="w-[420px]">
        <Table.ResizableContainer
          onResizeStart={() => probe("resize")("start")}
          onResize={() => probe("resize")("move")}
          onResizeEnd={() => probe("resize")("end")}
        >
          <Table.Content aria-label="Resizable">
            <Table.Header>
              <Table.Column id="name" width={120}>
                Member
                <Table.ColumnResizer aria-label="Resize member" />
              </Table.Column>
              <Table.Column id="role">Role</Table.Column>
            </Table.Header>
            <Table.Body>
              <Table.Row id="one">
                <Table.Cell>Ada</Table.Cell>
                <Table.Cell>Engineer</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Content>
        </Table.ResizableContainer>
      </Table>
    </Stage>
  );
}

tableScenarios["table/selection"] = SelectionTable;
tableScenarios["table/resizable"] = ResizableTable;
