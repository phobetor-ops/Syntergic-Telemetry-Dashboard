import json
import logging
import random
import time
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
import redis

from celery_app import celery
from config import settings
from mock_feeds import generate_random_osint_payload, OSINT_FEEDS_CATALOG

logger = logging.getLogger("syntergic.tasks")
logging.basicConfig(level=logging.INFO)

# Connect to Redis instance for queue and pub/sub
def get_redis_client() -> redis.Redis:
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

# Keyword weighting lexicons for Logos Engine NLP analysis
PANIC_KEYWORDS = {
    "panic": 0.35, "hostility": 0.30, "halt": 0.25, "evacuate": 0.40,
    "liquidity": 0.20, "margin": 0.25, "hijack": 0.35, "breach": 0.30,
    "warfare": 0.40, "deepfake": 0.30, "swarm": 0.25, "shock": 0.30,
    "crash": 0.35, "anxiety": 0.20, "unprecedented": 0.25, "emp": 0.45,
    "severed": 0.35, "cable cut": 0.45, "contamination": 0.30, "purge": 0.25
}

SYSTEMIC_KEYWORDS = {
    "failure": 0.35, "decay": 0.30, "legacy": 0.25, "cascade": 0.35,
    "collapse": 0.40, "outage": 0.30, "degradation": 0.25, "embargo": 0.30,
    "backlog": 0.20, "scada": 0.35, "kernel panic": 0.50, "arc fault": 0.30,
    "dns": 0.30, "poisoning": 0.35, "quarantine": 0.30, "interties": 0.10,
    "timing": 0.25, "desynchronization": 0.35, "dielectric": 0.30
}

# ============================================================================
# WORKER 1: OSINT INGESTION SENSOR (Data Scraper / Ingestor)
# ============================================================================
@celery.task(name="tasks.ingest_osint_sensor_task", bind=True)
def ingest_osint_sensor_task(self, force_spike: bool = False) -> Dict[str, Any]:
    """
    Worker 1: Scrapes or generates raw OSINT text with coordinates and forensic evidence.
    Enqueues payload into Redis and hands off to Logos Engine.
    """
    try:
        r = get_redis_client()
        # 1. Ingest raw OSINT packet with geo & evidence
        payload = generate_random_osint_payload(force_spike=force_spike)
        
        # 2. Enqueue raw text into Redis ingestion queue
        try:
            r.lpush(settings.REDIS_INGESTION_QUEUE, json.dumps(payload))
            r.ltrim(settings.REDIS_INGESTION_QUEUE, 0, 199)
        except Exception as queue_err:
            logger.debug(f"[OSINT SENSOR] Redis queue push skipped: {queue_err}")
        
        logger.info(f"[OSINT SENSOR] Ingested raw signal ID: {payload['id']} from {payload['source']} ({payload['geo']['city']})")
        
        # 3. Hand off to Worker 2: Logos Engine
        process_logos_engine_task.delay(payload)
        
        return {"status": "ENQUEUED", "payload_id": payload["id"]}
    except Exception as e:
        logger.error(f"[OSINT SENSOR ERROR] Failed to ingest OSINT payload: {e}")
        return {"status": "ERROR", "error": str(e)}


# ============================================================================
# WORKER 2: LOGOS ENGINE (NLP & Entropy Analyzer)
# ============================================================================
def calculate_logos_entropy_metrics(text: str, force_spike: bool = False, base_fric: float = 0.2, base_iner: float = 0.2) -> Tuple[float, float, float]:
    """
    Simulated LLM & NLP analysis of raw text using lexical scoring + thermodynamic fluctuation.
    Occasionally spikes to simulate Red Alert conditions.
    """
    lower_text = text.lower()
    
    # 1. Compute lexical keyword scores
    panic_score = sum(weight for kw, weight in PANIC_KEYWORDS.items() if kw in lower_text)
    systemic_score = sum(weight for kw, weight in SYSTEMIC_KEYWORDS.items() if kw in lower_text)
    
    # 2. Base stochastic fluctuation
    rand_fric = random.uniform(-0.05, 0.07)
    rand_iner = random.uniform(-0.05, 0.07)
    
    # 3. Calculate social friction (hostility / panic in text)
    social_friction = min(1.0, max(0.02, base_fric + (panic_score * 0.40) + rand_fric))
    
    # 4. Calculate structural inertia (systemic failure / legacy decay)
    structural_inertia = min(1.0, max(0.02, base_iner + (systemic_score * 0.40) + rand_iner))
    
    # 5. Dynamic Thermal Spike check (simulate Red Alert kernel panic)
    is_spike = force_spike or (random.random() < 0.12) or ("kernel panic" in lower_text) or ("severed" in lower_text)
    
    if is_spike:
        social_friction = round(random.uniform(0.78, 0.98), 3)
        structural_inertia = round(random.uniform(0.81, 0.99), 3)
        thermal_load = (0.50 * social_friction) + (0.50 * structural_inertia) + random.uniform(0.01, 0.03)
        omega_index = round(min(0.999, max(0.720, thermal_load)), 3)
    else:
        thermal_load = (0.48 * social_friction) + (0.48 * structural_inertia) + random.uniform(-0.02, 0.03)
        omega_index = round(min(0.95, max(0.04, thermal_load)), 3)
        
    return round(social_friction, 3), round(structural_inertia, 3), omega_index


