import os
from celery import Celery
from config import settings

celery = Celery(
    "syntergic_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["tasks"]
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=1
)

# Celery Beat Periodic Schedule: Ingestion Sensor triggers every N seconds
celery.conf.beat_schedule = {
    "osint-ingestion-sensor-periodic": {
        "task": "tasks.ingest_osint_sensor_task",
        "schedule": settings.SIMULATION_INTERVAL_SECONDS,
        "args": ()
    }
}
