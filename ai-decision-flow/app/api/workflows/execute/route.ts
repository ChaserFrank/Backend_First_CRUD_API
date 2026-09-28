import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { WORKFLOW_RUN_EVENT } from "@/inngest/events";
import { validateWorkflow } from "@/lib/workflow/validation";
import type { Workflow } from "@/types/workflow";

export async function POST(req: NextRequest) {
  let workflow: Workflow;
  try {
    workflow = (await req.json()) as Workflow;
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  const validation = validateWorkflow(workflow);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Workflow validation failed.", details: validation.errors },
      { status: 422 }
    );
  }

  const { ids } = await inngest.send({
    name: WORKFLOW_RUN_EVENT,
    data: { workflowJson: JSON.stringify(workflow) },
  });

  const runId = ids[0];
  return NextResponse.json({ runId }, { status: 202 });
}
