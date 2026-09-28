export type Decision = "YES" | "NO";

export interface DecisionNodeData {
  label: string;
  prompt: string;
  [key: string]: unknown;
}

export interface WorkflowNode {
  id: string;
  type: "decision";
  position: { x: number; y: number };
  data: DecisionNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  decision: Decision;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
