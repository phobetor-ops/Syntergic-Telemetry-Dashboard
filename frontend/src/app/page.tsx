"use client";

import React, { useState } from "react";
import { useSyntergicSocket } from "@/hooks/useSyntergicSocket";
import { NetworkStatusHeader } from "@/components/NetworkStatusHeader";
import { TelemetryGraphs } from "@/components/TelemetryGraphs";
import { GlobalThreatMap } from "@/components/GlobalThreatMap";
import { MitigatedInjectionsLog } from "@/components/MitigatedInjectionsLog";
import { ManualInjectionPanel } from "@/components/ManualInjectionPanel";
import { SystemMatrixStats } from "@/components/SystemMatrixStats";
import { ForensicEvidenceModal } from "@/components/ForensicEvidenceModal";
import { TelemetryRecord } from "@/types/telemetry";
import { Globe, Activity, Columns, Shield, Zap, Pause, Play } from "lucide-react";

export default function SyntergicDashboard() {
  const {
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
  } = useSyntergicSocket();

  const [activeTab, setActiveTab] = useState<"SPLIT" | "MAP" | "GRAPHS">("SPLIT");
  const [selectedEvent, setSelectedEvent] = useState<TelemetryRecord | null>(null);
  const [modalEvent, setModalEvent] = useState<TelemetryRecord | null>(null);

  const isRed = systemState.threat_level === "RED";
  const isYellow = systemState.threat_level === "YELLOW";

  const handleLogClick = (event: TelemetryRecord) => {
    setSelectedEvent(event);
    setModalEvent(event);
  };

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-500 p-3 sm:p-5 md:p-7 flex flex-col gap-5 ${
        isRed
          ? "bg-[#0b0307] shadow-[inset_0_0_140px_rgba(244,63,94,0.14)]"
          : isYellow
          ? "bg-[#080702] shadow-[inset_0_0_100px_rgba(245,158,11,0.06)]"
          : "bg-slate-950"
      }`}
    >
      {/* Dynamic Red Alert Warning Banner Bar if RED */}
      {isRed && (
        <div className="w-full bg-rose-600 text-black py-2 px-4 rounded-xl text-center text-xs font-mono font-extrabold uppercase tracking-widest animate-pulse flex items-center justify-center gap-2 shadow-lg shadow-rose-900/50">
          <Zap className="w-4 h-4 fill-black" />
          ALERTA PRIORITARIA: DETECTADOS ZERO-DAYS / INCIDENTES CRÍTICOS EN CURSO — REVISAR MEDIDAS CORRECTIVAS
          <Zap className="w-4 h-4 fill-black" />
        </div>
      )}

      {/* COMPONENT 1: NETWORK STATUS HEADER (Decision-driven) */}
      <NetworkStatusHeader
        systemState={systemState}
        telemetryList={telemetryHistory}
        connected={connected}
        latencyMs={latencyMs}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onTriggerSpike={triggerSpike}
      />

      {/* SYSTEM MATRIX STATS (4 Strategic Domain Summaries) */}
      <SystemMatrixStats
        systemState={systemState}
        connected={connected}
        totalRecords={telemetryHistory.length}
        telemetryList={telemetryHistory}
      />

      {/* VIEW SWITCHER TABS & STREAM PAUSE CONTROL */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setActiveTab("SPLIT")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "SPLIT"
                ? "bg-cyan-950 border border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-950/50"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>CENTRO DE COMANDO (MAPA + DECISIÓN)</span>
          </button>

          <button
            onClick={() => setActiveTab("MAP")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "MAP"
                ? "bg-cyan-950 border border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-950/50"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>CARTOGRAFÍA GLOBAL DE AMENAZAS</span>
          </button>

          <button
            onClick={() => setActiveTab("GRAPHS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "GRAPHS"
                ? "bg-cyan-950 border border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-950/50"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>TENDENCIAS &amp; MONITOREO TEMPORAL</span>
          </button>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setStreamPaused(!streamPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${
              streamPaused
                ? "bg-amber-950/80 border-amber-500 text-amber-300"
                : "bg-slate-900 border-slate-700 text-emerald-400 hover:border-emerald-500"
            }`}
          >
            {streamPaused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>STREAM EN PAUSA (CLIC PARA REANUDAR)</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>STREAM EN VIVO ACTIVO</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* DYNAMIC VIEW CONTAINER */}
      {activeTab === "SPLIT" && (
        <div className="flex flex-col gap-5">
          {/* Top: Global Map + Integrated Decision Dossier */}
          <GlobalThreatMap
            telemetryList={telemetryHistory}
            selectedEvent={selectedEvent}
            onSelectEvent={(event) => setSelectedEvent(event)}
            onOpenFullModal={(event) => setModalEvent(event)}
            onMitigateNode={mitigateNode}
          />

          {/* Bottom Grid: Graphs + Mitigated Injections Terminal */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-7 w-full">
              <TelemetryGraphs
                data={chartData}
                telemetryList={telemetryHistory}
                currentOmega={systemState.current_omega}
                movingAvg={systemState.moving_avg_omega}
                socialFriction={systemState.social_friction}
                structuralInertia={systemState.structural_inertia}
              />
            </div>

            <div className="xl:col-span-5 w-full">
              <MitigatedInjectionsLog
                logs={telemetryHistory}
                onClear={clearLogs}
                onSelectEvent={handleLogClick}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "MAP" && (
        <div className="flex flex-col gap-5">
          <GlobalThreatMap
            telemetryList={telemetryHistory}
            selectedEvent={selectedEvent}
            onSelectEvent={(event) => setSelectedEvent(event)}
            onOpenFullModal={(event) => setModalEvent(event)}
            onMitigateNode={mitigateNode}
          />
          <MitigatedInjectionsLog
            logs={telemetryHistory}
            onClear={clearLogs}
            onSelectEvent={handleLogClick}
          />
        </div>
      )}

      {activeTab === "GRAPHS" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-7 w-full">
            <TelemetryGraphs
              data={chartData}
              telemetryList={telemetryHistory}
              currentOmega={systemState.current_omega}
              movingAvg={systemState.moving_avg_omega}
              socialFriction={systemState.social_friction}
              structuralInertia={systemState.structural_inertia}
            />
          </div>

          <div className="xl:col-span-5 w-full">
            <MitigatedInjectionsLog
              logs={telemetryHistory}
              onClear={clearLogs}
              onSelectEvent={handleLogClick}
            />
          </div>
        </div>
      )}

      {/* MANUAL INJECTION / OSINT SIMULATOR PANEL */}
      <ManualInjectionPanel
        onInject={injectCustomPayload}
        onTriggerSpike={triggerSpike}
      />

      {/* FULL-SCREEN FORENSIC EVIDENCE MODAL */}
      <ForensicEvidenceModal
        event={modalEvent}
        onClose={() => setModalEvent(null)}
        onMitigateNode={mitigateNode}
        onUpdateEvent={(updated) => {
          setSelectedEvent(updated);
          setModalEvent(updated);
        }}
      />

      {/* SOC FOOTER */}
      <footer className="w-full border-t border-slate-900 pt-3 pb-6 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">
              SYNTERGIC DECISION INTELLIGENCE v2.5 (NATURAL EARTH WGS-84 &amp; ZERO-TRUST OSINT)
            </span>
          </div>
          <span>•</span>
          <span>7 FRENTES ESTRATÉGICOS // 15 FUENTES OFICIALES</span>
        </div>

        <div className="flex items-center gap-4">
          <span>CARTOGRAFÍA: D3-GEO NATURAL EARTH 110M</span>
          <span>•</span>
          <span>ESTADO: VIGILANCIA ACTIVA</span>
        </div>
      </footer>
    </div>
  );
}
