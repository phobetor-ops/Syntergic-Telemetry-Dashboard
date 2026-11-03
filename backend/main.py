import asyncio
import collections
import json
import logging
import os
import random
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Dict, Any, List, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as aioredis
import redis

from config import settings
from models import (
    ThreatLevel,
    LogosMetrics,
    GeoLocation,
    ForensicEvidence,
    TelemetryRecord,
    SystemState,
    ManualInjectionRequest,
    MitigateNodeRequest
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("syntergic.dispatcher")

# In-memory sliding window for moving average calculation and local fallback buffer
omega_window = collections.deque(maxlen=settings.MOVING_AVERAGE_WINDOW)
local_history_buffer = collections.deque(maxlen=200)
total_injections_counter = 0

# Active WebSocket clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[DISPATCHER] New client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"[DISPATCHER] Client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        
        dead_connections = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"[DISPATCHER] Error sending to client: {e}")
                dead_connections.add(connection)
        
        for dead in dead_connections:
            self.active_connections.discard(dead)

manager = ConnectionManager()

def compute_threat_state(current_omega: float) -> tuple[ThreatLevel, float, str]:
    """Computes global threat level and mitigation directive based on moving average."""
    omega_window.append(current_omega)
    moving_avg = round(sum(omega_window) / len(omega_window), 3)

    if moving_avg < settings.OMEGA_GREEN_THRESHOLD:
        threat_level = ThreatLevel.GREEN
        directive = "STATUS: GREEN | STABLE SYNTERGIA | NORMAL I/O"
    elif moving_avg <= settings.OMEGA_YELLOW_THRESHOLD:
        threat_level = ThreatLevel.YELLOW
        directive = "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE"
    else:
        threat_level = ThreatLevel.RED
        directive = "STATUS: RED | GLOBAL KERNEL PANIC | WU-WEI PROTOCOL ENGAGED / SANDBOXING ACTIVE"

    return threat_level, moving_avg, directive

