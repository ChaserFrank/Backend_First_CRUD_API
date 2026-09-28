"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExecutionState } from "@/types/execution";
import { cn } from "cn";

interface ExecutionPanelProps {
  executionState: ExecutionState;
  onClose: () => void;
}

export function ExecutionPanel({ executionState, onClose }: ExecutionPanelProps) {
  const { status, steps, error } = executionState;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Execution Log</span>
          <StatusBadge status={status} />
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <strong>Error:</strong> {error}
            </div>
          )}

          {steps.length === 0 && status === "running" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block size-2 animate-pulse rounded-full bg-blue-500" />
              Starting workflow execution…
            </div>
          )}

          {steps.length === 0 && status === "idle" && (
            <p className="text-sm text-muted-foreground">
              Run the workflow to see execution logs here.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <div
                key={`${step.nodeId}-${i}`}
                className="rounded-lg border border-border bg-card p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{step.nodeLabel}</span>
                  <DecisionBadge decision={step.decision} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {step.prompt}
                </p>
                {step.nextNodeLabel ? (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <span>→</span>
                    <span className="font-medium text-foreground">{step.nextNodeLabel}</span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-muted-foreground">
                    → <em>End of workflow</em>
                  </div>
                )}
              </div>
            ))}
          </div>

          {status === "completed" && steps.length > 0 && (
            <div className="mt-3 rounded-lg bg-green-50 p-3 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
              ✓ Workflow completed — {steps.length} node{steps.length !== 1 ? "s" : ""} executed
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StatusBadge({ status }: { status: ExecutionState["status"] }) {
  const styles = {
    idle: "bg-muted text-muted-foreground",
    running: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: "YES" | "NO" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-bold",
        decision === "YES"
          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      )}
    >
      {decision}
    </span>
  );
}
