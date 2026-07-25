from typing import Optional
from fastapi import FastAPI, HTTPException, Response, status
from pydantic import BaseModel

app = FastAPI(title="Task API", version="1.0")

# Pydantic schema for incoming creation requests
class TaskCreate(BaseModel):
    title: str

# Schema to update payload
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    done: Optional[bool] = None

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


# --- STAGE 3: CREATE ENDPOINT ---

@app.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate):
    """
    Create a new task with input validation.
    """
    # Business rule validation: title cannot be empty or whitespace
    if not payload.title or not payload.title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required and cannot be empty"
        )

    # Compute next unique ID safely
    next_id = max([t["id"] for t in tasks_db], default=0) + 1

    new_task = {
        "id": next_id,
        "title": payload.title.strip(),
        "done": False
    }

    tasks_db.append(new_task)
    return new_task


# --- STAGE 4: UPDATE & DELETE ENDPOINTS ---

@app.put("/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate):
    """
    Update a task's title and/or done status.
    """
    # Validation: user must provide at least one field to update
    if payload.title is None and payload.done is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least 'title' or 'done' to update"
        )

    if payload.title is not None and not payload.title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title cannot be empty"
        )

    for task in tasks_db:
        if task["id"] == task_id:
            if payload.title is not None:
                task["title"] = payload.title.strip()
            if payload.done is not None:
                task["done"] = payload.done
            return task

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task {task_id} not found"
    )


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int):
    """
    Delete a task by ID. Returns 204 No Content on success.
    """
    for index, task in enumerate(tasks_db):
        if task["id"] == task_id:
            tasks_db.pop(index)
            # HTTP 204 requires an empty body
            return Response(status_code=status.HTTP_204_NO_CONTENT)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task {task_id} not found"
    )