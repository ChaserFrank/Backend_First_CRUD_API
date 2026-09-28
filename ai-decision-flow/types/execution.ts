import type { Decision } from "./workflow";

export type ExecutionStatus = "idle" | "running" | "completed" | "failed";

export type NodeExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface NodeExecutionResult {
  nodeId: string;
  nodeLabel: string;
  prompt: string;
  decision: Decision;
  nextNodeId: string | null;
  nextNodeLabel: string | null;
}

export interface ExecutionResult {
  runId: string;
  workflowId: string;
  status: "completed" | "failed";
  steps: NodeExecutionResult[];
  error?: string;
}

export interface NodeExecutionState {
  status: NodeExecutionStatus;
  decision?: Decision;
}

export interface ExecutionState {
  status: ExecutionStatus;
  runId?: string;
  nodeStates: Record<string, NodeExecutionState>;
  steps: NodeExecutionResult[];
  error?: string;
}
