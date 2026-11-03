export type ThreatLevel = "GREEN" | "YELLOW" | "RED";

export interface LogosMetrics {
  social_friction: number;
  structural_inertia: number;
  omega_index: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
  country_code?: string;
  region: string;
  facility: string;
}

export interface TimelineStep {
  offset: string;
  event: string;
  severity: string;
}

export type StrategicFront =
  | "ALL"
  | "CYBER_WARFARE"
  | "INFRASTRUCTURE_CLOUD"
  | "GEOPOLITICAL_CONFLICT"
  | "GEOPHYSICAL_CLIMATE"
  | "SPACE_WEATHER_GRID"
  | "FINANCIAL_MACRO"
  | "BIO_HUMANITARIAN";

export interface ForensicEvidence {
  event_type: string;
  strategic_front?: string;
  protocol?: string;
  asn_or_sector?: string;
  impact_radius_km?: number;
  entities: string[];
  raw_evidence: string;
  timeline?: TimelineStep[];
  confidence_score: number;
  source_url: string;
  detection_vector: string;
  sha256_fingerprint?: string;
}

export interface TelemetryRecord {
  id: string;
  timestamp: string;
  source: string;
  headline: string;
  metrics: LogosMetrics;
  threat_level: ThreatLevel;
  moving_avg_omega?: number;
  mitigation_directive?: string;
  neutralized_action: string;
  mitigated_by_soc?: boolean;
  geo?: GeoLocation;
  evidence?: ForensicEvidence;
}

export interface SystemState {
  threat_level: ThreatLevel;
  current_omega: number;
  moving_avg_omega: number;
  social_friction: number;
  structural_inertia: number;
  mitigation_directive: string;
  connected_clients: number;
  total_injections_processed: number;
  timestamp: string;
}

export interface WebSocketMessage {
  type: "INITIAL_SNAPSHOT" | "TELEMETRY_UPDATE" | "PONG";
  data?: TelemetryRecord;
  system_state?: SystemState;
  history?: TelemetryRecord[];
  timestamp?: string;
}
