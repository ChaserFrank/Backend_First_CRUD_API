import { inngest } from "./client";
import { WORKFLOW_RUN_EVENT } from "./events";
import { evaluateDecision } from "@/lib/openai/decision";
import { findStartingNode, findNode, getNextNodeId } from "@/lib/workflow/traversal";
import type { Workflow } from "@/types/workflow";
import type { NodeExecutionResult, ExecutionResult } from "@/types/execution";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    triggers: [{ event: WORKFLOW_RUN_EVENT }],
  },
  async ({ event, step }) => {
    const workflow: Workflow = JSON.parse(event.data.workflowJson as string);

    const startingNode = findStartingNode(workflow.nodes, workflow.edges);
    if (!startingNode) {
      throw new Error("No starting node found in workflow.");
    }

    const steps: NodeExecutionResult[] = [];
    let currentNode = startingNode;

    // Guard against runaway execution
    const MAX_STEPS = 50;
    let stepCount = 0;

    while (currentNode && stepCount < MAX_STEPS) {
      stepCount++;

      const nodeId = currentNode.id;
      const nodeLabel = currentNode.data.label;
      const prompt = currentNode.data.prompt;

      // Each node execution is a named Inngest step for observability
      const result = await step.run(`node-${nodeId}`, async () => {
        const decision = await evaluateDecision(prompt);
        const nextNodeId = getNextNodeId(nodeId, decision, workflow.edges);
        const nextNode = nextNodeId ? findNode(nextNodeId, workflow.nodes) : null;

        const stepResult: NodeExecutionResult = {
          nodeId,
          nodeLabel,
          prompt,
          decision,
          nextNodeId: nextNodeId ?? null,
          nextNodeLabel: nextNode?.data.label ?? null,
        };

        return stepResult;
      });

      steps.push(result);

      if (result.nextNodeId) {
        const nextNode = findNode(result.nextNodeId, workflow.nodes);
        if (!nextNode) {
          throw new Error(`Next node "${result.nextNodeId}" not found in workflow.`);
        }
        currentNode = nextNode;
      } else {
        // No matching edge — workflow is complete
        break;
      }
    }

    if (stepCount >= MAX_STEPS) {
      throw new Error("Workflow exceeded maximum step limit (50). Possible cycle detected.");
    }

    const executionResult: ExecutionResult = {
      runId: event.id,
      workflowId: workflow.id,
      status: "completed",
      steps,
    };

    return executionResult;
  }
);
