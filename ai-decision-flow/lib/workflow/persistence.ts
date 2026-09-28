import type { Workflow } from "@/types/workflow";

const STORAGE_KEY = "ai-decision-flow:workflow";

export function saveWorkflow(workflow: Workflow): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow));
  } catch {
    // localStorage may be unavailable (SSR or private mode)
  }
}

export function loadWorkflow(): Workflow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Workflow;
  } catch {
    return null;
  }
}

export function exportWorkflowJson(workflow: Workflow): void {
  const json = JSON.stringify(workflow, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${workflow.name.replace(/\s+/g, "-").toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importWorkflowJson(jsonString: string): Workflow {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON: could not parse the file.");
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as { nodes?: unknown }).nodes) ||
    !Array.isArray((data as { edges?: unknown }).edges)
  ) {
    throw new Error("Invalid workflow: missing required fields (nodes, edges).");
  }

  const w = data as Workflow;

  if (typeof w.id !== "string" || typeof w.name !== "string") {
    throw new Error("Invalid workflow: id and name must be strings.");
  }

  return w;
}