@celery.task(name="tasks.process_logos_engine_task", bind=True)
def process_logos_engine_task(self, raw_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Worker 2: Consumes raw OSINT payload, runs NLP Entropy Analysis,
    outputs 3 metrics, maps geographic origin and forensic evidence,
    determines mitigation action, updates history in Redis, and publishes.
    """
    try:
        r = get_redis_client()
        headline = raw_payload.get("headline", "")
        raw_content = raw_payload.get("raw_content", "")
        force_spike = raw_payload.get("force_spike", False)
        
        full_text = f"{headline} {raw_content}"
        
        # Analyze metrics with Logos Engine
        social_friction, structural_inertia, omega_index = calculate_logos_entropy_metrics(
            full_text,
            force_spike=force_spike,
            base_fric=0.25 if raw_payload.get("urgency") == "ELEVATED" else 0.12,
            base_iner=0.28 if raw_payload.get("urgency") == "ELEVATED" else 0.15
        )
        
        # Determine mitigation action and initial threat classification
        if omega_index < settings.OMEGA_GREEN_THRESHOLD:
            threat_level = "GREEN"
            action = "NEUTRALIZED: ROUTED TO COLD MATRIX // PASSIVE SYNTERGIC LOG"
        elif omega_index <= settings.OMEGA_YELLOW_THRESHOLD:
            threat_level = "YELLOW"
            action = "NEUTRALIZED: DYNAMIC RATE-LIMITING APPLIED // ADAPTIVE CRYPTIC BUFFER"
        else:
            threat_level = "RED"
            action = "NEUTRALIZED: WU-WEI PROTOCOL ENGAGED // TOTAL HARDWARE SANDBOX QUARANTINE"

        # Ensure valid geo & evidence
        default_feed = random.choice(OSINT_FEEDS_CATALOG)
        geo = raw_payload.get("geo") or default_feed["geo"]
        evidence = raw_payload.get("evidence") or default_feed["evidence"]

        record = {
            "id": raw_payload.get("id"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": raw_payload.get("source"),
            "headline": headline,
            "metrics": {
                "social_friction": social_friction,
                "structural_inertia": structural_inertia,
                "omega_index": omega_index
            },
            "threat_level": threat_level,
            "neutralized_action": action,
            "geo": geo,
            "evidence": evidence
        }

        record_json = json.dumps(record)

        # Append to historical list in Redis
        try:
            r.lpush(settings.REDIS_HISTORY_KEY, record_json)
            r.ltrim(settings.REDIS_HISTORY_KEY, 0, settings.TELEMETRY_HISTORY_LIMIT - 1)
            r.publish(settings.REDIS_STREAM_CHANNEL, record_json)
        except Exception as redis_err:
            logger.debug(f"[LOGOS ENGINE] Redis stream publish skipped: {redis_err}")

        logger.info(
            f"[LOGOS ENGINE] Processed {record['id']} ({geo.get('city')}) | "
            f"SF: {social_friction:.3f} | SI: {structural_inertia:.3f} | Ω: {omega_index:.3f} | Action: {action[:25]}..."
        )

        return record
    except Exception as e:
        logger.error(f"[LOGOS ENGINE ERROR] Processing failed: {e}")
        return {"status": "ERROR", "error": str(e)}
