"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { ChartDataPoint } from "@/hooks/useSyntergicSocket";
import { TelemetryRecord } from "@/types/telemetry";
import { analyzeRecordForDecision } from "@/utils/intelligenceFormatter";
import { Activity, ShieldAlert, Cloud, Flame, AlertCircle } from "lucide-react";

interface TelemetryGraphsProps {
  data: ChartDataPoint[];
  currentOmega?: number;
  movingAvg?: number;
  socialFriction?: number;
  structuralInertia?: number;
  telemetryList?: TelemetryRecord[];
}

// Custom dark Cyberpunk SOC tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-cyan-800/80 p-3 rounded-lg shadow-2xl font-mono text-xs backdrop-blur-md">
        <div className="text-slate-400 border-b border-slate-800 pb-1 mb-2 font-bold flex justify-between gap-4">
          <span>HORA: {label}</span>
          <span className="text-cyan-400 font-bold">REGISTRO DE AMENAZA</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-300 font-semibold">{entry.name}:</span>
              </div>
              <span className="font-bold text-slate-100">
                {(Number(entry.value) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const TelemetryGraphs: React.FC<TelemetryGraphsProps> = ({
  data,
  telemetryList = [],
}) => {
  const [activeRange, setActiveRange] = useState<number>(30);

  const displayData = data.slice(-activeRange);

  // Operational metrics computed from active telemetry
  const operationalStats = useMemo(() => {
    let zeroDays = 0;
    let cloudOutages = 0;
    let seismicAlerts = 0;
    let criticals = 0;

    for (const rec of telemetryList) {
      if (rec.mitigated_by_soc) continue;
      const intel = analyzeRecordForDecision(rec);
      if (intel.isZeroDay || (intel.cvssScore !== null && intel.cvssScore >= 9.0)) {
        zeroDays++;
      }
      if (rec.evidence?.strategic_front === "INFRASTRUCTURE_CLOUD") {
        cloudOutages++;
      }
      if (
        rec.evidence?.strategic_front === "GEOPHYSICAL_CLIMATE" &&
        (intel.severityLabel === "CRÍTICO" || rec.headline.includes("M6."))
      ) {
        seismicAlerts++;
      }
      if (intel.severityLabel === "CRÍTICO") {
        criticals++;
      }
    }

    return {
      zeroDays,
      cloudOutages,
      seismicAlerts,
      criticals,
      totalActive: telemetryList.filter((r) => !r.mitigated_by_soc).length,
    };
  }, [telemetryList]);

  return (
    <div className="w-full flex flex-col gap-4 bg-slate-950/85 border border-slate-800 rounded-xl p-4 md:p-5 backdrop-blur-sm shadow-xl font-mono text-xs">
      {/* Header with Title and Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-100 tracking-wider uppercase">
              TENDENCIA DE AMENAZAS &amp; MONITOREO TEMPORAL
            </h2>
            <p className="text-[10px] text-slate-400">
              Evolución en tiempo real de severidad de incidentes globales por ventana de observación
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">VENTANA:</span>
          {[15, 30, 45].map((points) => (
            <button
              key={points}
              onClick={() => setActiveRange(points)}
              className={`px-2.5 py-1 rounded-md border text-xs transition-colors cursor-pointer ${
                activeRange === points
                  ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              ÚLTIMOS {points}
            </button>
          ))}
        </div>
      </div>

      {/* Operational Decision KPI Cards (Replacing abstract formulas) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Zero-Days / CVSS >= 9 */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-rose-500/35 flex flex-col justify-between gap-1 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-rose-300">
            <span className="flex items-center gap-1 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              0-DAYS / CVSS ≥ 9
            </span>
            <span className="text-rose-400 font-extrabold text-[10px]">PRIORIDAD ALTA</span>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 tracking-tight">
            {operationalStats.zeroDays}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Explotación activa / CISA KEV
          </div>
        </div>

        {/* Cloud & Backbone Issues */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-cyan-500/35 flex flex-col justify-between gap-1 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-cyan-300">
            <span className="flex items-center gap-1 font-bold">
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              INFRAESTRUCTURA
            </span>
            <span className="text-cyan-400 font-extrabold text-[10px]">RED &amp; BGP</span>
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 tracking-tight">
            {operationalStats.cloudOutages}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Cloudflare &amp; GitHub Status
          </div>
        </div>

        {/* Major Natural / Planetary Hazards */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-emerald-500/35 flex flex-col justify-between gap-1 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-emerald-300">
            <span className="flex items-center gap-1 font-bold">
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              SISMOS &amp; CLIMA ONU
            </span>
            <span className="text-emerald-400 font-extrabold text-[10px]">GEOFÍSICO</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 tracking-tight">
            {operationalStats.seismicAlerts}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            USGS ≥ M5.0 y GDACS Roja
          </div>
        </div>

        {/* Total Critical Incidents Active */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-amber-500/35 flex flex-col justify-between gap-1 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-amber-300">
            <span className="flex items-center gap-1 font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              INCIDENTES CRÍTICOS
            </span>
            <span className="text-amber-400 font-extrabold text-[10px]">TOTAL ACTIVO</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 tracking-tight">
            {operationalStats.criticals}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            De {operationalStats.totalActive} eventos en seguimiento
          </div>
        </div>
      </div>

      {/* Main Recharts Telemetry Graph */}
      <div className="h-[280px] sm:h-[320px] md:h-[350px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              dy={5}
            />
            <YAxis
              domain={[0, 1.0]}
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              ticks={[0, 0.2, 0.4, 0.6, 0.7, 0.8, 1.0]}
              tickFormatter={(val) => `${Math.round(val * 100)}%`}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontFamily: "monospace",
                fontSize: "11px",
                paddingTop: "12px",
              }}
            />

            {/* Threshold Reference Lines */}
            <ReferenceLine
              y={0.4}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{
                value: "NIVEL BASE / OBSERVACIÓN (40%)",
                fill: "#10b981",
                position: "insideTopLeft",
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />
            <ReferenceLine
              y={0.7}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              label={{
                value: "UMBRAL DE ACCIÓN INMEDIATA (70%)",
                fill: "#f43f5e",
                position: "insideTopLeft",
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />

            {/* Lines */}
            <Line
              type="monotone"
              name="Severidad de Amenaza Inmediata"
              dataKey="omega_index"
              stroke="#f43f5e"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#f43f5e" }}
              activeDot={{ r: 6, fill: "#f43f5e" }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              name="Actividad en Ciberdefensa"
              dataKey="social_friction"
              stroke="#06b6d4"
              strokeWidth={1.8}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              name="Infraestructura & Frentes Globales"
              dataKey="structural_inertia"
              stroke="#f59e0b"
              strokeWidth={1.8}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              name="Promedio Móvil Ponderado"
              dataKey="moving_avg"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-900 pt-2 font-mono">
        <span>ESCALA DE SEVERIDAD: [0% NORMAL — 100% IMPACTO CRÍTICO]</span>
        <span>REGISTRO SINCRONIZADO CON LAS 15 FUENTES OFICIALES</span>
      </div>
    </div>
  );
};
