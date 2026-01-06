"""Application configuration"""
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database (Supabase production with PgBouncer pooler)
    database_url: str = "postgresql://postgres.cfqoyzhthfmpkahlnixp:4fH%23U%2B3%2Baj4_tx%2F@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"

    # OpenAI
    openai_api_key: str

    # RAG Settings
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    llm_model: str = "gpt-4o"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 1024
    rag_top_k: int = 5  # Number of documents to retrieve

    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # CORS
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = "../.env"  # Look in parent directory (project root)
        case_sensitive = False


# Global settings instance
settings = Settings()
