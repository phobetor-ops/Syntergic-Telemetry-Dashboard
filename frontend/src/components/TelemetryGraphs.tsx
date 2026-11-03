"use client";

import React, { useState } from "react";
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
import { Activity, Flame, ShieldAlert, Cpu } from "lucide-react";

interface TelemetryGraphsProps {
  data: ChartDataPoint[];
  currentOmega: number;
  movingAvg: number;
  socialFriction: number;
  structuralInertia: number;
}

// Custom dark SOC tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded shadow-2xl font-mono text-xs backdrop-blur-md">
        <div className="text-slate-400 border-b border-slate-800 pb-1 mb-2 font-bold flex justify-between gap-4">
          <span>TIME: {label}</span>
          <span className="text-cyan-400">TELEMETRY FRAME</span>
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
              <span className="font-bold text-slate-100">{Number(entry.value).toFixed(3)}</span>
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
  currentOmega,
  movingAvg,
  socialFriction,
  structuralInertia,
}) => {
  const [activeRange, setActiveRange] = useState<number>(30);

  const displayData = data.slice(-activeRange);

  return (
    <div className="w-full flex flex-col gap-4 bg-slate-950/80 border border-slate-800/90 rounded-lg p-4 md:p-5 backdrop-blur-sm shadow-xl">
      {/* Header with Title and Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 font-mono">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-sm md:text-base font-bold text-slate-200 tracking-wider uppercase">
            SYNTERGIC ENTROPY TIME-SERIES [Ω]
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">WINDOW:</span>
          {[15, 30, 45].map((points) => (
            <button
              key={points}
              onClick={() => setActiveRange(points)}
              className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                activeRange === points
                  ? "bg-cyan-950/70 border-cyan-500 text-cyan-300 font-bold"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              LAST {points}
            </button>
          ))}
        </div>
      </div>

      {/* Instantaneous KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* Omega Instant */}
        <div className="p-3 rounded bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              OMEGA INDEX (Ω)
            </span>
            <span className="text-rose-400 font-bold text-[10px]">THERMAL LOAD</span>
          </div>
          <div className="text-xl font-extrabold text-rose-400 tracking-tight">
            {currentOmega.toFixed(3)}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, currentOmega * 100)}%` }}
            />
          </div>
        </div>

        {/* Moving Average */}
        <div className="p-3 rounded bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              10-PTS MOVING AVG
            </span>
            <span className="text-purple-400 font-bold text-[10px]">SMOOTHED</span>
          </div>
          <div className="text-xl font-extrabold text-purple-400 tracking-tight">
            {movingAvg.toFixed(3)}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div
              className="bg-purple-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, movingAvg * 100)}%` }}
            />
          </div>
        </div>

        {/* Social Friction */}
        <div className="p-3 rounded bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              SOCIAL FRICTION
            </span>
            <span className="text-cyan-400 font-bold text-[10px]">HOSTILITY/PANIC</span>
          </div>
          <div className="text-xl font-extrabold text-cyan-400 tracking-tight">
            {socialFriction.toFixed(3)}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, socialFriction * 100)}%` }}
            />
          </div>
        </div>

        {/* Structural Inertia */}
        <div className="p-3 rounded bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              STRUCTURAL INERTIA
            </span>
            <span className="text-amber-400 font-bold text-[10px]">SYSTEM DECAY</span>
          </div>
          <div className="text-xl font-extrabold text-amber-400 tracking-tight">
            {structuralInertia.toFixed(3)}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, structuralInertia * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Recharts Telemetry Graph */}
      <div className="h-[280px] sm:h-[320px] md:h-[360px] w-full pt-2">
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
                value: "GREEN THRESHOLD (0.40)",
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
                value: "RED ALERT THRESHOLD (0.70)",
                fill: "#f43f5e",
                position: "insideTopLeft",
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />

            {/* Lines */}
            <Line
              type="monotone"
              name="Omega Index (Ω)"
              dataKey="omega_index"
              stroke="#f43f5e"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#f43f5e" }}
              activeDot={{ r: 6, fill: "#f43f5e" }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              name="Social Friction"
              dataKey="social_friction"
              stroke="#06b6d4"
              strokeWidth={1.8}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              name="Structural Inertia"
              dataKey="structural_inertia"
              stroke="#f59e0b"
              strokeWidth={1.8}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              name="Moving Avg (10-pts)"
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
        <span>THERMAL RANGE: [0.000 MIN - 1.000 MAX]</span>
        <span>ENTROPY ALGORITHM: LOGOS-NLP-THERMAL-HYBRID V2.4</span>
      </div>
    </div>
  );
};
