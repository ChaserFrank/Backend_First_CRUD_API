"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Edge,
  MarkerType,
  Panel,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { DecisionNode, type DecisionNodeType } from "./decision-node";
import { NodeEditPanel } from "./node-panel";
import { ExecutionPanel } from "./execution-panel";
import { WorkflowToolbar } from "./workflow-toolbar";
import { toast } from "sonner";

import type { Workflow, WorkflowNode, WorkflowEdge } from "@/types/workflow";
import type { ExecutionState, NodeExecutionStatus } from "@/types/execution";
import { validateWorkflow } from "@/lib/workflow/validation";
import { saveWorkflow, loadWorkflow, exportWorkflowJson, importWorkflowJson } from "@/lib/workflow/persistence";

type RFNode = Node<DecisionNodeType["data"], "decision">;

// Map a workflow node to a React Flow node
function toRFNode(
  node: WorkflowNode,
  nodeStates: Record<string, { status: NodeExecutionStatus; decision?: "YES" | "NO" }>,
  onEditPrompt: (id: string, prompt: string, label: string) => void
): RFNode {
  const execState = nodeStates[node.id];
  return {
    id: node.id,
    type: "decision" as const,
    position: node.position,
    data: {
      label: node.data.label,
      prompt: node.data.prompt,
      executionStatus: execState?.status,
      decision: execState?.decision,
      onEditPrompt,
    },
  };
}

function toRFEdge(edge: WorkflowEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.decision.toLowerCase(),
    label: edge.decision,
    animated: false,
    style: {
      stroke: edge.decision === "YES" ? "#22c55e" : "#ef4444",
      strokeWidth: 2,
    },
    labelStyle: {
      fill: edge.decision === "YES" ? "#16a34a" : "#dc2626",
      fontWeight: 700,
      fontSize: 11,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.decision === "YES" ? "#22c55e" : "#ef4444",
    },
  };
}

const nodeTypes = { decision: DecisionNode };

function createDefaultWorkflow(): Workflow {
  return {
    id: `wf-${Date.now()}`,
    name: "My Workflow",
    nodes: [
      {
        id: "node-1",
        type: "decision",
        position: { x: 250, y: 100 },
        data: {
          label: "Is this a support request?",
          prompt: "Is this a support request? Answer YES or NO.",
        },
      },
      {
        id: "node-2",
        type: "decision",
        position: { x: 100, y: 300 },
        data: {
          label: "Support Node",
          prompt: "Does the user need immediate assistance? Answer YES or NO.",
        },
      },
      {
        id: "node-3",
        type: "decision",
        position: { x: 400, y: 300 },
        data: {
          label: "Sales Node",
          prompt: "Is the user interested in purchasing? Answer YES or NO.",
        },
      },
    ],
    edges: [
      { id: "edge-1-2", source: "node-1", target: "node-2", decision: "YES" },
      { id: "edge-1-3", source: "node-1", target: "node-3", decision: "NO" },
    ],
  };
}

