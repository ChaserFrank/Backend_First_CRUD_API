# Task Management API (BE-01)

A clean, RESTful CRUD API built with FastAPI and Python.

---

## 🛠️ Tech Stack

- **Language:** Python 3.10+
- **Framework:** FastAPI
- **ASGI Web Server:** Uvicorn
- **Data Validation:** Pydantic
- **Documentation:** Swagger UI / OpenAPI (built-in at `/docs`)

---

## 🚀 Quick Start

### 1. Clone & Set Up Environment

```bash
git clone https://github.com/your-username/Backend_First_CRUD_API.git
cd Backend_First_CRUD_API

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install "fastapi[standard]"
```

### 2. Run Command

Start the development server with live reload:

```bash
uvicorn main:app --reload
```

The server will start listening at `http://localhost:8000`.

---

##  Endpoint Table

| HTTP Method | Path | Summary | Expected Status |
| :--- | :--- | :--- | :--- |
# Task Management API (BE-02)

A clean, production-ready RESTful CRUD API built with FastAPI, SQLModel, and SQLite as part of the **FlyRank AI Internship** (Backend AI Engineering Track, Week 3 Assignment).

---

## 🛠️ Tech Stack

- **Language:** Python 3.10+
- **Framework:** FastAPI
- **ORM / Data Layer:** SQLModel (SQLAlchemy + Pydantic)
- **Database:** SQLite
- **ASGI Web Server:** Uvicorn
- **Documentation:** Swagger UI / OpenAPI (built-in at `/docs`)

---

## 🗄️ Database Architecture

### Why SQLite Was Chosen

SQLite was chosen as the database engine because it is an **embedded, zero-configuration database that lives in a single local file (`tasks.db`)**, making it ideal for lightweight backend applications, local testing, and rapid development without requiring an external database server.

- **Database Storage Location:** Local project root (`tasks.db`).
- **Auto-Initialization & Seeding:** On first server boot, the application automatically creates `tasks.db` and populates it with default example tasks if the table is empty. Data now persists across server restarts.

---

## 🚀 Quick Start

### 1. Clone & Set Up Environment

```bash
git clone https://github.com/your-username/Backend_First_CRUD_API.git
cd Backend_First_CRUD_API

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install "fastapi[standard]" sqlmodel
```

### 2. Run Command

Start the development server with live reload:

```bash
uvicorn main:app --reload
```

The server will automatically initialize `tasks.db` on launch and listen at http://localhost:8000.

---

##  Endpoint Table

| HTTP Method | Path | Summary | Expected Status |
|---|---|---|---|
| GET | `/` | API details | 200 OK |
| GET | `/health` | Server status | 200 OK |
| GET | `/tasks` | List all tasks | 200 OK |
| GET | `/tasks/{id}` | Get single task | 200 OK / 404 Not Found |
| POST | `/tasks` | Create task | 201 Created / 400 Bad Request |
| PUT | `/tasks/{id}` | Update task | 200 OK / 400 Bad Request / 404 Not Found |
| DELETE | `/tasks/{id}` | Remove task | 204 No Content / 404 Not Found |

---

## 🔍 SQL Database Exploration

Example queries executed directly against `tasks.db` via a SQLite database viewer:

```sql
-- 1. List every task
SELECT * FROM tasks;

-- 2. Show only completed tasks (1 = True)
SELECT * FROM tasks WHERE done = 1;

-- 3. Count total tasks
SELECT COUNT(*) FROM tasks;
```

---

## Screenshots

- Database Viewer (SQLite)
- Interactive Swagger UI

FastAPI automatically generates interactive API documentation powered by OpenAPI.

Visit http://localhost:8000/docs in your browser to inspect and test all CRUD endpoints interactively.

---

##  Sample curl Output

Below is a sample output from querying a single task using `curl -i http://localhost:8000/tasks/1`:

```http
HTTP/1.1 200 OK
date: Sat, 25 Jul 2026 15:30:00 GMT
server: uvicorn
content-length: 63
content-type: application/json

{"id":1,"title":"Setup development environment","done":true}
```
