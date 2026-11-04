"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SystemState, TelemetryRecord, WebSocketMessage, ThreatLevel } from "@/types/telemetry";

const DEFAULT_STATE: SystemState = {
  threat_level: "YELLOW",
  current_omega: 0.58,
  moving_avg_omega: 0.56,
  social_friction: 0.54,
  structural_inertia: 0.58,
  mitigation_directive: "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE",
  connected_clients: 1,
  total_injections_processed: 0,
  timestamp: new Date().toISOString(),
};

export interface ChartDataPoint {
  time: string;
  timestamp: string;
  social_friction: number;
  structural_inertia: number;
  omega_index: number;
  moving_avg: number;
}

function computeThreatStateFromWindow(windowVals: number[], latestRecord: TelemetryRecord): SystemState {
  const avg =
    windowVals.length > 0
      ? Number((windowVals.reduce((a, b) => a + b, 0) / windowVals.length).toFixed(3))
      : latestRecord.metrics.omega_index;

  let level: ThreatLevel = "GREEN";
  let directive = "STATUS: GREEN | STABLE SYNTERGIA | NORMAL I/O";
  if (avg > 0.7) {
    level = "RED";
    directive = "STATUS: RED | GLOBAL KERNEL PANIC | WU-WEI PROTOCOL ENGAGED / SANDBOXING ACTIVE";
  } else if (avg >= 0.4) {
    level = "YELLOW";
    directive = "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE";
  }

  return {
    threat_level: level,
    current_omega: latestRecord.metrics.omega_index,
    moving_avg_omega: avg,
    social_friction: latestRecord.metrics.social_friction,
    structural_inertia: latestRecord.metrics.structural_inertia,
    mitigation_directive: directive,
    connected_clients: 1,
    total_injections_processed: windowVals.length,
    timestamp: new Date().toISOString(),
  };
}

