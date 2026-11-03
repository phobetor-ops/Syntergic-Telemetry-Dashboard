"use client";

import React, { useState, useEffect } from "react";
import { SystemState, ThreatLevel } from "@/types/telemetry";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Shield, 
  Radio, 
  Volume2, 
  VolumeX, 
  AlertTriangle,
  Zap
} from "lucide-react";

interface NetworkStatusHeaderProps {
  systemState: SystemState;
  connected: boolean;
  latencyMs: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTriggerSpike: () => void;
}

export const NetworkStatusHeader: React.FC<NetworkStatusHeaderProps> = ({
  systemState,
  connected,
  latencyMs,
  soundEnabled,
  onToggleSound,
  onTriggerSpike,
}) => {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const level: ThreatLevel = systemState.threat_level;

  // Visual style config according to threat level
  const statusStyles = {
    GREEN: {
      border: "border-emerald-500/50 border-glow-green",
      bg: "bg-emerald-950/20",
      text: "text-emerald-400 glow-green",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      icon: <ShieldCheck className="w-8 h-8 text-emerald-400 animate-pulse" />,
      tag: "NOMINAL I/O",
      pulseColor: "bg-emerald-500",
      accentBg: "bg-emerald-500/10",
    },
    YELLOW: {
      border: "border-amber-500/60 border-glow-yellow",
      bg: "bg-amber-950/30",
      text: "text-amber-400 glow-yellow",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/50",
      icon: <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />,
      tag: "RATE-LIMITING",
      pulseColor: "bg-amber-500",
      accentBg: "bg-amber-500/10",
    },
    RED: {
      border: "border-rose-500 border-glow-red animate-pulse-fast",
      bg: "bg-rose-950/40",
      text: "text-rose-400 glow-red animate-pulse",
      badge: "bg-rose-500/30 text-rose-200 border-rose-500 animate-strobe",
      icon: <ShieldAlert className="w-8 h-8 text-rose-400 animate-strobe" />,
      tag: "WU-WEI PROTOCOL ENGAGED",
      pulseColor: "bg-rose-500",
      accentBg: "bg-rose-500/20",
    },
  }[level];

  return (
    <header className="w-full flex flex-col gap-3">
      {/* Top telemetry bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2 px-1 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-widest text-slate-200">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>SYNTERGIC IDS // EARLY WARNING SYSTEM</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 tracking-wider">NODE: OMEGA-DISPATCHER-01</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-emerald-400 animate-ping" : "bg-rose-500"
              }`}
            />
            <span className={connected ? "text-emerald-400" : "text-rose-400"}>
              {connected ? `WS: CONNECTED (${latencyMs}ms)` : "WS: RECONNECTING..."}
            </span>
          </div>

          <span className="text-slate-600">|</span>
          <span className="text-slate-300">{currentTime || "SYNCING..."}</span>

          <span className="text-slate-600">|</span>
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Mute SOC Audio" : "Enable SOC Audio Synth"}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] text-cyan-400 font-bold">AUDIO ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-500">AUDIO OFF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Massive Dynamic Threat Level Indicator Banner */}
      <div
        className={`w-full rounded-lg border-2 p-4 md:p-6 transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-4 ${statusStyles.border} ${statusStyles.bg}`}
      >
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-3 rounded-md bg-black/60 border border-slate-800 flex items-center justify-center shrink-0">
            {statusStyles.icon}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                SYSTEM INTRUSION & ENTROPY TELEMETRY
              </span>
              <span
                className={`px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded border ${statusStyles.badge}`}
              >
                LEVEL: {level}
              </span>
            </div>

            <h1
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold font-mono tracking-tight mt-1 ${statusStyles.text}`}
            >
              {systemState.mitigation_directive}
            </h1>
          </div>
        </div>

        {/* Quick Actions & Moving Average Pill */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex flex-col items-end px-4 py-2 rounded bg-black/50 border border-slate-800 text-right">
            <span className="text-[10px] uppercase text-slate-400 tracking-wider">
              MOVING AVG ENTROPY (Ω)
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold font-mono ${statusStyles.text}`}>
                {systemState.moving_avg_omega.toFixed(3)}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ 1.000</span>
            </div>
          </div>

          <button
            onClick={onTriggerSpike}
            className="flex items-center gap-1.5 px-3 py-3 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/70 hover:border-rose-400 text-rose-200 text-xs font-mono font-bold tracking-wider transition-all shadow-lg hover:shadow-rose-900/50 active:scale-95"
            title="Inject an intentional entropy spike to test RED ALERT protocol"
          >
            <Zap className="w-4 h-4 text-rose-400 animate-bounce" />
            <span className="hidden sm:inline">FORCE SPIKE</span>
          </button>
        </div>
      </div>
    </header>
  );
};
