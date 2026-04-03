from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://brain:brain@localhost:5432/secondbrain"
    redis_url: str = "redis://localhost:6379"
    ollama_base_url: str = "http://localhost:11434"
    anthropic_api_key: str = ""
    ai_routing_mode: str = "hybrid"
    embedding_model_local: str = "nomic-embed-text"
    chat_model_local: str = "llama3.1:8b"
    chat_model_cloud: str = "claude-sonnet-4-6-20250514"
    openai_base_url: str = "https://api.openai.com"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    embedding_dimension: int = 768
    chunk_size: int = 500
    chunk_overlap: int = 50

    class Config:
        env_file = ".env"


settings = Settings()
