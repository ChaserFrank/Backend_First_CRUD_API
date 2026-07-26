from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import Field, Session, SQLModel, create_engine, select


# 1. Define the SQLModel (serves as both DB Table & Data Model)
class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    done: bool = False


# 2. Configure SQLite Database Engine
# connect_args={"check_same_thread": False} is required for SQLite with FastAPI
sqlite_file_name = "tasks.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


# 3. Startup & Seeding Logic via Lifespan
@asynccontextmanager
async def lifespan(main: FastAPI):
    # Create the database and tables if missing
    SQLModel.metadata.create_all(engine)

    # Seed default tasks if empty
    with Session(engine) as session:
        statement = select(Task)
        existing_tasks = session.exec(statement).first()
        if not existing_tasks:
            initial_tasks = [
                Task(title="Setup development environment", done=True),
                Task(title="Watch request-response lecture", done=True),
                Task(title="Build FastAPI CRUD endpoints", done=False),
            ]
            session.add_all(initial_tasks)
            session.commit()
    yield


app = FastAPI(title="Task API", version="2.0", lifespan=lifespan)


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