export function WorkflowEditor() {
  const [workflow, setWorkflow] = useState<Workflow>(createDefaultWorkflow);
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: "idle",
    nodeStates: {},
    steps: [],
  });
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);

  // Node edit panel state
  const [editPanel, setEditPanel] = useState<{
    open: boolean;
    nodeId: string;
    label: string;
    prompt: string;
  }>({ open: false, nodeId: "", label: "", prompt: "" });

  // Keep a stable ref to avoid stale closures
  const workflowRef = useRef(workflow);
  workflowRef.current = workflow;

  const openEditPrompt = useCallback((id: string, prompt: string, label: string) => {
    setEditPanel({ open: true, nodeId: id, label, prompt });
  }, []);

  // Sync workflow → React Flow nodes/edges whenever workflow or nodeStates change
  useEffect(() => {
    setNodes(
      workflow.nodes.map((n) =>
        toRFNode(n, executionState.nodeStates, openEditPrompt)
      )
    );
    setEdges(workflow.edges.map(toRFEdge));
  }, [workflow, executionState.nodeStates, openEditPrompt, setNodes, setEdges]);

  // Load persisted workflow on mount
  useEffect(() => {
    const saved = loadWorkflow();
    if (saved) setWorkflow(saved);
  }, []);

  // ── Node/edge manipulation ──────────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: NodeChange<RFNode>[]) => {
      onNodesChange(changes);

      // Propagate position changes back to workflow state
      const moveChanges = changes.filter((c) => c.type === "position" && c.position);
      if (moveChanges.length > 0) {
        setWorkflow((wf) => {
          const posMap: Record<string, { x: number; y: number }> = {};
          moveChanges.forEach((c) => {
            if (c.type === "position" && c.position) {
              posMap[c.id] = c.position;
            }
          });
          return {
            ...wf,
            nodes: wf.nodes.map((n) =>
              posMap[n.id] ? { ...n, position: posMap[n.id] } : n
            ),
          };
        });
      }

      // Remove deleted nodes from workflow
      const removeChanges = changes.filter((c) => c.type === "remove");
      if (removeChanges.length > 0) {
        const removedIds = new Set(removeChanges.map((c) => c.id));
        setWorkflow((wf) => ({
          ...wf,
          nodes: wf.nodes.filter((n) => !removedIds.has(n.id)),
          edges: wf.edges.filter(
            (e) => !removedIds.has(e.source) && !removedIds.has(e.target)
          ),
        }));
      }
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      onEdgesChange(changes);
      const removeChanges = changes.filter((c) => c.type === "remove");
      if (removeChanges.length > 0) {
        const removedIds = new Set(removeChanges.map((c) => c.id));
        setWorkflow((wf) => ({
          ...wf,
          edges: wf.edges.filter((e) => !removedIds.has(e.id)),
        }));
      }
    },
    [onEdgesChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const decision =
        connection.sourceHandle === "yes"
          ? "YES"
          : connection.sourceHandle === "no"
            ? "NO"
            : null;

      if (!decision) {
        toast.error("Connect from the YES or NO handle on the source node.");
        return;
      }

      // Prevent duplicate YES/NO from same source
      const existing = workflowRef.current.edges.find(
        (e) => e.source === connection.source && e.decision === decision
      );
      if (existing) {
        toast.error(`This node already has a ${decision} edge.`);
        return;
      }

      const edgeId = `edge-${connection.source}-${connection.target}-${decision.toLowerCase()}-${Date.now()}`;
      const newEdge: WorkflowEdge = {
        id: edgeId,
        source: connection.source!,
        target: connection.target!,
        decision,
      };

      setWorkflow((wf) => ({ ...wf, edges: [...wf.edges, newEdge] }));
      setEdges((eds) => addEdge({ ...connection, id: edgeId }, eds));
    },
    [setEdges]
  );

  const handleAddNode = useCallback(() => {
    const id = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      id,
      type: "decision",
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 100 },
      data: { label: "New Decision", prompt: "" },
    };
    setWorkflow((wf) => ({ ...wf, nodes: [...wf.nodes, newNode] }));
    // Open edit panel for the new node
    setTimeout(() => {
      setEditPanel({ open: true, nodeId: id, label: "New Decision", prompt: "" });
    }, 50);
  }, []);

  const handleSaveNode = useCallback((nodeId: string, label: string, prompt: string) => {
    setWorkflow((wf) => ({
      ...wf,
      nodes: wf.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label, prompt } } : n
      ),
    }));
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setWorkflow((wf) => ({
      ...wf,
      nodes: wf.nodes.filter((n) => n.id !== nodeId),
      edges: wf.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
  }, []);

  // ── Persistence ─────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    saveWorkflow(workflow);
    toast.success("Workflow saved to browser storage.");
  }, [workflow]);

  const handleExport = useCallback(() => {
    exportWorkflowJson(workflow);
    toast.success("Workflow exported as JSON.");
  }, [workflow]);

  const handleImport = useCallback((jsonString: string) => {
    try {
      const imported = importWorkflowJson(jsonString);
      const validation = validateWorkflow(imported);
      if (!validation.valid) {
        toast.error(`Import failed: ${validation.errors.join(" ")}`);
        return;
      }
      setWorkflow(imported);
      setExecutionState({ status: "idle", nodeStates: {}, steps: [] });
      toast.success("Workflow imported successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import workflow.");
    }
  }, []);

  // ── Execution ────────────────────────────────────────────────────────────

  const handleExecute = useCallback(async () => {
    const validation = validateWorkflow(workflow);
    if (!validation.valid) {
      toast.error(validation.errors[0] ?? "Workflow validation failed.");
      return;
    }

    setExecutionState({ status: "running", nodeStates: {}, steps: [] });
    setShowExecutionPanel(true);

    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorMsg =
          (json as { error?: string; details?: string[] }).error ??
          "Execution failed";
        const details = (json as { details?: string[] }).details;
        setExecutionState({
          status: "failed",
          nodeStates: {},
          steps: [],
          error: details ? `${errorMsg}: ${details.join(", ")}` : errorMsg,
        });
        return;
      }

      const { runId } = json as { runId: string };
      pollExecutionResult(runId);
    } catch (err) {
      setExecutionState({
        status: "failed",
        nodeStates: {},
        steps: [],
        error: err instanceof Error ? err.message : "Network error",
      });
    }
  }, [workflow]);  // eslint-disable-line react-hooks/exhaustive-deps

  const pollExecutionResult = useCallback(
    (runId: string) => {
      const POLL_URL = `http://127.0.0.1:8288/v1/runs/${runId}`;
      const MAX_ATTEMPTS = 60; // 60 × 2s = 2 min
      let attempts = 0;

      const poll = async () => {
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
          setExecutionState((prev) => ({
            ...prev,
            status: "failed",
            error: "Execution timed out waiting for result.",
          }));
          return;
        }

        try {
          const res = await fetch(POLL_URL);
          if (!res.ok) {
            setTimeout(poll, 2000);
            return;
          }

          const data = (await res.json()) as {
            status?: string;
            output?: unknown;
          };

          const runStatus = data.status;

          if (runStatus === "Completed") {
            const result = data.output as {
              steps: Array<{
                nodeId: string;
                nodeLabel: string;
                prompt: string;
                decision: "YES" | "NO";
                nextNodeId: string | null;
                nextNodeLabel: string | null;
              }>;
            };

            const nodeStates: ExecutionState["nodeStates"] = {};
            for (const step of result.steps) {
              nodeStates[step.nodeId] = {
                status: "completed",
                decision: step.decision,
              };
            }

            setExecutionState({
              status: "completed",
              runId,
              nodeStates,
              steps: result.steps,
            });
            toast.success("Workflow completed successfully.");
            return;
          }

          if (runStatus === "Failed" || runStatus === "Cancelled") {
            setExecutionState((prev) => ({
              ...prev,
              status: "failed",
              error: `Execution ${runStatus.toLowerCase()}.`,
            }));
            return;
          }

          // Still running — poll again
          setTimeout(poll, 2000);
        } catch {
          // Network error during poll — retry
          setTimeout(poll, 2000);
        }
      };

      setTimeout(poll, 1500);
    },
    []
  );

  return (
    <div className="flex h-full flex-col">
      <WorkflowToolbar
        workflowName={workflow.name}
        executionStatus={executionState.status}
        onAddNode={handleAddNode}
        onExecute={handleExecute}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        onRename={(name) => setWorkflow((wf) => ({ ...wf, name }))}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* React Flow Canvas */}
        <div className={showExecutionPanel ? "flex-1" : "w-full"}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background />
            <Controls />
            <MiniMap />
            {executionState.status === "running" && (
              <Panel position="top-center">
                <div className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
                  <span className="inline-block size-2 animate-pulse rounded-full bg-white" />
                  Workflow executing…
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Execution panel */}
        {showExecutionPanel && (
          <div className="w-80 border-l border-border bg-background">
            <ExecutionPanel
              executionState={executionState}
              onClose={() => setShowExecutionPanel(false)}
            />
          </div>
        )}
      </div>

      {/* Node edit dialog */}
      <NodeEditPanel
        open={editPanel.open}
        nodeId={editPanel.nodeId}
        initialLabel={editPanel.label}
        initialPrompt={editPanel.prompt}
        onSave={handleSaveNode}
        onClose={() => setEditPanel((p) => ({ ...p, open: false }))}
        onDelete={handleDeleteNode}
      />
    </div>
  );
}