async function fetchBrowserLiveCorrosionFeeds(): Promise<TelemetryRecord[]> {
  const liveRecords: TelemetryRecord[] = [];
  const nowIso = new Date().toISOString();

  // 1. Live USGS 4.5+ Earthquakes (CORS enabled)
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
    );
    if (res.ok) {
      const data = await res.json();
      const features = (data.features || []).slice(0, 8);
      for (const feat of features) {
        const props = feat.properties || {};
        const coords = feat.geometry?.coordinates || [0, 0, 10];
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        const depth = Number(coords[2] || 10);
        const mag = Number(props.mag || 4.6);
        const place = String(props.place || `Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}`);
        const url = String(props.url || "https://earthquake.usgs.gov/");
        const id = String(feat.id || `usgs-${Math.random().toString(36).slice(2, 7)}`);

        const isCrit = mag >= 5.5;
        const isElev = mag >= 4.8 && !isCrit;
        const sf = isCrit ? 0.82 : isElev ? 0.55 : 0.32;
        const si = isCrit ? 0.86 : isElev ? 0.58 : 0.36;
        const om = Number((0.5 * sf + 0.5 * si).toFixed(3));
        const lvl: ThreatLevel = om > 0.7 ? "RED" : om >= 0.4 ? "YELLOW" : "GREEN";

        const parts = place.split(",");
        const countryRaw = (parts[parts.length - 1] || "Global").trim();

        liveRecords.push({
          id: `USGS-LIVE-${id.toUpperCase()}`,
          timestamp: new Date(props.time || Date.now()).toISOString(),
          source: "USGS_NEIC_LIVE",
          headline: `[LIVE SEISMIC M${mag.toFixed(1)}] ${place} (Depth: ${depth.toFixed(1)} km)`,
          metrics: { social_friction: sf, structural_inertia: si, omega_index: om },
          threat_level: lvl,
          moving_avg_omega: om,
          mitigation_directive:
            lvl === "RED"
              ? "STATUS: RED | GLOBAL KERNEL PANIC | WU-WEI PROTOCOL ENGAGED"
              : "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE",
          neutralized_action:
            lvl === "RED"
              ? "NEUTRALIZED: WU-WEI PROTOCOL ENGAGED // TOTAL HARDWARE SANDBOX QUARANTINE"
              : "NEUTRALIZED: DYNAMIC RATE-LIMITING APPLIED // ADAPTIVE CRYPTIC BUFFER",
          mitigated_by_soc: false,
          geo: {
            lat,
            lng,
            city: place.slice(0, 36),
            country: countryRaw,
            country_code: countryRaw.slice(0, 2).toUpperCase(),
            region: "Seismic Crustal Zone",
            facility: `USGS Station ${id.toUpperCase()}`,
          },
          evidence: {
            event_type: "REALTIME_SEISMIC_CRUSTAL_EVENT",
            strategic_front: "GEOPHYSICAL_CLIMATE",
            protocol: "USGS GeoJSON API v1.0 / ANSS ComCat",
            asn_or_sector: `USGS-${id.toUpperCase()}`,
            impact_radius_km: Math.round(Math.max(80, (mag - 3.5) * 180)),
            entities: ["USGS National Earthquake Information Center", place],
            raw_evidence: `[USGS-COMCAT-LIVE] EventID=${id} | Mag=M${mag.toFixed(1)} | Depth=${depth.toFixed(1)}km\n[HYPOCENTER] Lat=${lat.toFixed(4)}, Lng=${lng.toFixed(4)} (${place})\n[VERIFIABLE-URL] ${url}`,
            timeline: [
              {
                offset: "P-WAVE",
                event: `Primary seismic wave M${mag.toFixed(1)} recorded at ${place}`,
                severity: isCrit ? "CRITICAL" : "ELEVATED",
              },
              {
                offset: "LIVE-WEB",
                event: "Synchronized directly from earthquake.usgs.gov",
                severity: "NORMAL",
              },
            ],
            confidence_score: 0.99,
            source_url: url,
            detection_vector: "USGS_GLOBAL_SEISMOGRAPH_NETWORK",
            sha256_fingerprint: `usgs-${id}-verified`,
          },
        });
      }
    }
  } catch {
    // Ignore CORS / offline error
  }

  // 2. Live Cloudflare & GitHub Cloud Infrastructure Status (CORS enabled)
  const cloudEndpoints = [
    {
      tag: "CLOUDFLARE_EDGE_STATUS",
      url: "https://www.cloudflarestatus.com/api/v2/incidents.json",
      provider: "Cloudflare Global Anycast Network",
      lat: 37.7749,
      lng: -122.4194,
      city: "San Francisco / Global Edge",
      country: "United States of America",
    },
    {
      tag: "GITHUB_CLOUD_STATUS",
      url: "https://www.githubstatus.com/api/v2/incidents.json",
      provider: "GitHub Core Cloud Infrastructure",
      lat: 47.6062,
      lng: -122.3321,
      city: "Seattle / US-West Cloud",
      country: "United States of America",
    },
  ];

  for (const ep of cloudEndpoints) {
    try {
      const res = await fetch(ep.url);
      if (res.ok) {
        const data = await res.json();
        const incidents = (data.incidents || []).slice(0, 3);
        incidents.forEach((inc: any, i: number) => {
          const incId = String(inc.id || `INC-${i}`).slice(0, 8).toUpperCase();
          const name = String(inc.name || "Cloud Backbone Incident");
          const status = String(inc.status || "monitoring").toUpperCase();
          const impact = String(inc.impact || "minor").toLowerCase();
          const shortlink = String(inc.shortlink || ep.url);
          const body = String(inc.incident_updates?.[0]?.body || name);

          const isCrit = impact === "critical" || impact === "major";
          const sf = isCrit ? 0.8 : 0.48;
          const si = isCrit ? 0.84 : 0.54;
          const om = Number((0.5 * sf + 0.5 * si).toFixed(3));
          const lvl: ThreatLevel = om > 0.7 ? "RED" : om >= 0.4 ? "YELLOW" : "GREEN";

          liveRecords.push({
            id: `${ep.tag}-${incId}`,
            timestamp: inc.created_at || nowIso,
            source: ep.tag,
            headline: `[${ep.tag} // ${status}] ${name}`,
            metrics: { social_friction: sf, structural_inertia: si, omega_index: om },
            threat_level: lvl,
            moving_avg_omega: om,
            mitigation_directive: "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE",
            neutralized_action: "NEUTRALIZED: DYNAMIC RATE-LIMITING APPLIED // ADAPTIVE CRYPTIC BUFFER",
            mitigated_by_soc: false,
            geo: {
              lat: ep.lat + i * 0.65,
              lng: ep.lng - i * 0.65,
              city: ep.city,
              country: ep.country,
              country_code: "US",
              region: "Global Cloud Backbone",
              facility: `${ep.provider} [${incId}]`,
            },
            evidence: {
              event_type: "CLOUD_BACKBONE_INFRASTRUCTURE_INCIDENT",
              strategic_front: "INFRASTRUCTURE_CLOUD",
              protocol: "BGP Anycast / Edge CDN / Statuspage API v2",
              asn_or_sector: `${ep.tag}-${incId}`,
              impact_radius_km: 550,
              entities: [ep.provider, `Status: ${status}`, `Impact: ${impact.toUpperCase()}`],
              raw_evidence: `[CLOUD-STATUS-LIVE] Provider=${ep.provider} | ID=${incId} | Status=${status}\n[INCIDENT] ${name}\n[DETAILS] ${body.slice(0, 280)}\n[URL] ${shortlink}`,
              timeline: [
                { offset: "INCIDENT", event: name, severity: isCrit ? "CRITICAL" : "ELEVATED" },
                { offset: status, event: body.slice(0, 120), severity: "NORMAL" },
              ],
              confidence_score: 0.99,
              source_url: shortlink,
              detection_vector: ep.tag,
              sha256_fingerprint: `cloud-${incId}`,
            },
          });
        });
      }
    } catch {
      // Ignore CORS error
    }
  }

  return liveRecords;
}

