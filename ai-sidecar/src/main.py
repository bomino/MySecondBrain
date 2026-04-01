from fastapi import FastAPI

app = FastAPI(title="Second Brain AI Sidecar")


@app.get("/health")
async def health():
    return {"status": "ok"}
