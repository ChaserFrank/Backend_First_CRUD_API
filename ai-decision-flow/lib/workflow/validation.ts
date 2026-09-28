import type { Workflow, WorkflowEdge, WorkflowNode, Decision } from "@/types/workflow";

export type ValidationError = string;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateWorkflow(workflow: Workflow): ValidationResult {
  const errors: ValidationError[] = [];

  if (!workflow.nodes || workflow.nodes.length === 0) {
    return { valid: false, errors: ["Workflow has no nodes."] };
  }

  const nodeIds = new Set<string>();
  for (const node of workflow.nodes) {
    if (!node.id || node.id.trim() === "") {
      errors.push("A node is missing an ID.");
      continue;
    }
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: "${node.id}".`);
    }
    nodeIds.add(node.id);

    if (!node.data.label || node.data.label.trim() === "") {
      errors.push(`Node "${node.id}" is missing a label.`);
    }
    if (!node.data.prompt || node.data.prompt.trim() === "") {
      errors.push(`Node "${node.id}" is missing a prompt.`);
    }
  }

  // Find starting nodes: nodes with no incoming edges
  const nodesWithIncoming = new Set(workflow.edges.map((e) => e.target));
  const startingNodes = workflow.nodes.filter((n) => !nodesWithIncoming.has(n.id));

  if (startingNodes.length === 0) {
    errors.push("No starting node found (a node with no incoming edges is required).");
  } else if (startingNodes.length > 1) {
    errors.push(
      `Multiple starting nodes found: ${startingNodes.map((n) => `"${n.data.label}"`).join(", ")}. Only one is allowed.`
    );
  }

  const edgeIds = new Set<string>();
  for (const edge of workflow.edges) {
    if (!edge.id || edge.id.trim() === "") {
      errors.push("An edge is missing an ID.");
      continue;
    }
    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge ID: "${edge.id}".`);
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id}" references non-existent source node "${edge.source}".`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id}" references non-existent target node "${edge.target}".`);
    }

    if (edge.decision !== "YES" && edge.decision !== "NO") {
      errors.push(`Edge "${edge.id}" has invalid decision value "${edge.decision as string}". Must be YES or NO.`);
    }

    if (edge.source === edge.target) {
      errors.push(`Edge "${edge.id}" creates a self-loop on node "${edge.source}".`);
    }
  }

  // Check for duplicate YES/NO edges from the same source
  const edgeKeysSeen = new Set<string>();
  for (const edge of workflow.edges) {
    const key = `${edge.source}:${edge.decision}`;
    if (edgeKeysSeen.has(key)) {
      errors.push(
        `Node "${edge.source}" has multiple ${edge.decision} edges. Each node may have at most one YES and one NO edge.`
      );
    }
    edgeKeysSeen.add(key);
  }

  return { valid: errors.length === 0, errors };
}
