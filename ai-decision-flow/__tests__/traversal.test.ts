import { getNextNodeId, findNode, findStartingNode } from "@/lib/workflow/traversal";
import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

const nodes: WorkflowNode[] = [
  { id: "a", type: "decision", position: { x: 0, y: 0 }, data: { label: "A", prompt: "?" } },
  { id: "b", type: "decision", position: { x: 0, y: 200 }, data: { label: "B", prompt: "?" } },
  { id: "c", type: "decision", position: { x: 200, y: 200 }, data: { label: "C", prompt: "?" } },
];

const edges: WorkflowEdge[] = [
  { id: "e1", source: "a", target: "b", decision: "YES" },
  { id: "e2", source: "a", target: "c", decision: "NO" },
];

describe("getNextNodeId", () => {
  it("returns the correct target for YES", () => {
    expect(getNextNodeId("a", "YES", edges)).toBe("b");
  });

  it("returns the correct target for NO", () => {
    expect(getNextNodeId("a", "NO", edges)).toBe("c");
  });

  it("returns null when no matching edge exists", () => {
    expect(getNextNodeId("b", "YES", edges)).toBeNull();
    expect(getNextNodeId("b", "NO", edges)).toBeNull();
  });

  it("returns null for an unknown node ID", () => {
    expect(getNextNodeId("z", "YES", edges)).toBeNull();
  });
});

describe("findNode", () => {
  it("finds a node by ID", () => {
    const node = findNode("b", nodes);
    expect(node?.data.label).toBe("B");
  });

  it("returns null for a missing ID", () => {
    expect(findNode("z", nodes)).toBeNull();
  });
});

describe("findStartingNode", () => {
  it("returns the node with no incoming edges", () => {
    const start = findStartingNode(nodes, edges);
    expect(start?.id).toBe("a");
  });

  it("returns null when all nodes have incoming edges (cycle)", () => {
    const cycleEdges: WorkflowEdge[] = [
      { id: "e1", source: "a", target: "b", decision: "YES" },
      { id: "e2", source: "b", target: "a", decision: "NO" },
    ];
    const twoNodes = nodes.slice(0, 2);
    // Both nodes have incoming edges — no start
    const start = findStartingNode(twoNodes, cycleEdges);
    expect(start).toBeNull();
  });
});
