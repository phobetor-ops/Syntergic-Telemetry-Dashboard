"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SystemState, TelemetryRecord, ThreatLevel } from "@/types/telemetry";
import { analyzeRecordForDecision } from "@/utils/intelligenceFormatter";
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Volume2,
  VolumeX,
  AlertTriangle,
  Crosshair,
  Clock,
} from "lucide-react";

interface NetworkStatusHeaderProps {
  systemState: SystemState;
  telemetryList?: TelemetryRecord[];
  connected: boolean;
  latencyMs: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTriggerSpike?: () => void;
}

export const NetworkStatusHeader: React.FC<NetworkStatusHeaderProps> = ({
  systemState,
  telemetryList = [],
  connected,
  soundEnabled,
  onToggleSound,
}) => {
  const [argTime, setArgTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat("es-AR", {
          timeZone: "America/Argentina/Buenos_Aires",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
        setArgTime(`${formatted} ART`);
      } catch {
        setArgTime(new Date().toLocaleTimeString());
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    let criticalCount = 0;
    let zeroDayOrCvss9Count = 0;
    let elevatedCount = 0;

    for (const rec of telemetryList) {
      if (rec.mitigated_by_soc) continue;
      const info = analyzeRecordForDecision(rec);
      if (info.severityLabel === "CRÍTICO") {
        criticalCount++;
      } else if (info.severityLabel === "OBSERVACIÓN") {
        elevatedCount++;
      }
      if (info.isZeroDay || (info.cvssScore !== null && info.cvssScore >= 9.0)) {
        zeroDayOrCvss9Count++;
      }
    }
    return {
      criticalCount,
      zeroDayOrCvss9Count,
      elevatedCount,
      total: telemetryList.length,
    };
  }, [telemetryList]);

  const effectiveLevel: ThreatLevel =
    stats.zeroDayOrCvss9Count > 0 || stats.criticalCount >= 5
      ? "RED"
      : stats.criticalCount > 0 || stats.elevatedCount > 0
      ? "YELLOW"
      : systemState.threat_level;

  const statusStyles = {
    GREEN: {
      border: "border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.12)]",
      bg: "bg-gradient-to-r from-emerald-950/30 via-slate-950/90 to-slate-950/90",
      text: "text-emerald-400",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      icon: <ShieldCheck className="w-7 h-7 text-emerald-400" />,
      label: "PANORAMA ESTABLE",
      headline: "SIN INCIDENTES CRÍTICOS INMEDIATOS EN LOS 7 FRENTES",
    },
    YELLOW: {
      border: "border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.14)]",
      bg: "bg-gradient-to-r from-amber-950/35 via-slate-950/90 to-slate-950/90",
      text: "text-amber-400",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/50",
      icon: <AlertTriangle className="w-7 h-7 text-amber-400" />,
      label: "VIGILANCIA ACTIVA",
      headline: `${stats.criticalCount} EVENTOS CRÍTICOS Y ${stats.elevatedCount} EN OBSERVACIÓN A NIVEL GLOBAL`,
    },
    RED: {
      border: "border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.22)]",
      bg: "bg-gradient-to-r from-rose-950/45 via-slate-950/95 to-slate-950/90",
      text: "text-rose-400",
      badge: "bg-rose-500/30 text-rose-200 border-rose-500",
      icon: <ShieldAlert className="w-7 h-7 text-rose-400 animate-pulse" />,
      label: "PRIORIDAD ALTA",
      headline:
        stats.zeroDayOrCvss9Count > 0
          ? `ATENCIÓN: ${stats.zeroDayOrCvss9Count} ZERO-DAYS / CVSS ≥ 9.0 Y ${stats.criticalCount} INCIDENTES CRÍTICOS ACTIVOS`
          : `ATENCIÓN: ${stats.criticalCount} INCIDENTES CRÍTICOS ACTIVOS EN MONITOREO GLOBAL`,
    },
  }[effectiveLevel];

  return (
    <header className="w-full flex flex-col gap-2.5">
      {/* Top Cyberpunk Status Strip */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-cyan-950/80 pb-2 px-1 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold tracking-wider text-cyan-300">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>SYNTERGIC // CENTRO DE INTELIGENCIA Y MONITOREO GLOBAL</span>
          </div>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span className="hidden sm:inline text-slate-400 text-[11px]">
            15 FUENTES OFICIALES EN VIVO • 7 FRENTES ESTRATÉGICOS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-0.5 rounded">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-[11px] text-emerald-300 font-bold">
              {connected ? "DATOS EN VIVO ACTIVOS" : "SINCRONIZANDO..."}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-slate-300 bg-slate-900/80 border border-slate-800 px-2.5 py-0.5 rounded text-[11px]">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{argTime || "SINCRONIZANDO..."}</span>
          </div>

          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Silenciar alertas sonoras" : "Activar alertas sonoras"}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded border border-slate-800 bg-slate-900/80 hover:border-cyan-500/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] text-cyan-300 font-bold">SONIDO ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-500">SONIDO OFF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Executive Banner */}
      <div
        className={`w-full rounded-xl border p-4 md:p-5 transition-all duration-300 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${statusStyles.border} ${statusStyles.bg}`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-center shrink-0">
            {statusStyles.icon}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-mono font-bold flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" />
                PANORAMA DE DECISIONES EN TIEMPO REAL
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${statusStyles.badge}`}
              >
                {statusStyles.label}
              </span>
            </div>

            <h1
              className={`text-base sm:text-xl md:text-2xl font-extrabold font-mono tracking-tight mt-1 ${statusStyles.text}`}
            >
              {statusStyles.headline}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecciona cualquier frente estratégico o evento en el mapa para ver qué ocurrió, qué activos afecta y la recomendación operativa.
            </p>
          </div>
        </div>

        {/* Actionable Executive Counters */}
        <div className="grid grid-cols-3 gap-2.5 w-full lg:w-auto shrink-0 font-mono">
          <div className="px-3.5 py-2 rounded-lg bg-slate-950/90 border border-rose-500/40 flex flex-col items-center lg:items-end justify-center">
            <span className="text-[10px] uppercase text-rose-300/90 tracking-wider font-bold">
              ZERO-DAYS / CVSS ≥ 9
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-rose-400">
              {stats.zeroDayOrCvss9Count}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-slate-950/90 border border-amber-500/40 flex flex-col items-center lg:items-end justify-center">
            <span className="text-[10px] uppercase text-amber-300/90 tracking-wider font-bold">
              CRÍTICOS ACTIVOS
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-400">
              {stats.criticalCount}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-lg bg-slate-950/90 border border-cyan-500/40 flex flex-col items-center lg:items-end justify-center">
            <span className="text-[10px] uppercase text-cyan-300/90 tracking-wider font-bold">
              EVENTOS EN VIVO
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-cyan-300">
              {stats.total}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
