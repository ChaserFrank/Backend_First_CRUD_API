# AI Decision Flow

A visual AI workflow system where each node represents a decision step that asks an LLM a question and branches on the answer — **YES** or **NO**.

Workflows are designed in a React Flow canvas. Execution is orchestrated by Inngest. Each node's decision is made by OpenAI.

---

## Architecture

```
React Flow Editor
      │
      │  (workflow definition JSON)
      ▼
Next.js API  /api/workflows/execute
      │
      │  inngest.send(workflow/run)
      ▼
Inngest Function  (execute-workflow)
      │
      ├── step.run("node-<id>") → evaluateDecision(prompt) → YES / NO
      │           ↓
      │     getNextNodeId(currentId, decision, edges)
      │           ↓
      ├── step.run("node-<next-id>") → …
      │
      └── return ExecutionResult
      │
      ▼
Poll  http://127.0.0.1:8288/v1/runs/<runId>
      │
      ▼
React Flow updates node states / Execution Panel
```

**Responsibility boundaries:**

| Layer | Responsibility |
|---|---|
| `types/` | Shared TypeScript models for workflows and execution state |
| `lib/workflow/` | Validation, traversal, persistence — pure domain logic, no UI or infra dependencies |
| `lib/openai/` | Single `evaluateDecision(prompt)` function — hides OpenAI details |
| `inngest/` | Event definitions, client, and the single workflow execution function |
| `app/api/` | Next.js route handlers — thin boundary between frontend and backend |
| `components/workflow/` | React Flow editor, toolbar, panels — no direct Inngest or OpenAI imports |

---

## Technology Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **React 19**
- **React Flow / `@xyflow/react`** — workflow canvas and custom nodes
- **Inngest** — durable, step-based workflow execution
- **OpenAI SDK** — LLM decision provider
- **shadcn/ui + Tailwind CSS** — UI components

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

### 3. Start the Next.js dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Start the Inngest dev server

In a separate terminal:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Open the Inngest dev UI at [http://127.0.0.1:8288](http://127.0.0.1:8288).

> Both servers must be running for workflow execution to work. The Next.js app sends events to Inngest. Inngest calls back to `/api/inngest` to run the workflow steps. The frontend polls the Inngest dev server API to get results.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Model to use (default: `gpt-4o-mini`) |



---

## How Workflow Execution Works

1. The user clicks **Execute** in the toolbar.
2. The frontend validates the workflow locally.
3. A `POST /api/workflows/execute` request is made with the full workflow JSON.
4. The API validates the workflow again server-side and sends a `workflow/run` event to Inngest.
5. Inngest picks up the event and runs the `execute-workflow` function.
6. The function finds the starting node (the node with no incoming edges).
7. For each node, `step.run("node-<id>")` calls `evaluateDecision(prompt)` which asks OpenAI the node's prompt.
8. OpenAI returns exactly `YES` or `NO`. The response is normalized and validated.
9. `getNextNodeId(currentId, decision, edges)` finds the matching edge and returns the next node ID.
10. Execution continues until there are no more outgoing edges.
11. The result is returned as `ExecutionResult` containing every node visited and the decision made at each step.
12. The frontend polls the Inngest dev server (`/v1/runs/<runId>`) every 2 seconds until the run completes.
13. Node states are updated in the React Flow canvas and the execution log panel is shown.

---

## Example Workflow

The default workflow demonstrates the branching logic:

```
          ┌──────────────────────────────┐
          │  Is this a support request?  │
          └────────────┬─────────────────┘
               YES     │     NO
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   Support Node               Sales Node
```

When executed:
- The LLM evaluates "Is this a support request?" and returns YES or NO.
- If YES → Support Node runs next.
- If NO → Sales Node runs next.
- Each subsequent node is evaluated in turn until no outgoing edge exists.

---

## Project Structure

```
app/
  api/
    inngest/route.ts          — Inngest serve handler (GET, POST, PUT)
    workflows/execute/route.ts — Execution trigger endpoint
  layout.tsx                  — Root layout with Toaster
  page.tsx                    — WorkflowEditor entry point

components/
  workflow/
    decision-node.tsx         — Custom React Flow node (YES/NO handles)
    execution-panel.tsx       — Execution log sidebar
    node-panel.tsx            — Node edit dialog (label + prompt)
    workflow-editor.tsx       — Main editor: canvas, state, handlers
    workflow-toolbar.tsx      — Add, Execute, Save, Export, Import

inngest/
  client.ts                   — Inngest client
  events.ts                   — Event name and payload type
  functions.ts                — execute-workflow function

lib/
  openai/decision.ts          — evaluateDecision(prompt): YES | NO
  workflow/
    persistence.ts            — localStorage save/load, JSON export/import
    traversal.ts              — getNextNodeId, findNode, findStartingNode
    validation.ts             — validateWorkflow → ValidationResult

types/
  execution.ts                — ExecutionState, NodeExecutionResult, etc.
  workflow.ts                 — Workflow, WorkflowNode, WorkflowEdge, Decision

__tests__/
  validation.test.ts          — 9 tests for workflow validation
  traversal.test.ts           — 7 tests for graph traversal
  ai-normalization.test.ts    — 7 tests for LLM response normalization
```

---

## Testing

```bash
npm test
```

Tests cover the domain logic that does not require external services:

- **Validation**: valid workflows accepted, invalid references/edges/duplicates rejected
- **Traversal**: YES/NO → correct next node, missing edge → null
- **AI normalization**: YES/NO accepted, unexpected output throws

No real API key is required to run the test suite.

---

## Important Engineering Decisions

### Single Inngest function, dynamic traversal
One `execute-workflow` function handles all workflows. Nodes are defined by users and traversed dynamically at runtime. Creating a separate Inngest function per node would be incorrect and unscalable.

### Workflow as the single source of truth
The same `Workflow` type is used for editing, execution, validation, local storage, and JSON import/export. There are no duplicate or incompatible representations.

### Polling over WebSockets
The frontend polls the Inngest dev server REST API to get execution results. This is the simplest correct approach for a local dev tool — no WebSockets, streaming, or custom pub/sub needed.

### localStorage for persistence
Workflows are saved to `localStorage`. No database is introduced. The data model is simple JSON and serializes cleanly.

### LLM response validation
`evaluateDecision` normalizes the response to uppercase, checks for exactly `YES` or `NO`, and throws a typed error for anything else. The Inngest step will fail cleanly rather than silently misrouting the workflow.

### No Zustand, Redux, or complex state management
All state is local React state in `WorkflowEditor`. The workflow is simple enough that global state management would be over-engineering.

### Execution state is not persisted
Execution results exist only for the current session. Persisting history would require a database and is outside the scope of this assignment.

---

## Running the Application

```bash
# Terminal 1 — Next.js
npm run dev

# Terminal 2 — Inngest dev server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Open [http://localhost:3000](http://localhost:3000) and click **Execute** to run the default workflow.
