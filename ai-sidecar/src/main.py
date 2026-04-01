from contextlib import asynccontextmanager
from fastapi import FastAPI
from db import get_pool, close_pool
from routes.embed import router as embed_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="Second Brain AI Sidecar", lifespan=lifespan)

app.include_router(embed_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
