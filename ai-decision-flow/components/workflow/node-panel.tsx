"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface NodeEditPanelProps {
  open: boolean;
  nodeId: string;
  initialLabel: string;
  initialPrompt: string;
  onSave: (nodeId: string, label: string, prompt: string) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

export function NodeEditPanel({
  open,
  nodeId,
  initialLabel,
  initialPrompt,
  onSave,
  onClose,
  onDelete,
}: NodeEditPanelProps) {
  const [label, setLabel] = useState(initialLabel);
  const [prompt, setPrompt] = useState(initialPrompt);

  // Reset form fields when the panel opens for a different node
  useEffect(() => {
    if (open) {
      setLabel(initialLabel);
      setPrompt(initialPrompt);
    }
  }, [open, nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Decision Node</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Node Label
            </label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Is this a support request?"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Decision Prompt
            </label>
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Is this a support request? Answer YES or NO."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The AI will answer YES or NO to this prompt.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete(nodeId);
              onClose();
            }}
          >
            Delete Node
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(nodeId, label.trim() || "Decision", prompt.trim());
              onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
