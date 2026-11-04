"use client";

import React, { useMemo } from "react";
import { SystemState, TelemetryRecord } from "@/types/telemetry";
import { analyzeRecordForDecision } from "@/utils/intelligenceFormatter";
import { ShieldAlert, Cloud, Flame, Globe } from "lucide-react";

interface SystemMatrixStatsProps {
  systemState: SystemState;
  connected: boolean;
  totalRecords: number;
  telemetryList?: TelemetryRecord[];
}

export const SystemMatrixStats: React.FC<SystemMatrixStatsProps> = ({
  telemetryList = [],
}) => {
  const domainSummary = useMemo(() => {
    const cyber = { total: 0, crit: 0, zeroDays: 0 };
    const cloud = { total: 0, crit: 0 };
    const earth = { total: 0, crit: 0 };
    const geoMacro = { total: 0, crit: 0 };

    for (const rec of telemetryList) {
      if (rec.mitigated_by_soc) continue;
      const front = rec.evidence?.strategic_front || "CYBER_WARFARE";
      const info = analyzeRecordForDecision(rec);
      const isCrit = info.severityLabel === "CRÍTICO";

      if (front === "CYBER_WARFARE") {
        cyber.total++;
        if (isCrit) cyber.crit++;
        if (info.isZeroDay || (info.cvssScore !== null && info.cvssScore >= 9.0)) {
          cyber.zeroDays++;
        }
      } else if (front === "INFRASTRUCTURE_CLOUD") {
        cloud.total++;
        if (isCrit) cloud.crit++;
      } else if (front === "GEOPHYSICAL_CLIMATE" || front === "SPACE_WEATHER_GRID") {
        earth.total++;
        if (isCrit) earth.crit++;
      } else {
        geoMacro.total++;
        if (isCrit) geoMacro.crit++;
      }
    }

    return { cyber, cloud, earth, geoMacro };
  }, [telemetryList]);

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
      {/* Card 1: Cyber Defense & Zero-Days */}
      <div className="p-3.5 rounded-xl bg-slate-950/85 border border-rose-500/35 hover:border-rose-500/70 transition-all shadow-[0_0_20px_rgba(244,63,94,0.07)] flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px] uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            CIBERDEFENSA &amp; 0-DAYS
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              domainSummary.cyber.crit > 0
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {domainSummary.cyber.crit} CRÍTICOS
          </span>
        </div>
        <div>
          <div className="text-slate-100 font-extrabold text-sm">
            {domainSummary.cyber.zeroDays} Zero-Days / CVEs Prioritarios
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {domainSummary.cyber.total} alertas en CISA KEV, Ransomware &amp; Botnets C2
          </div>
        </div>
      </div>

      {/* Card 2: Cloud & Backbone Infrastructure */}
      <div className="p-3.5 rounded-xl bg-slate-950/85 border border-cyan-500/35 hover:border-cyan-500/70 transition-all shadow-[0_0_20px_rgba(6,182,212,0.07)] flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px] uppercase tracking-wider">
            <Cloud className="w-4 h-4 text-cyan-400" />
            INFRAESTRUCTURA CLOUD
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              domainSummary.cloud.crit > 0
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
            }`}
          >
            {domainSummary.cloud.crit > 0
              ? `${domainSummary.cloud.crit} CAÍDA MAYOR`
              : "OPERATIVO"}
          </span>
        </div>
        <div>
          <div className="text-slate-100 font-extrabold text-sm">
            {domainSummary.cloud.total} Incidentes / Avisos de Red
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Monitoreo en vivo de Cloudflare Edge &amp; GitHub Cloud
          </div>
        </div>
      </div>

      {/* Card 3: Seismic, Climate & Space Weather */}
      <div className="p-3.5 rounded-xl bg-slate-950/85 border border-emerald-500/35 hover:border-emerald-500/70 transition-all shadow-[0_0_20px_rgba(16,185,129,0.07)] flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px] uppercase tracking-wider">
            <Flame className="w-4 h-4 text-emerald-400" />
            SISMOS, CLIMA &amp; ESPACIO
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              domainSummary.earth.crit > 0
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {domainSummary.earth.crit} SEVEROS
          </span>
        </div>
        <div>
          <div className="text-slate-100 font-extrabold text-sm">
            {domainSummary.earth.total} Eventos Geofísicos y Solares
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            USGS Sismología, Desastres ONU (GDACS), NASA &amp; NOAA
          </div>
        </div>
      </div>

      {/* Card 4: Geopolitics, Financial Macro & WHO Health */}
      <div className="p-3.5 rounded-xl bg-slate-950/85 border border-amber-500/35 hover:border-amber-500/70 transition-all shadow-[0_0_20px_rgba(245,158,11,0.07)] flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px] uppercase tracking-wider">
            <Globe className="w-4 h-4 text-amber-400" />
            GEOPOLÍTICA, MACRO &amp; OMS
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              domainSummary.geoMacro.crit > 0
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
          >
            {domainSummary.geoMacro.crit} PRIORITARIOS
          </span>
        </div>
        <div>
          <div className="text-slate-100 font-extrabold text-sm">
            {domainSummary.geoMacro.total} Alertas Globales Activas
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            BBC, Al Jazeera, Naciones Unidas, CNBC Mercados &amp; OMS
          </div>
        </div>
      </div>
    </div>
  );
};
