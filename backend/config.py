import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Syntergic Telemetry Early Warning System"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Redis & Celery Config
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    # Redis channels and keys
    REDIS_STREAM_CHANNEL: str = "syntergic_telemetry_stream"
    REDIS_HISTORY_KEY: str = "syntergic_history_list"
    REDIS_INGESTION_QUEUE: str = "syntergic_raw_osint_queue"
    
    # Entropy thresholds
    OMEGA_GREEN_THRESHOLD: float = 0.40
    OMEGA_YELLOW_THRESHOLD: float = 0.70
    
    # Windowing and history
    MOVING_AVERAGE_WINDOW: int = 10
    TELEMETRY_HISTORY_LIMIT: int = 100
    
    # Ingestion sensor timing (in seconds)
    SIMULATION_INTERVAL_SECONDS: float = float(os.getenv("SIMULATION_INTERVAL_SECONDS", "4.0"))
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        case_sensitive = True

settings = Settings()
