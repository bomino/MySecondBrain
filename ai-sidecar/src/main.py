from contextlib import asynccontextmanager
from fastapi import FastAPI
from db import get_pool, close_pool
from routes.embed import router as embed_router
from routes.auto_tag import router as auto_tag_router
from routes.summarize import router as summarize_router
from routes.chat import router as chat_router
from routes.related import router as related_router
from routes.digest import router as digest_router
from routes.transform import router as transform_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="Second Brain AI Sidecar", lifespan=lifespan)

app.include_router(embed_router)
app.include_router(auto_tag_router)
app.include_router(summarize_router)
app.include_router(chat_router)
app.include_router(related_router)
app.include_router(digest_router)
app.include_router(transform_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