async def finalize_and_broadcast_record(record: Dict[str, Any], force_spike: bool = False) -> Dict[str, Any]:
    """Updates moving average window, local history buffer, and broadcasts to all WebSocket clients."""
    global total_injections_counter
    omega_val = float(record["metrics"]["omega_index"])
    
    # If operator explicitly forced a spike, push extra thermal weight into window for immediate global escalation
    if force_spike:
        for _ in range(4):
            omega_window.append(omega_val)
            
    threat_level, moving_avg, directive = compute_threat_state(omega_val)
    record["moving_avg_omega"] = moving_avg
    record["mitigation_directive"] = directive
    
    total_injections_counter += 1
    local_history_buffer.appendleft(record)

    payload = {
        "type": "TELEMETRY_UPDATE",
        "data": record,
        "system_state": {
            "threat_level": threat_level.value,
            "current_omega": omega_val,
            "moving_avg_omega": moving_avg,
            "social_friction": record["metrics"]["social_friction"],
            "structural_inertia": record["metrics"]["structural_inertia"],
            "mitigation_directive": directive,
            "connected_clients": len(manager.active_connections),
            "total_injections_processed": total_injections_counter,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    await manager.broadcast(payload)
    return payload

# Background task to listen to Redis PubSub and broadcast to WebSockets
async def redis_listener_loop():
    """Worker 3: Zero Trust Dispatcher background listener."""
    retry_delay = 3.5
    
    while True:
        try:
            r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(settings.REDIS_STREAM_CHANNEL)
            logger.info(f"[DISPATCHER] Subscribed to {settings.REDIS_STREAM_CHANNEL}. Dispatcher ready.")
            
            async for message in pubsub.listen():
                if message and message["type"] == "message":
                    raw_data = message["data"]
                    try:
                        record = json.loads(raw_data)
                        await finalize_and_broadcast_record(record)
                    except Exception as parse_err:
                        logger.error(f"[DISPATCHER] Error parsing message: {parse_err}")
                        
        except asyncio.CancelledError:
            logger.info("[DISPATCHER] Redis listener loop cancelled.")
            break
        except Exception:
            await asyncio.sleep(retry_delay)
            await fallback_local_simulation_step()

async def fallback_local_simulation_step():
    """Generates rich synthetic telemetry with geo and evidence if Redis/Celery is offline or in standalone mode."""
    from mock_feeds import generate_random_osint_payload
    from tasks import calculate_logos_entropy_metrics
    
    mock_payload = generate_random_osint_payload()
    sf, si, omega = calculate_logos_entropy_metrics(
        f"{mock_payload['headline']} {mock_payload['raw_content']}",
        force_spike=mock_payload.get("force_spike", False)
    )
    
    if omega < settings.OMEGA_GREEN_THRESHOLD:
        node_level = "GREEN"
        act = "NEUTRALIZED: ROUTED TO COLD MATRIX // PASSIVE SYNTERGIC LOG"
    elif omega <= settings.OMEGA_YELLOW_THRESHOLD:
        node_level = "YELLOW"
        act = "NEUTRALIZED: DYNAMIC RATE-LIMITING APPLIED // ADAPTIVE CRYPTIC BUFFER"
    else:
        node_level = "RED"
        act = "NEUTRALIZED: WU-WEI PROTOCOL ENGAGED // TOTAL HARDWARE SANDBOX QUARANTINE"

    record = {
        "id": mock_payload["id"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": mock_payload["source"],
        "headline": mock_payload["headline"],
        "metrics": {
            "social_friction": sf,
            "structural_inertia": si,
            "omega_index": omega
        },
        "threat_level": node_level,
        "neutralized_action": act,
        "mitigated_by_soc": False,
        "geo": mock_payload.get("geo"),
        "evidence": mock_payload.get("evidence")
    }
    
    await finalize_and_broadcast_record(record)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global total_injections_counter
    for _ in range(5):
        omega_window.append(0.32)
    
    # Pre-populate local history buffer with real-time live internet OSINT events
    from mock_feeds import get_active_osint_pool
    live_pool = get_active_osint_pool(force_refresh=True)
    for idx, item in enumerate(live_pool):
        sf = item["base_friction"]
        si = item["base_inertia"]
        om = round((sf * 0.5) + (si * 0.5), 3)
        lvl = "RED" if om > 0.7 else "YELLOW" if om >= 0.4 else "GREEN"
        act = "NEUTRALIZED: WU-WEI PROTOCOL ENGAGED // TOTAL HARDWARE SANDBOX QUARANTINE" if lvl == "RED" else (
            "NEUTRALIZED: DYNAMIC RATE-LIMITING APPLIED // ADAPTIVE CRYPTIC BUFFER" if lvl == "YELLOW" else
            "NEUTRALIZED: ROUTED TO COLD MATRIX // PASSIVE SYNTERGIC LOG"
        )
        local_history_buffer.append({
            "id": f"OSINT-LIVE-{1000 + idx}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": item["source"],
            "headline": item["headline"],
            "metrics": {
                "social_friction": sf,
                "structural_inertia": si,
                "omega_index": om
            },
            "threat_level": lvl,
            "moving_avg_omega": 0.42,
            "mitigation_directive": "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE",
            "neutralized_action": act,
            "mitigated_by_soc": False,
            "geo": item["geo"],
            "evidence": item["evidence"]
        })
        total_injections_counter += 1
    
    listener_task = asyncio.create_task(redis_listener_loop())
    logger.info(f"[LIFECYCLE] Zero Trust Dispatcher initialized with {len(live_pool)} LIVE global OSINT events.")
    yield
    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass
    logger.info("[LIFECYCLE] Dispatcher shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# REST ENDPOINTS
# ============================================================================
@app.get("/")
def get_root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "2.0.0",
        "status": "OPERATIONAL",
        "directive": "PASSIVE SYNTERGIC IDS ACTIVE"
    }

@app.get("/health")
def get_health():
    redis_healthy = False
    try:
        r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=0.5)
        redis_healthy = r.ping()
    except Exception:
        redis_healthy = False
        
    return {
        "status": "UP",
        "redis_connected": redis_healthy,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "connected_ws_clients": len(manager.active_connections),
        "total_injections": total_injections_counter
    }

@app.get("/api/status", response_model=SystemState)
def get_current_system_state():
    latest_omega = omega_window[-1] if omega_window else 0.25
    moving_avg = round(sum(omega_window) / len(omega_window), 3) if omega_window else 0.25
    if moving_avg < settings.OMEGA_GREEN_THRESHOLD:
        threat_level = ThreatLevel.GREEN
        directive = "STATUS: GREEN | STABLE SYNTERGIA | NORMAL I/O"
    elif moving_avg <= settings.OMEGA_YELLOW_THRESHOLD:
        threat_level = ThreatLevel.YELLOW
        directive = "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE"
    else:
        threat_level = ThreatLevel.RED
        directive = "STATUS: RED | GLOBAL KERNEL PANIC | WU-WEI PROTOCOL ENGAGED / SANDBOXING ACTIVE"
    
    return SystemState(
        threat_level=threat_level,
        current_omega=latest_omega,
        moving_avg_omega=moving_avg,
        social_friction=round(moving_avg * 0.92, 3),
        structural_inertia=round(min(1.0, moving_avg * 1.05), 3),
        mitigation_directive=directive,
        connected_clients=len(manager.active_connections),
        total_injections_processed=total_injections_counter,
        timestamp=datetime.now(timezone.utc).isoformat()
    )

@app.get("/api/telemetry/history")
def get_telemetry_history(limit: int = 50):
    """Retrieves the recent history of neutralized OSINT injections with geo and evidence."""
    try:
        r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=0.5)
        raw_items = r.lrange(settings.REDIS_HISTORY_KEY, 0, limit - 1)
        if raw_items:
            return [json.loads(item) for item in raw_items]
    except Exception as e:
        logger.debug(f"[HISTORY] Redis read fallback: {e}")
        
    return list(local_history_buffer)[:limit]

@app.get("/api/telemetry/hotspots")
def get_active_hotspots():
    """Returns unique global facilities and their latest entropy state for map rendering."""
    history = list(local_history_buffer)
    hotspots_dict = {}
    for record in reversed(history):
        geo = record.get("geo")
        if geo:
            facility_key = geo.get("facility", geo.get("city", "UNKNOWN"))
            hotspots_dict[facility_key] = record

    return list(hotspots_dict.values())

@app.post("/api/telemetry/sync-live")
async def sync_live_osint_feeds():
    """Forces an immediate live synchronization from USGS, CISA KEV, NASA EONET, THN, SANS ISC, and BBC World."""
    from mock_feeds import get_active_osint_pool
    live_pool = get_active_osint_pool(force_refresh=True)
    local_history_buffer.clear()
    for idx, item in enumerate(live_pool):
        sf = item["base_friction"]
        si = item["base_inertia"]
        om = round((sf * 0.5) + (si * 0.5), 3)
        lvl = "RED" if om > 0.7 else "YELLOW" if om >= 0.4 else "GREEN"
        act = "NEUTRALIZED: WU-WEI PROTOCOL ENGAGED // TOTAL HARDWARE SANDBOX QUARANTINE" if lvl == "RED" else (
            "NEUTRALIZED: DYNAMIC RATE-LIMITING APPLIED // ADAPTIVE CRYPTIC BUFFER" if lvl == "YELLOW" else
            "NEUTRALIZED: ROUTED TO COLD MATRIX // PASSIVE SYNTERGIC LOG"
        )
        rec = {
            "id": f"OSINT-LIVE-{int(datetime.now().timestamp())}-{idx}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": item["source"],
            "headline": item["headline"],
            "metrics": {
                "social_friction": sf,
                "structural_inertia": si,
                "omega_index": om
            },
            "threat_level": lvl,
            "moving_avg_omega": om,
            "mitigation_directive": "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE",
            "neutralized_action": act,
            "mitigated_by_soc": False,
            "geo": item["geo"],
            "evidence": item["evidence"]
        }
        local_history_buffer.append(rec)

    if local_history_buffer:
        await finalize_and_broadcast_record(local_history_buffer[0], force_spike=False)

    return {
        "status": "SYNCHRONIZED",
        "live_events_count": len(live_pool),
        "sources": [
            "RANSOMWARE_LIVE", "ABUSE_CH_FEODO", "CISA_KEV", "THE_HACKER_NEWS",
            "SANS_ISC", "CLOUDFLARE_STATUS", "GITHUB_STATUS", "BBC_WORLD",
            "AL_JAZEERA", "UN_NEWS", "BBC_MUNDO_LATAM", "GDACS_UN_EU",
            "USGS_SEISMIC", "NASA_EONET", "NOAA_SWPC", "CNBC_MACRO", "WHO_OMS"
        ]
    }


@app.post("/api/telemetry/telegram-dispatch")
def trigger_telegram_dispatch(mode: str = "digest"):
    """Dispatches an immediate 7-Front Panorama Digest or Emergency Alert to Telegram."""
    from telegram_notifier import (
        format_emergency_spike_alert,
        format_global_panorama_digest,
        send_telegram_message,
    )
    events = list(local_history_buffer)
    latest_omega = omega_window[-1] if omega_window else 0.42
    threat_level, moving_avg, _ = compute_threat_state(latest_omega)

    if mode == "sentinel":
        crit = [e for e in events if e.get("threat_level") == "RED"]
        msg = format_emergency_spike_alert(crit, moving_avg, threat_level.value, len(events))
    else:
        msg = format_global_panorama_digest(events, moving_avg, threat_level.value)

    sent = send_telegram_message(msg)
    return {
        "status": "SENT" if sent else "SKIPPED_MISSING_CREDENTIALS",
        "mode": mode,
        "events_included": len(events),
        "moving_avg_omega": moving_avg,
    }

@app.post("/api/telemetry/inject")
async def manual_osint_injection(req: ManualInjectionRequest):
    """Allows operator / SOC analyst to inject synthetic intel or trigger immediate Red Alert."""
    try:
        from tasks import process_logos_engine_task
        from mock_feeds import generate_random_osint_payload, OSINT_FEEDS_CATALOG
        
        custom_geo = None
        if req.lat is not None and req.lng is not None:
            custom_geo = {
                "lat": req.lat,
                "lng": req.lng,
                "city": req.city or "Designated Sector",
                "country": req.country or "Global Domain",
                "country_code": "UN",
                "region": "Field Operations",
                "facility": req.facility or "Tactical Sensor Relay"
            }
        elif req.city:
            # Match existing city if possible
            for item in OSINT_FEEDS_CATALOG:
                if req.city.lower() in item["geo"]["city"].lower():
                    custom_geo = item["geo"]
                    break

        custom_payload = generate_random_osint_payload(
            force_spike=req.force_spike,
            custom_headline=req.headline,
            custom_geo=custom_geo
        )
        if req.source:
            custom_payload["source"] = req.source
        
        redis_available = False
        try:
            r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=0.3)
            redis_available = r.ping()
        except Exception:
            redis_available = False

        if redis_available:
            try:
                process_logos_engine_task.delay(custom_payload)
                status_msg = "ENQUEUED_TO_CELERY"
            except Exception:
                record = process_logos_engine_task(custom_payload)
                await finalize_and_broadcast_record(record, force_spike=req.force_spike)
                status_msg = "PROCESSED_AND_BROADCASTED"
        else:
            record = process_logos_engine_task(custom_payload)
            await finalize_and_broadcast_record(record, force_spike=req.force_spike)
            status_msg = "PROCESSED_AND_BROADCASTED"
            
        return {
            "status": "SUCCESS",
            "mode": status_msg,
            "payload_id": custom_payload["id"],
            "force_spike": req.force_spike,
            "geo": custom_payload.get("geo")
        }
    except Exception as e:
        logger.error(f"[MANUAL INJECT ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/telemetry/mitigate")
