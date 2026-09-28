import { validateWorkflow } from "@/lib/workflow/validation";
import type { Workflow } from "@/types/workflow";

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: "wf-1",
    name: "Test Workflow",
    nodes: [
      {
        id: "a",
        type: "decision",
        position: { x: 0, y: 0 },
        data: { label: "Node A", prompt: "Is this a question?" },
      },
      {
        id: "b",
        type: "decision",
        position: { x: 0, y: 200 },
        data: { label: "Node B", prompt: "Is this urgent?" },
      },
    ],
    edges: [{ id: "e1", source: "a", target: "b", decision: "YES" }],
    ...overrides,
  };
}

describe("validateWorkflow", () => {
  it("accepts a valid workflow", () => {
    const result = validateWorkflow(makeWorkflow());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an empty workflow", () => {
    const result = validateWorkflow(makeWorkflow({ nodes: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Workflow has no nodes.");
  });

  it("rejects a workflow with no starting node (all nodes have incoming edges)", () => {
    const wf = makeWorkflow({
      edges: [
        { id: "e1", source: "a", target: "b", decision: "YES" },
        { id: "e2", source: "b", target: "a", decision: "NO" },
      ],
    });
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("starting node"))).toBe(true);
  });

  it("rejects a workflow with multiple starting nodes", () => {
    const wf = makeWorkflow({ edges: [] });
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Multiple starting"))).toBe(true);
  });

  it("rejects invalid edge references (non-existent source)", () => {
    const wf = makeWorkflow({
      edges: [{ id: "e1", source: "z", target: "b", decision: "YES" }],
    });
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"z"'))).toBe(true);
  });

  it("rejects invalid edge references (non-existent target)", () => {
    const wf = makeWorkflow({
      edges: [{ id: "e1", source: "a", target: "z", decision: "YES" }],
    });
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"z"'))).toBe(true);
  });

  it("rejects edges with invalid decision values", () => {
    const wf = makeWorkflow({
      edges: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: "e1", source: "a", target: "b", decision: "MAYBE" as any },
      ],
    });
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("MAYBE"))).toBe(true);
  });

  it("rejects duplicate YES edges from the same source", () => {
    const wf = makeWorkflow({
      nodes: [
        { id: "a", type: "decision", position: { x: 0, y: 0 }, data: { label: "A", prompt: "Q?" } },
        { id: "b", type: "decision", position: { x: 0, y: 200 }, data: { label: "B", prompt: "Q?" } },
        { id: "c", type: "decision", position: { x: 200, y: 200 }, data: { label: "C", prompt: "Q?" } },
      ],
      edges: [
        { id: "e1", source: "a", target: "b", decision: "YES" },
        { id: "e2", source: "a", target: "c", decision: "YES" },
      ],
    });
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("multiple YES"))).toBe(true);
  });

  it("rejects a node missing a prompt", () => {
    const wf = makeWorkflow({
      nodes: [
        { id: "a", type: "decision", position: { x: 0, y: 0 }, data: { label: "A", prompt: "" } },
        { id: "b", type: "decision", position: { x: 0, y: 200 }, data: { label: "B", prompt: "Q?" } },
      ],
    });
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"a"') && e.includes("prompt"))).toBe(true);
  });
});
