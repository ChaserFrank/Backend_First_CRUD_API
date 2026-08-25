import os
import psycopg2
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional, Generator
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlmodel import Field, Session, SQLModel, create_engine, select
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Task API with Auth",
              description="Containerized CRUD API integrated with Supabase Authentication and Bearer Guarding.",
              version="2.0" )

# --- Add near top of main.py ---
SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY")

# Initialize and verify connection
try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.")

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Visual checkpoint log
    print("\n" + "=" * 50)
    print("⚡ Server running and connected to Supabase!")
    print("=" * 50 + "\n")

except Exception as e:
    print(f"\n❌ Supabase Connection Failed: {e}\n")
    raise e

# Read Database Connection String from environment variable
# DATABASE_URL = os.getenv("DATABASE_URL")

# engine = create_engine(DATABASE_URL, echo=True)

# class Task(SQLModel, table=True):
#     id: Optional[int] = Field(default=None, primary_key=True)
#     title: str
#     done: bool =

# ==============================================================================
# 2. REQUEST & RESPONSE SCHEMAS (Data Validation Layer)
# ==============================================================================

class AuthPayload(BaseModel):
    """Schema for incoming authentication requests."""
    email: str
    password: str


# ==============================================================================
# 3. SECURITY DEPENDENCY (Middleware Guard for Token Verification)
# ==============================================================================

# HTTPBearer automatically configures the OpenAPI/Swagger UI "Authorize" padlock button
security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Dict[str, Any]:
    """
    Reusable FastAPI Security Dependency (Guard).

    1. Extracts Bearer token from 'Authorization: Bearer <token>' header.
    2. Rejects missing or malformed headers with 401 Unauthorized.
    3. Verifies token integrity against Supabase Auth.
    4. Injects user metadata directly into protected route signatures.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Access token required"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Call Supabase SDK to decode and verify JWT signature
        response = supabase.auth.get_user(token)

        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Invalid or expired token"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Return sanitized user information to attached endpoints
        return {
            "id": response.user.id,
            "email": response.user.email,
            "created_at": str(response.user.created_at)
        }

    except Exception:
        # Catch SDK token verification failures (tampered, expired, or malformed)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired token"},
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==============================================================================
# 4. AUTHENTICATION ENDPOINTS (Open Routes)
# ==============================================================================

@app.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: AuthPayload):
    if not payload.email.strip() or not payload.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Email and password are required."}
        )
    try:
        response = supabase.auth.sign_up({
            "email": payload.email.strip(),
            "password": payload.password.strip()
        })
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "User registration failed."}
            )
        return {
            "message": "User created successfully",
            "user": {"id": response.user.id, "email": response.user.email}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e)}
        )

@app.post("/auth/login", status_code=status.HTTP_200_OK)
def login(payload: AuthPayload):
    if not payload.email.strip() or not payload.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Email and password are required."}
        )
    try:
        response = supabase.auth.sign_in_with_password({
            "email": payload.email.strip(),
            "password": payload.password.strip()
        })
        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Invalid login credentials"}
            )
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type": "bearer",
            "expires_in": response.session.expires_in
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid login credentials"}
        )

@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    try:
        supabase.auth.sign_out()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

# # Startup & Seeding Logic via Lifespan
# @asynccontextmanager
# async def lifespan(main: FastAPI):
#     # Create the database and tables if missing
#     SQLModel.metadata.create_all(engine)
#
#     # Seed default tasks if empty
#     with Session(engine) as session:
#         statement = select(Task)
#         existing_tasks = session.exec(statement).first()
#         if not existing_tasks:
#             initial_tasks = [
#                 Task(title="Setup development environment", done=True),
#                 Task(title="Watch request-response lecture", done=True),
#                 Task(title="Build FastAPI CRUD endpoints", done=False),
#             ]
#             session.add_all(initial_tasks)
#             session.commit()
#     yield




def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

@app.get("/")
def read_root():
    return {"name": "Task API", "version": "1.0", "endpoints": ["/tasks"]}


@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Request Schemas ---
class TaskCreate(BaseModel):
    title: str

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    done: Optional[bool] = None


# --- STAGE 2: READ ENDPOINTS ---

@app.get("/tasks")
def get_tasks(session: Session = Depends(get_session)):
    """
    Retrieve all tasks from the SQLite database.
    """
    statement = select(Task)
    return session.exec(statement).all()

@app.get("/tasks/{task_id}")
def get_task(task_id: int, session: Session = Depends(get_session)):
    """
    Retrieve a single task by ID from the database.
    """
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )
    return task


# --- STAGE 2: CREATE ENDPOINT ---

# --- Replace existing create_task function ---
@app.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, session: Session = Depends(get_session)):
    """
    Create a new task in PostgreSQL with input validation.
    """
    if not payload.title or not payload.title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required and cannot be empty"
        )

    db_task = Task(title=payload.title.strip())
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

# --- STAGE 3: UPDATE & DELETE ENDPOINTS ---

@app.put("/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate, session: Session = Depends(get_session)):
    """
    Update an existing task in PostgreSQL.
    """
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

    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )

    # Mutate DB fields
    if payload.title is not None:
        task.title = payload.title.strip()
    if payload.done is not None:
        task.done = payload.done

    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, session: Session = Depends(get_session)):
    """
    Delete a task from PostgreSQL.
    """
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )

    session.delete(task)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# # Bonus
# @app.get("/tasks/search")
# def search_tasks(
#         search: Optional[str] = None,
#         done: Optional[bool] = None,
#         session: Session = Depends(get_session)
# ):
#     statement = select(Task)
#     if done is not None:
#         statement = statement.where(Task.done == done)
#     if search:
#         # SQL LIKE query (%search%)
#         statement = statement.where(Task.title.contains(search))
#
#     return session.exec(statement).all()
#
#
# @app.get("/stats")
# def get_stats(session: Session = Depends(get_session)):
#     total = len(session.exec(select(Task)).all())
#     completed = len(session.exec(select(Task).where(Task.done == True)).all())
#     return {
#         "total": total,
#         "completed": completed,
#         "open": total - completed
#     }