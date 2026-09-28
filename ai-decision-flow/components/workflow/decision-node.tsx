"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "cn";
import type { DecisionNodeData } from "@/types/workflow";
import type { NodeExecutionStatus } from "@/types/execution";

export type DecisionNodeType = Node<
  DecisionNodeData & {
    executionStatus?: NodeExecutionStatus;
    decision?: "YES" | "NO";
    onEditPrompt?: (id: string, prompt: string, label: string) => void;
  },
  "decision"
>;

const statusStyles: Record<NodeExecutionStatus, string> = {
  pending: "border-border",
  running: "border-blue-500 shadow-blue-500/30 shadow-lg animate-pulse",
  completed: "border-green-500 shadow-green-500/20 shadow-md",
  failed: "border-red-500 shadow-red-500/20 shadow-md",
};

const statusBadgeStyles: Record<NodeExecutionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500 text-white",
  completed: "bg-green-500 text-white",
  failed: "bg-red-500 text-white",
};

export const DecisionNode = memo(function DecisionNode({
  id,
  data,
  selected,
}: NodeProps<DecisionNodeType>) {
  const status = data.executionStatus ?? "pending";
  const showStatus = data.executionStatus !== undefined;

  return (
    <div
      className={cn(
        "relative min-w-[220px] rounded-xl border-2 bg-card text-card-foreground shadow-sm transition-all",
        statusStyles[status],
        selected && status === "pending" && "border-primary shadow-primary/20 shadow-md"
      )}
    >
      {/* Target handle (incoming) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-muted-foreground !bg-background"
      />

      <div className="px-4 py-3">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            AI Decision
          </span>
          {showStatus && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-medium",
                statusBadgeStyles[status]
              )}
            >
              {status === "running"
                ? "Running…"
                : status === "completed" && data.decision
                  ? data.decision
                  : status}
            </span>
          )}
        </div>

        {/* Label */}
        <div className="mb-1 text-sm font-semibold leading-snug">{data.label}</div>

        {/* Prompt */}
        <div
          className="line-clamp-3 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
          title={data.prompt || "Click to edit prompt…"}
          onClick={() => data.onEditPrompt?.(id, data.prompt, data.label)}
        >
          {data.prompt || <em>Click to add a prompt…</em>}
        </div>
      </div>

      {/* YES / NO source handles */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            className="!relative !top-auto !left-auto !size-3 !translate-x-0 !translate-y-0 !border-2 !border-green-500 !bg-background"
          />
          <span className="text-xs font-bold text-green-600">YES</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-red-500">NO</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            className="!relative !top-auto !left-auto !size-3 !translate-x-0 !translate-y-0 !border-2 !border-red-500 !bg-background"
          />
        </div>
      </div>
    </div>
  );
});
