"use client";

import React, { useState, useRef, useEffect } from "react";
import { TelemetryRecord } from "@/types/telemetry";
import { analyzeRecordForDecision, FRONT_META } from "@/utils/intelligenceFormatter";
import {
  Terminal,
  Pause,
  Play,
  Trash2,
  Search,
  Filter,
  MapPin,
  Eye,
  ShieldAlert,
  Layers,
  ChevronRight,
} from "lucide-react";

interface MitigatedInjectionsLogProps {
  logs: TelemetryRecord[];
  onClear: () => void;
  onSelectEvent?: (event: TelemetryRecord) => void;
}

export const MitigatedInjectionsLog: React.FC<MitigatedInjectionsLogProps> = ({
  logs,
  onClear,
  onSelectEvent,
}) => {
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const intel = analyzeRecordForDecision(log);
    const searchTarget = `${intel.cleanTitle} ${intel.summary} ${intel.sourceLabel} ${intel.affectedAsset} ${intel.locationLabel}`.toLowerCase();
    const matchesSearch =
      searchTerm === "" || searchTarget.includes(searchTerm.toLowerCase());

    let matchesSeverity = true;
    if (filterSeverity === "ZERODAY") {
      matchesSeverity =
        intel.isZeroDay || (intel.cvssScore !== null && intel.cvssScore >= 9.0);
    } else if (filterSeverity === "RED") {
      matchesSeverity = intel.severityLabel === "CRÍTICO";
    } else if (filterSeverity === "YELLOW") {
      matchesSeverity = intel.severityLabel === "OBSERVACIÓN";
    } else if (filterSeverity === "GREEN") {
      matchesSeverity = intel.severityLabel === "INFORMATIVO";
    }

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="w-full flex flex-col bg-slate-950/95 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-100 tracking-wide text-xs">
            BITÁCORA OPERATIVA DE INCIDENTES // AUDIT LOG
          </span>
          <span className="text-[10px] text-slate-400">
            ({logs.length} REGISTROS ACTIVOS)
          </span>
        </div>

        {/* Filter & Terminal Controls */}
        <div className="flex items-center gap-2">
          {/* Severity selector */}
          <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md border border-slate-800">
            <Filter className="w-3 h-3 text-cyan-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-transparent text-slate-200 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="ALL">TODAS LAS SEVERIDADES</option>
              <option value="ZERODAY">0-DAYS &amp; CVSS ≥ 9</option>
              <option value="RED">CRÍTICOS</option>
              <option value="YELLOW">EN OBSERVACIÓN</option>
              <option value="GREEN">INFORMATIVOS</option>
            </select>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-md border border-slate-800">
            <Search className="w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por software, CVE o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none w-36 sm:w-48 text-[11px]"
            />
          </div>

          {/* Tail auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-colors ${
              autoScroll
                ? "bg-cyan-950/80 border-cyan-500/70 text-cyan-200"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
            title={autoScroll ? "Pausar auto-scroll" : "Reanudar auto-scroll"}
          >
            {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="text-[10px] hidden sm:inline">
              {autoScroll ? "AUTO-SCROLL ON" : "PAUSADO"}
            </span>
          </button>

          {/* Clear button */}
          <button
            onClick={onClear}
            className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Limpiar buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Incident Stream Console */}
      <div
        ref={scrollRef}
        className="max-h-[460px] min-h-[300px] overflow-y-auto p-3 space-y-2 bg-black/80 divide-y divide-slate-900"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-14 text-slate-500 italic">
            [SYS_STREAM] No hay incidentes en la bitácora que coincidan con el filtro actual.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const dateObj = new Date(log.timestamp);
            const timeStr = isNaN(dateObj.getTime())
              ? "00:00:00"
              : dateObj.toLocaleTimeString("es-AR", { hour12: false });

            const intel = analyzeRecordForDecision(log);
            const isCrit = intel.severityLabel === "CRÍTICO";
            const isObs = intel.severityLabel === "OBSERVACIÓN";
            const frontMeta = FRONT_META[log.evidence?.strategic_front || "CYBER_WARFARE"];

            return (
              <div
                key={log.id}
                onClick={() => onSelectEvent && onSelectEvent(log)}
                className={`pt-2.5 pb-2.5 px-3 rounded-lg transition-all cursor-pointer group ${
                  isCrit
                    ? "bg-rose-950/20 hover:bg-rose-950/45 border-l-3 border-rose-500"
                    : isObs
                    ? "bg-amber-950/15 hover:bg-amber-950/35 border-l-3 border-amber-500"
                    : "hover:bg-slate-900/60 border-l-3 border-slate-800"
                }`}
              >
                {/* Meta line */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">[{timeStr}]</span>
                    <span className="font-bold text-cyan-300">
                      {frontMeta?.shortLabel || intel.frontLabel}
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className="text-slate-400">
                      {intel.sourceLabel}
                    </span>

                    {/* Geospatial Provenance Badge */}
                    {intel.locationLabel && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-medium">
                        <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                        {intel.locationLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.2 rounded font-extrabold uppercase text-[9px] border ${
                        isCrit
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : isObs
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {intel.shortTag}
                    </span>

                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-cyan-400 flex items-center gap-0.5 font-bold">
                      <Eye className="w-3 h-3" /> INSPECCIONAR
                    </span>
                  </div>
                </div>

                {/* Clean Headline text */}
                <div className="text-slate-100 text-xs font-semibold leading-relaxed pl-0.5">
                  <span className="text-cyan-500 select-none mr-1.5 font-bold">&gt;</span>
                  {intel.cleanTitle}
                </div>

                {/* Operational Decision Guidance Strip */}
                <div className="mt-2 pl-0.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-2 text-slate-300 flex-1 min-w-[240px]">
                    <span className="text-rose-400 font-bold shrink-0 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      ACTIVO:
                    </span>
                    <span className="text-slate-200 font-medium truncate">
                      {intel.affectedAsset}
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="text-cyan-400 font-bold shrink-0">
                      ACCIÓN:
                    </span>
                    <span className="text-slate-300 truncate">
                      {intel.recommendation}
                    </span>
                  </div>

                  <div className="font-mono text-[10px] font-bold tracking-wide shrink-0">
                    {log.mitigated_by_soc ? (
                      <span className="text-emerald-400">CONTENIDO ✓</span>
                    ) : (
                      <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                        EXPEDIENTE <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal status bar */}
      <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-[10px] text-slate-400 flex flex-wrap justify-between items-center gap-2">
        <span className="text-slate-400">
          💡 TIP: HAZ CLIC EN CUALQUIER INCIDENTE PARA ABRIR SU EXPEDIENTE COMPLETO, RECOMENDACIÓN Y FUENTE OFICIAL
        </span>
        <span className="text-cyan-400 font-bold">
          VIGILANCIA PERMANENTE EN TIEMPO REAL
        </span>
      </div>
    </div>
  );
};
