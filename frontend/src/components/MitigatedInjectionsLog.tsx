"use client";

import React, { useState, useRef, useEffect } from "react";
import { TelemetryRecord } from "@/types/telemetry";
import { Terminal, Pause, Play, Trash2, Search, Filter, MapPin, Eye } from "lucide-react";

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
    const matchesSearch =
      searchTerm === "" ||
      log.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.neutralized_action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.geo && `${log.geo.city} ${log.geo.country} ${log.geo.facility}`.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity =
      filterSeverity === "ALL" || log.threat_level === filterSeverity;

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="w-full flex flex-col bg-slate-950/90 border border-slate-800 rounded-lg overflow-hidden shadow-2xl font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200 tracking-wide">
            DEV://MITIGATED_INJECTIONS.LOG
          </span>
          <span className="text-[10px] text-slate-500">({logs.length} RECORDS IN BUFFER)</span>
        </div>

        {/* Filter & Terminal Controls */}
        <div className="flex items-center gap-2">
          {/* Severity selector */}
          <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-slate-800">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-transparent text-slate-300 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="ALL">ALL LEVELS</option>
              <option value="GREEN">GREEN</option>
              <option value="YELLOW">YELLOW</option>
              <option value="RED">RED ONLY</option>
            </select>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-slate-800">
            <Search className="w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none w-24 sm:w-32 text-[11px]"
            />
          </div>

          {/* Tail auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
              autoScroll
                ? "bg-emerald-950/60 border-emerald-600/70 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
            title={autoScroll ? "Pause real-time auto-scroll" : "Resume auto-scroll"}
          >
            {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="text-[10px] hidden sm:inline">
              {autoScroll ? "TAIL -F ON" : "PAUSED"}
            </span>
          </button>

          {/* Clear button */}
          <button
            onClick={onClear}
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Clear buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div
        ref={scrollRef}
        className="max-h-[400px] min-h-[260px] overflow-y-auto p-3 space-y-2 bg-black/75 divide-y divide-slate-900"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-600 italic">
            [SYS_STREAM] No injection events in buffer matching current filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const dateObj = new Date(log.timestamp);
            const timeStr = isNaN(dateObj.getTime())
              ? "00:00:00"
              : dateObj.toLocaleTimeString("en-GB", { hour12: false });

            const isRed = log.threat_level === "RED";
            const isYellow = log.threat_level === "YELLOW";

            return (
              <div
                key={log.id}
                onClick={() => onSelectEvent && onSelectEvent(log)}
                className={`pt-2 pb-2 px-2.5 rounded transition-all cursor-pointer group ${
                  isRed
                    ? "bg-rose-950/25 hover:bg-rose-950/50 border-l-2 border-rose-500"
                    : isYellow
                    ? "bg-amber-950/20 hover:bg-amber-950/45 border-l-2 border-amber-500"
                    : "hover:bg-slate-900/60 border-l-2 border-slate-800"
                }`}
              >
                {/* Meta line */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">[{timeStr}]</span>
                    <span className="font-semibold text-cyan-400">
                      [{log.source || "UNKNOWN_SENSOR"}]
                    </span>

                    {/* Geospatial Provenance Badge */}
                    {log.geo && (
                      <span className="flex items-center gap-1 text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-bold">
                        <MapPin className="w-2.5 h-2.5 text-cyan-400" />
                        {log.geo.city}, {log.geo.country}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] border ${
                        isRed
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : isYellow
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {log.threat_level}
                    </span>

                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-cyan-400 flex items-center gap-0.5">
                      <Eye className="w-3 h-3" /> VER EVIDENCIA
                    </span>
                  </div>
                </div>

                {/* Raw Headline text */}
                <div className="text-slate-200 text-xs font-mono font-medium leading-relaxed pl-1">
                  <span className="text-slate-500 select-none mr-1.5">&gt;</span>
                  {log.headline}
                </div>

                {/* Cold Logos Metrics & Neutralization Action */}
                <div className="mt-1.5 pl-1 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-2.5 font-mono">
                    <span className="text-slate-400 font-semibold">LOGOS:</span>
                    <span className="text-cyan-400">
                      SF: <strong className="text-white">{log.metrics.social_friction.toFixed(3)}</strong>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-amber-400">
                      SI: <strong className="text-white">{log.metrics.structural_inertia.toFixed(3)}</strong>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-rose-400 font-bold">
                      Ω: <strong className="text-rose-300">{log.metrics.omega_index.toFixed(3)}</strong>
                    </span>
                  </div>

                  <div
                    className={`font-mono text-[10px] font-semibold tracking-wide ${
                      isRed
                        ? "text-rose-400"
                        : isYellow
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {log.neutralized_action}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal status bar */}
      <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
        <span>TIP: CLICK ANY LOG ENTRY OR MAP NODE TO INSPECT FORENSIC EVIDENCE</span>
        <span>STATUS: ACTIVE_SURVEILLANCE</span>
      </div>
    </div>
  );
};
