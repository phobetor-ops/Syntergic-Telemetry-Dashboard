"use client";

import React from "react";
import { SystemState } from "@/types/telemetry";
import { Server, Database, Cpu, Radio, Shield, Zap } from "lucide-react";

interface SystemMatrixStatsProps {
  systemState: SystemState;
  connected: boolean;
  totalRecords: number;
}

export const SystemMatrixStats: React.FC<SystemMatrixStatsProps> = ({
  systemState,
  connected,
  totalRecords,
}) => {
  const isRed = systemState.threat_level === "RED";
  const isYellow = systemState.threat_level === "YELLOW";

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
      {/* Celery Cluster */}
      <div className="p-3 rounded bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            WORKER ARCHITECTURE
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <div>
          <div className="text-slate-200 font-bold">2 ASYNC WORKERS</div>
          <div className="text-[10px] text-slate-500">SENSOR + LOGOS ENGINE</div>
        </div>
      </div>

      {/* Redis Broker */}
      <div className="p-3 rounded bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-amber-400" />
            MESSAGE BROKER
          </span>
          <span className="text-emerald-400 font-bold text-[10px]">REDIS 7</span>
        </div>
        <div>
          <div className="text-slate-200 font-bold truncate">PUB/SUB // CH-01</div>
          <div className="text-[10px] text-slate-500">
            TOTAL PACKETS: {systemState.total_injections_processed || totalRecords}
          </div>
        </div>
      </div>

      {/* Wu-Wei Mitigation */}
      <div className="p-3 rounded bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-400" />
            ZERO-TRUST POLICY
          </span>
          <span
            className={`font-bold text-[10px] ${
              isRed ? "text-rose-400 animate-pulse" : isYellow ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {isRed ? "ACTIVE QUARANTINE" : isYellow ? "RATE-LIMITED" : "STEADY PASS"}
          </span>
        </div>
        <div>
          <div className="text-slate-200 font-bold">
            {isRed ? "WU-WEI PROTOCOL" : isYellow ? "ADAPTIVE LIMITING" : "PASSIVE IDS"}
          </div>
          <div className="text-[10px] text-slate-500">ISOLATION SANDBOX ACTIVE</div>
        </div>
      </div>

      {/* Dispatcher WebSocket */}
      <div className="p-3 rounded bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" />
            ZERO TRUST DISPATCHER
          </span>
          <span className="text-cyan-400 font-bold text-[10px]">FASTAPI WS</span>
        </div>
        <div>
          <div className="text-slate-200 font-bold">
            {connected ? "LIVE TELEMETRY STREAM" : "OFFLINE BUFFER"}
          </div>
          <div className="text-[10px] text-slate-500">
            CLIENTS: {systemState.connected_clients || 1}
          </div>
        </div>
      </div>
    </div>
  );
};
