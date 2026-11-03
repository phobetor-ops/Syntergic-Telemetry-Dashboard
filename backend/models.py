from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ThreatLevel(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"

class LogosMetrics(BaseModel):
    social_friction: float = Field(..., ge=0.0, le=1.0, description="Level of hostility or panic in text")
    structural_inertia: float = Field(..., ge=0.0, le=1.0, description="Mentions of systemic failure or legacy decay")
    omega_index: float = Field(..., ge=0.0, le=1.0, description="Total calculated thermal load / entropy of dataset")

class GeoLocation(BaseModel):
    lat: float = Field(..., description="Latitude coordinate (-90 to 90)")
    lng: float = Field(..., description="Longitude coordinate (-180 to 180)")
    city: str
    country: str
    country_code: str = "UN"
    region: str
    facility: str

class TimelineStep(BaseModel):
    offset: str
    event: str
    severity: str

class ForensicEvidence(BaseModel):
    event_type: str
    strategic_front: str = "CYBER_WARFARE"
    protocol: str = "TCP/IP TELEMETRY"
    asn_or_sector: str = "CORE-INFRASTRUCTURE"
    impact_radius_km: int = 250
    entities: List[str]
    raw_evidence: str
    timeline: List[TimelineStep] = []
    confidence_score: float = 0.95
    source_url: str
    detection_vector: str
    sha256_fingerprint: str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

class OSINTPayload(BaseModel):
    id: str
    timestamp: str
    source: str
    headline: str
    raw_content: str
    urgency: str = "NORMAL"
    force_spike: bool = False
    geo: Optional[GeoLocation] = None
    evidence: Optional[ForensicEvidence] = None

class TelemetryRecord(BaseModel):
    id: str
    timestamp: str
    source: str
    headline: str
    metrics: LogosMetrics
    threat_level: ThreatLevel
    moving_avg_omega: float
    mitigation_directive: str
    neutralized_action: str
    mitigated_by_soc: bool = False
    geo: GeoLocation
    evidence: ForensicEvidence

class SystemState(BaseModel):
    threat_level: ThreatLevel
    current_omega: float
    moving_avg_omega: float
    social_friction: float
    structural_inertia: float
    mitigation_directive: str
    connected_clients: int
    total_injections_processed: int
    timestamp: str

class ManualInjectionRequest(BaseModel):
    headline: str
    source: Optional[str] = "SOC_DIRECT_INJECTION"
    force_spike: bool = False
    urgency: Optional[str] = "CRITICAL"
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    facility: Optional[str] = None

class MitigateNodeRequest(BaseModel):
    event_id: str
    facility: Optional[str] = None
    action_type: str = "WU_WEI_ISOLATION"