async def mitigate_node_endpoint(req: MitigateNodeRequest):
    """Executes active SOC mitigation / Wu-Wei quarantine on a specific incident or facility."""
    target_record = None
    for item in local_history_buffer:
        if item.get("id") == req.event_id or (req.facility and item.get("geo", {}).get("facility") == req.facility):
            target_record = item
            break

    if not target_record and local_history_buffer:
        target_record = local_history_buffer[0]

    if not target_record:
        raise HTTPException(status_code=404, detail="Event or node not found")

    # Create a new mitigated record for that facility so the map node turns GREEN / mitigated
    geo = target_record.get("geo", {})
    evidence = dict(target_record.get("evidence", {}))
    timeline = list(evidence.get("timeline", []))
    timeline.append({
        "offset": "T+00s [SOC]",
        "event": f"Operator executed {req.action_type} on {geo.get('facility', 'Node')}. Entropy neutralized.",
        "severity": "NORMAL"
    })
    evidence["timeline"] = timeline

    mitigated_record = {
        "id": f"MIT-{int(datetime.now().timestamp())}-{random.randint(10,99)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "SOC_WU_WEI_CONTROLLER",
        "headline": f"[MITIGATED] {geo.get('city', 'Sector')}: {req.action_type} enforced on {geo.get('facility', 'Node')}. Thermal load stabilized.",
        "metrics": {
            "social_friction": 0.08,
            "structural_inertia": 0.11,
            "omega_index": 0.095
        },
        "threat_level": "GREEN",
        "neutralized_action": f"SOC OVERRIDE: {req.action_type} CONFIRMED // NODE STABILIZED",
        "mitigated_by_soc": True,
        "geo": geo,
        "evidence": evidence
    }

    # Cool down global moving average window
    for _ in range(3):
        omega_window.append(0.095)

    broadcast_payload = await finalize_and_broadcast_record(mitigated_record, force_spike=False)
    return {
        "status": "MITIGATED",
        "action": req.action_type,
        "record": broadcast_payload["data"],
        "system_state": broadcast_payload["system_state"]
    }

