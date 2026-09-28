import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database import setup_and_seed, get_report_data, get_db
from pdf_generator import generate_pdf

app = FastAPI()

# Run seed on startup[cite: 3]
setup_and_seed()


class ReportRequest(BaseModel):
    force: bool = False


@app.get("/health")
def health_check():
    """Stage 0: Health endpoint[cite: 3]."""
    return {"status": "ok"}


@app.post("/reports", status_code=201)
async def create_report(req: ReportRequest = ReportRequest()):
    """Stages 4 & 5: Idempotent report generation pipeline[cite: 3]."""
    conn = get_db()
    c = conn.cursor()
    today = datetime.utcnow().strftime('%Y-%m-%d')

    # Idempotency Check: Return existing report if generated today[cite: 3]
    if not req.force:
        existing = c.execute("SELECT id FROM reports WHERE created_at = ?", (today,)).fetchone()
        if existing:
            conn.close()
            # Note: Returns existing resource, but FastAPI requires modifying the response code manually if 200 is desired here.
            return {"id": existing["id"], "file": f"/reports/{existing['id']}/file", "message": "Cached version"}

    # Generate new report
    report_id = str(uuid.uuid4())
    data = get_report_data()
    path = await generate_pdf(report_id, data)

    # Store artifact path in DB[cite: 3]
    c.execute("INSERT INTO reports (id, path, created_at) VALUES (?, ?, ?)", (report_id, path, today))
    conn.commit()
    conn.close()

    return {"id": report_id, "file": f"/reports/{report_id}/file"}


@app.get("/reports/{report_id}")
def get_report_status(report_id: str):
    """Stage 4: Returns the record[cite: 3]."""
    conn = get_db()
    record = conn.cursor().execute("SELECT id, created_at FROM reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()
    if not record:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"id": record["id"], "created_at": record["created_at"], "file": f"/reports/{report_id}/file"}


@app.get("/reports/{report_id}/file")
def download_report(report_id: str):
    """Stage 4: Serve the artifact from disk[cite: 3]."""
    conn = get_db()
    record = conn.cursor().execute("SELECT path FROM reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()
    if not record:
        raise HTTPException(status_code=404, detail="Report not found")
    # FileResponse moves the bytes, the JSON endpoints only move links[cite: 3]
    return FileResponse(record["path"], media_type="application/pdf", filename=f"report_{report_id}.pdf")