"use client";

import { Button } from "@/components/ui/button";
import { PlusIcon, PlayIcon, DownloadIcon, UploadIcon, SaveIcon } from "lucide-react";
import type { ExecutionStatus } from "@/types/execution";
import { useRef } from "react";

interface WorkflowToolbarProps {
  workflowName: string;
  executionStatus: ExecutionStatus;
  onAddNode: () => void;
  onExecute: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (jsonString: string) => void;
  onRename: (name: string) => void;
}

export function WorkflowToolbar({
  workflowName,
  executionStatus,
  onAddNode,
  onExecute,
  onSave,
  onExport,
  onImport,
  onRename,
}: WorkflowToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRunning = executionStatus === "running";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") onImport(result);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = "";
  }

  return (
    <div className="flex h-12 items-center gap-2 border-b border-border bg-background px-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Workflow name */}
      <input
        className="mr-2 w-48 rounded border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none hover:border-border focus:border-ring focus:ring-2 focus:ring-ring/50"
        value={workflowName}
        onChange={(e) => onRename(e.target.value)}
        placeholder="Workflow name…"
        title="Click to rename workflow"
      />

      <div className="h-5 w-px bg-border" />

      <Button variant="outline" size="sm" onClick={onAddNode} disabled={isRunning}>
        <PlusIcon className="mr-1" />
        Add Node
      </Button>

      <Button
        size="sm"
        onClick={onExecute}
        disabled={isRunning}
        className="min-w-[100px]"
      >
        {isRunning ? (
          <>
            <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-current" />
            Running…
          </>
        ) : (
          <>
            <PlayIcon className="mr-1" />
            Execute
          </>
        )}
      </Button>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" onClick={onSave} title="Save to browser storage">
        <SaveIcon className="mr-1" />
        Save
      </Button>

      <Button variant="ghost" size="sm" onClick={onExport} title="Export as JSON">
        <DownloadIcon className="mr-1" />
        Export
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        title="Import from JSON"
      >
        <UploadIcon className="mr-1" />
        Import
      </Button>
    </div>
  );
}