# ============================================================================
# WEBSOCKET BROADCASTER (Zero Trust Dispatcher)
# ============================================================================
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        latest_omega = omega_window[-1] if omega_window else 0.25
        threat_level, moving_avg, directive = compute_threat_state(latest_omega)
        
        history_list = []
        try:
            r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=0.3)
            raw_items = r.lrange(settings.REDIS_HISTORY_KEY, 0, 119)
            history_list = [json.loads(item) for item in raw_items]
        except Exception:
            history_list = list(local_history_buffer)[:120]
            
        initial_packet = {
            "type": "INITIAL_SNAPSHOT",
            "system_state": {
                "threat_level": threat_level.value,
                "current_omega": latest_omega,
                "moving_avg_omega": moving_avg,
                "social_friction": round(moving_avg * 0.92, 3),
                "structural_inertia": round(min(1.0, moving_avg * 1.05), 3),
                "mitigation_directive": directive,
                "connected_clients": len(manager.active_connections),
                "total_injections_processed": total_injections_counter,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            "history": history_list
        }
        await websocket.send_json(initial_packet)
        
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "PING":
                    await websocket.send_json({"type": "PONG", "timestamp": datetime.now(timezone.utc).isoformat()})
                elif msg.get("action") == "TRIGGER_SPIKE":
                    from tasks import process_logos_engine_task
                    from mock_feeds import generate_random_osint_payload
                    spike_payload = generate_random_osint_payload(force_spike=True)
                    record = process_logos_engine_task(spike_payload)
                    await finalize_and_broadcast_record(record, force_spike=True)
            except Exception as ws_err:
                logger.debug(f"[WS ACTION] {ws_err}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WEBSOCKET] Disconnection: {e}")
        manager.disconnect(websocket)
