from fastapi import FastAPI, HTTPException, status

app = FastAPI(title="Task API", version="1.0")

# In-memory data store (resets whenever the server restarts)
tasks_db = [
    {"id": 1, "title": "Setup development environment", "done": True},
    {"id": 2, "title": "Watch request-response lecture", "done": True},
    {"id": 3, "title": "Build FastAPI CRUD endpoints", "done": False},
]


@app.get("/")
def read_root():
    return {"name": "Task API", "version": "1.0", "endpoints": ["/tasks"]}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# --- STAGE 2: READ ENDPOINTS ---

@app.get("/tasks")
def get_tasks():
    """
    Retrieve the full list of tasks.
    """
    return tasks_db


@app.get("/tasks/{task_id}")
def get_task(task_id: int):
    """
    Retrieve a single task by ID.
    Returns 404 if the task ID does not exist.
    """
    for task in tasks_db:
        if task["id"] == task_id:
            return task

    # Standard backend rule: return 404 for missing resources
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task {task_id} not found"
    )