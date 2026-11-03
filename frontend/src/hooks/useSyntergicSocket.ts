"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SystemState, TelemetryRecord, WebSocketMessage, ThreatLevel } from "@/types/telemetry";

const DEFAULT_STATE: SystemState = {
  threat_level: "GREEN",
  current_omega: 0.18,
  moving_avg_omega: 0.22,
  social_friction: 0.15,
  structural_inertia: 0.19,
  mitigation_directive: "STATUS: GREEN | STABLE SYNTERGIA | NORMAL I/O",
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

export function useSyntergicSocket() {
  const [connected, setConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [systemState, setSystemState] = useState<SystemState>(DEFAULT_STATE);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryRecord[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [streamPaused, setStreamPaused] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // Web Audio Synth for SOC Alerts
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
      // Audio context might be restricted before user gesture
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

    setChartData((prev) => {
      const updated = [...prev, newPoint];
      return updated.slice(-45);
    });

    setTelemetryHistory((prev) => {
      if (prev.some((p) => p.id === record.id)) return prev;
      return [record, ...prev].slice(0, 160);
    });
  }, []);

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined") return;

    const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;
    let wsUrl = envWsUrl;
    if (!wsUrl) {
      const host = window.location.hostname || "localhost";
      wsUrl = `ws://${host}:8000/ws/telemetry`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
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
        setConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 2500);
      };

      ws.onerror = () => {
        setConnected(false);
        ws.close();
      };
    } catch {
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 2500);
    }
  }, [addTelemetryPoint, playAlertSound]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [connectWebSocket]);

  const injectCustomPayload = useCallback(
    async (headline: string, forceSpike: boolean = false, city?: string) => {
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
        return await res.json();
      } catch {
        return null;
      }
    },
    []
  );

  const triggerSpike = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: "TRIGGER_SPIKE" }));
    } else {
      injectCustomPayload(
        "CLIENT INDUCED RED ALERT: Extreme syntergic anomaly detected in core backbone.",
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
        if (!res.ok) return null;
        const data = await res.json();
        if (data.record && data.system_state) {
          setSystemState(data.system_state);
          addTelemetryPoint(data.record, data.system_state);
          return data.record as TelemetryRecord;
        }
        return null;
      } catch {
        return null;
      }
    },
    [addTelemetryPoint]
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
