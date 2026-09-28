import type { WorkflowNode, WorkflowEdge, Decision } from "@/types/workflow";

/**
 * Given the current node ID, a YES/NO decision, and the list of edges,
 * returns the target node ID for the matching edge, or null if none exists.
 *
 * This function is pure and independent of React, Inngest, and OpenAI.
 */
export function getNextNodeId(
  currentNodeId: string,
  decision: Decision,
  edges: WorkflowEdge[]
): string | null {
  const edge = edges.find(
    (e) => e.source === currentNodeId && e.decision === decision
  );
  return edge?.target ?? null;
}

/**
 * Given a node ID and the list of nodes, returns the node or null if not found.
 */
export function findNode(
  nodeId: string,
  nodes: WorkflowNode[]
): WorkflowNode | null {
  return nodes.find((n) => n.id === nodeId) ?? null;
}

/**
 * Returns the starting node of the workflow: the node with no incoming edges.
 * Assumes validation has already confirmed exactly one starting node exists.
 */
export function findStartingNode(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode | null {
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !nodesWithIncoming.has(n.id)) ?? null;
}
