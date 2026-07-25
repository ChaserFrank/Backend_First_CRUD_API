from fastapi import FastAPI

app = FastAPI(
    title="Task API",
    version="1.0"
)

@app.get("/")
def read_root():
    """
    Root endpoint returning API metadata.
    """
    return {
        "name": "Task API",
        "version": "1.0",
        "endpoints": ["/tasks"]
    }

@app.get("/health")
def health_check():
    """
    Standard health check endpoint for monitoring systems.
    """
    return {"status": "ok"}