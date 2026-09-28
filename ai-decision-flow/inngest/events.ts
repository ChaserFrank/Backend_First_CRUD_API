export const WORKFLOW_RUN_EVENT = "workflow/run" as const;

export interface WorkflowRunEventData {
  workflowJson: string; // serialized Workflow
}
