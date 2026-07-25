from fastapi import FastAPI

# Initialize the FastAPI application instance
app = FastAPI()

@app.get("/")
def read_root():
    """
    Stage 0: Basic server heartbeat
    """
    return {"message": "Hello, server is running!"}