export function useSyntergicSocket() {
  const [connected, setConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(14);
  const [systemState, setSystemState] = useState<SystemState>(DEFAULT_STATE);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryRecord[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [streamPaused, setStreamPaused] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cloudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cloudModeActiveRef = useRef<boolean>(false);
  const omegaWindowRef = useRef<number[]>([0.52, 0.56, 0.48, 0.61, 0.54]);
  const lastPingTimeRef = useRef<number>(Date.now());
  const prevThreatLevelRef = useRef<ThreatLevel>("GREEN");
  const soundEnabledRef = useRef<boolean>(false);
  const streamPausedRef = useRef<boolean>(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    streamPausedRef.current = streamPaused;
  }, [streamPaused]);

  const playAlertSound = useCallback((level: ThreatLevel) => {
    if (!soundEnabledRef.current || typeof window === "undefined") return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (level === "RED") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (level === "YELLOW") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Ignore audio gesture restriction
    }
  }, []);

  const addTelemetryPoint = useCallback((record: TelemetryRecord, state: SystemState) => {
    const dateObj = new Date(record.timestamp);
    const timeLabel = isNaN(dateObj.getTime())
      ? new Date().toLocaleTimeString("en-GB", { hour12: false })
      : dateObj.toLocaleTimeString("en-GB", { hour12: false });

    const newPoint: ChartDataPoint = {
      time: timeLabel,
      timestamp: record.timestamp,
      social_friction: record.metrics.social_friction,
      structural_inertia: record.metrics.structural_inertia,
      omega_index: record.metrics.omega_index,
      moving_avg: state.moving_avg_omega,
    };

    setChartData((prev) => [...prev, newPoint].slice(-45));
    setTelemetryHistory((prev) => {
      const filtered = prev.filter((p) => p.id !== record.id);
      return [record, ...filtered].slice(0, 160);
    });
  }, []);

  // Cloud Autonomous Mode (for GitHub Pages or when local FastAPI is not running)
  const activateCloudAutonomousMode = useCallback(async () => {
    if (cloudModeActiveRef.current) return;
    cloudModeActiveRef.current = true;
    setConnected(true);
    setLatencyMs(14);

    let combinedRecords: TelemetryRecord[] = [];

    // 1. Load pre-synchronized 7-Front snapshot from public/live-osint-snapshot.json
    try {
      const basePath = window.location.pathname.startsWith("/Syntergic-Telemetry-Dashboard")
        ? "/Syntergic-Telemetry-Dashboard"
        : "";
      const snapRes = await fetch(`${basePath}/live-osint-snapshot.json`, { cache: "no-store" });
      if (snapRes.ok) {
        const snap = await snapRes.json();
        if (Array.isArray(snap.history)) {
          combinedRecords.push(...snap.history);
        }
      }
    } catch {
      // Snapshot optional
    }

    // 2. Fetch real-time browser-direct feeds (USGS, Cloudflare, GitHub)
    try {
      const liveBrowser = await fetchBrowserLiveCorrosionFeeds();
      if (liveBrowser.length > 0) {
        // Merge avoiding duplicate facilities
        const existingFacilities = new Set(combinedRecords.map((r) => r.geo?.facility));
        for (const item of liveBrowser) {
          if (!existingFacilities.has(item.geo?.facility)) {
            combinedRecords.unshift(item);
          }
        }
      }
    } catch {
      // Ignore
    }

    if (combinedRecords.length > 0) {
      setTelemetryHistory(combinedRecords);
      const omegas = combinedRecords.slice(0, 10).map((r) => r.metrics.omega_index);
      omegaWindowRef.current = omegas;
      const computedState = computeThreatStateFromWindow(omegas, combinedRecords[0]);
      setSystemState({
        ...computedState,
        total_injections_processed: combinedRecords.length,
      });

      const points: ChartDataPoint[] = combinedRecords
        .slice(0, 30)
        .reverse()
        .map((item, idx) => ({
          time: new Date(Date.now() - (30 - idx) * 4000).toLocaleTimeString("en-GB", {
            hour12: false,
          }),
          timestamp: item.timestamp,
          social_friction: item.metrics.social_friction,
          structural_inertia: item.metrics.structural_inertia,
          omega_index: item.metrics.omega_index,
          moving_avg: computedState.moving_avg_omega,
        }));
      setChartData(points);
    }

    // 3. Start periodic live telemetry ticker for the time-series graph
    if (cloudTimerRef.current) clearInterval(cloudTimerRef.current);
    let cursor = 0;
    cloudTimerRef.current = setInterval(() => {
      if (streamPausedRef.current || combinedRecords.length === 0) return;
      const sample = combinedRecords[cursor % combinedRecords.length];
      cursor += 1;

      const jitter = (Math.random() - 0.5) * 0.03;
      const sf = Number(Math.max(0.05, Math.min(0.99, sample.metrics.social_friction + jitter)).toFixed(3));
      const si = Number(Math.max(0.05, Math.min(0.99, sample.metrics.structural_inertia + jitter)).toFixed(3));
      const om = Number((0.5 * sf + 0.5 * si).toFixed(3));

      omegaWindowRef.current = [...omegaWindowRef.current.slice(-9), om];
      const nextState = computeThreatStateFromWindow(omegaWindowRef.current, {
        ...sample,
        metrics: { social_friction: sf, structural_inertia: si, omega_index: om },
      });

      setSystemState((prev) => ({
        ...nextState,
        total_injections_processed: prev.total_injections_processed + 1,
      }));
      setLatencyMs(11 + Math.floor(Math.random() * 7));

      const dateLabel = new Date().toLocaleTimeString("en-GB", { hour12: false });
      setChartData((prev) =>
        [
          ...prev,
          {
            time: dateLabel,
            timestamp: new Date().toISOString(),
            social_friction: sf,
            structural_inertia: si,
            omega_index: om,
            moving_avg: nextState.moving_avg_omega,
          },
        ].slice(-45)
      );
    }, 4500);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined") return;

    // If running on GitHub Pages (https://*.github.io), immediately run Cloud Autonomous Mode
    if (
      window.location.hostname.includes("github.io") ||
      window.location.protocol === "https:"
    ) {
      activateCloudAutonomousMode();
      return;
    }

    const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;
    const host = window.location.hostname || "localhost";
    const wsUrl = envWsUrl || `ws://${host}:8000/ws/telemetry`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      const fallbackTimer = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          activateCloudAutonomousMode();
        }
      }, 2200);

      ws.onopen = () => {
        clearTimeout(fallbackTimer);
        cloudModeActiveRef.current = false;
        if (cloudTimerRef.current) clearInterval(cloudTimerRef.current);
        setConnected(true);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingTimeRef.current = Date.now();
            ws.send(JSON.stringify({ action: "PING" }));
          }
        }, 8000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);

          if (msg.type === "PONG") {
            const rtt = Math.max(1, Date.now() - lastPingTimeRef.current);
            setLatencyMs(rtt);
            return;
          }

          if (msg.type === "INITIAL_SNAPSHOT") {
            if (msg.system_state) {
              setSystemState(msg.system_state);
              prevThreatLevelRef.current = msg.system_state.threat_level;
            }
            if (msg.history && msg.history.length > 0) {
              setTelemetryHistory(msg.history);
              const sorted = [...msg.history].reverse();
              const points: ChartDataPoint[] = sorted.map((item) => {
                const dateObj = new Date(item.timestamp);
                const timeLabel = isNaN(dateObj.getTime())
                  ? new Date().toLocaleTimeString("en-GB", { hour12: false })
                  : dateObj.toLocaleTimeString("en-GB", { hour12: false });
                return {
                  time: timeLabel,
                  timestamp: item.timestamp,
                  social_friction: item.metrics.social_friction,
                  structural_inertia: item.metrics.structural_inertia,
                  omega_index: item.metrics.omega_index,
                  moving_avg: item.moving_avg_omega ?? item.metrics.omega_index,
                };
              });
              setChartData(points.slice(-45));
            }
          } else if (msg.type === "TELEMETRY_UPDATE") {
            if (streamPausedRef.current) return;
            if (msg.system_state) {
              const currentLevel = msg.system_state.threat_level;
              if (currentLevel !== prevThreatLevelRef.current) {
                if (currentLevel === "RED" || currentLevel === "YELLOW") {
                  playAlertSound(currentLevel);
                }
                prevThreatLevelRef.current = currentLevel;
              }
              setSystemState(msg.system_state);
            }
            if (msg.data && msg.system_state) {
              addTelemetryPoint(msg.data, msg.system_state);
            }
          }
        } catch {
          // Ignore malformed message
        }
      };

      ws.onclose = () => {
        clearTimeout(fallbackTimer);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        activateCloudAutonomousMode();
      };

      ws.onerror = () => {
        clearTimeout(fallbackTimer);
        ws.close();
        activateCloudAutonomousMode();
      };
    } catch {
      activateCloudAutonomousMode();
    }
  }, [activateCloudAutonomousMode, addTelemetryPoint, playAlertSound]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (cloudTimerRef.current) clearInterval(cloudTimerRef.current);
    };
  }, [connectWebSocket]);

  const injectCustomPayload = useCallback(
    async (headline: string, forceSpike: boolean = false, city?: string) => {
      if (!cloudModeActiveRef.current) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        try {
          const res = await fetch(`${apiUrl}/api/telemetry/inject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              headline,
              source: "SOC_DIRECT_CONSOLE",
              force_spike: forceSpike,
              urgency: forceSpike ? "CRITICAL" : "NORMAL",
              city: city || undefined,
            }),
          });
          if (res.ok) return await res.json();
        } catch {
          // Fallback to client-side injection below
        }
      }

      // Client-side autonomous injection (for GitHub Pages)
      const sf = forceSpike ? 0.94 : 0.45;
      const si = forceSpike ? 0.92 : 0.48;
      const om = Number((0.5 * sf + 0.5 * si).toFixed(3));
      const lvl: ThreatLevel = om > 0.7 ? "RED" : om >= 0.4 ? "YELLOW" : "GREEN";
      const targetNode =
        telemetryHistory.find(
          (r) => city && r.geo?.city.toLowerCase().includes(city.toLowerCase())
        ) || telemetryHistory[0];

      const newRecord: TelemetryRecord = {
        id: `SOC-INJ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        source: "SOC_TACTICAL_CONSOLE",
        headline,
        metrics: { social_friction: sf, structural_inertia: si, omega_index: om },
        threat_level: lvl,
        moving_avg_omega: om,
        mitigation_directive:
          lvl === "RED"
            ? "STATUS: RED | GLOBAL KERNEL PANIC | WU-WEI PROTOCOL ENGAGED"
            : "STATUS: YELLOW | RISING ENTROPY | RATE LIMITING ACTIVE",
        neutralized_action:
          lvl === "RED"
            ? "NEUTRALIZED: WU-WEI PROTOCOL ENGAGED // TOTAL HARDWARE SANDBOX QUARANTINE"
            : "NEUTRALIZED: DYNAMIC RATE-LIMITING APPLIED // ADAPTIVE CRYPTIC BUFFER",
        mitigated_by_soc: false,
        geo: targetNode?.geo || {
          lat: 39.0438,
          lng: -77.4874,
          city: city || "Ashburn, VA",
          country: "United States of America",
          country_code: "US",
          region: "North America",
          facility: `SOC Tactical Target [${city || "Global"}]`,
        },
        evidence: {
          event_type: forceSpike ? "OPERATOR_CRITICAL_SPIKE" : "DIRECT_FIELD_OBSERVATION",
          strategic_front: "CYBER_WARFARE",
          protocol: "SYNTERGIC-DIRECT-OVERRIDE / TLS 1.3",
          asn_or_sector: "SOC-MANUAL-INJECTION",
          impact_radius_km: forceSpike ? 650 : 200,
          entities: ["SOC Operator Console", city || "Global Target"],
          raw_evidence: `[SOC-DIRECT-INJECT] Timestamp=${new Date().toISOString()}\n[PAYLOAD] "${headline}"\n[METRICS] SF=${sf} | SI=${si} | Omega=${om}`,
          timeline: [
            {
              offset: "T-00s",
              event: `SOC Operator injected signal: ${headline.slice(0, 70)}`,
              severity: forceSpike ? "CRITICAL" : "ELEVATED",
            },
          ],
          confidence_score: 0.99,
          source_url: "https://github.com/phobetor-ops/Syntergic-Telemetry-Dashboard",
          detection_vector: "SOC_MANUAL_CONSOLE",
          sha256_fingerprint: `soc-manual-${Date.now()}`,
        },
      };

      if (forceSpike) {
        omegaWindowRef.current = [0.88, 0.91, 0.93, 0.94, om];
        playAlertSound("RED");
      } else {
        omegaWindowRef.current = [...omegaWindowRef.current.slice(-9), om];
      }
      const nextState = computeThreatStateFromWindow(omegaWindowRef.current, newRecord);
      setSystemState(nextState);
      addTelemetryPoint(newRecord, nextState);
      return { status: "SUCCESS", record: newRecord };
    },
    [addTelemetryPoint, playAlertSound, telemetryHistory]
  );

  const triggerSpike = useCallback(() => {
    if (
      !cloudModeActiveRef.current &&
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN
    ) {
      socketRef.current.send(JSON.stringify({ action: "TRIGGER_SPIKE" }));
    } else {
      injectCustomPayload(
        "GLOBAL KERNEL PANIC: Multi-vector zero-day & BGP route hijack detected across core IXP nodes.",
        true
      );
    }
  }, [injectCustomPayload]);

  const mitigateNode = useCallback(
    async (
      eventId: string,
      facility?: string,
      actionType: string = "WU_WEI_SANDBOX_ISOLATION"
    ): Promise<TelemetryRecord | null> => {
      if (!cloudModeActiveRef.current) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        try {
          const res = await fetch(`${apiUrl}/api/telemetry/mitigate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: eventId,
              facility,
              action_type: actionType,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.record && data.system_state) {
              setSystemState(data.system_state);
              addTelemetryPoint(data.record, data.system_state);
              return data.record as TelemetryRecord;
            }
          }
        } catch {
          // Fallback to client-side mitigation below
        }
      }

      // Client-side autonomous mitigation (for GitHub Pages)
      const target =
        telemetryHistory.find(
          (r) => r.id === eventId || (facility && r.geo?.facility === facility)
        ) || telemetryHistory[0];
      if (!target) return null;

      const updatedTimeline = [
        ...(target.evidence?.timeline || []),
        {
          offset: "T+00s [SOC]",
          event: `Operator executed ${actionType} on ${target.geo?.facility || "Node"}. Entropy neutralized.`,
          severity: "NORMAL",
        },
      ];

      const mitigatedRecord: TelemetryRecord = {
        ...target,
        id: `MIT-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        source: "SOC_WU_WEI_CONTROLLER",
        headline: `[MITIGATED] ${target.geo?.city || "Sector"}: ${actionType} enforced on ${target.geo?.facility || "Node"}. Thermal load stabilized.`,
        metrics: {
          social_friction: 0.08,
          structural_inertia: 0.11,
          omega_index: 0.095,
        },
        threat_level: "GREEN",
        neutralized_action: `SOC OVERRIDE: ${actionType} CONFIRMED // NODE STABILIZED`,
        mitigated_by_soc: true,
        evidence: target.evidence
          ? {
              ...target.evidence,
              timeline: updatedTimeline,
            }
          : undefined,
      };

      omegaWindowRef.current = [...omegaWindowRef.current.slice(-7), 0.095, 0.095, 0.095];
      const nextState = computeThreatStateFromWindow(omegaWindowRef.current, mitigatedRecord);
      setSystemState(nextState);
      addTelemetryPoint(mitigatedRecord, nextState);
      return mitigatedRecord;
    },
    [addTelemetryPoint, telemetryHistory]
  );

  const clearLogs = useCallback(() => {
    setTelemetryHistory([]);
  }, []);

  return {
    connected,
    latencyMs,
    systemState,
    telemetryHistory,
    chartData,
    soundEnabled,
    setSoundEnabled,
    streamPaused,
    setStreamPaused,
    triggerSpike,
    injectCustomPayload,
    mitigateNode,
    clearLogs,
  };
}
