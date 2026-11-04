"use client";

import React, { useState, useEffect } from "react";
import { TelemetryRecord } from "@/types/telemetry";
import { analyzeRecordForDecision, FRONT_META } from "@/utils/intelligenceFormatter";
import {
  X,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Download,
  Terminal,
  Clock,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  Crosshair,
  FileText,
} from "lucide-react";

interface ForensicEvidenceModalProps {
  event: TelemetryRecord | null;
  onClose: () => void;
  onMitigateNode?: (
    eventId: string,
    facility?: string,
    actionType?: string
  ) => Promise<TelemetryRecord | null>;
  onUpdateEvent?: (updated: TelemetryRecord) => void;
}

export const ForensicEvidenceModal: React.FC<ForensicEvidenceModalProps> = ({
  event,
  onClose,
  onMitigateNode,
  onUpdateEvent,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [mitigating, setMitigating] = useState<boolean>(false);
  const [showTechnicalLog, setShowTechnicalLog] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (event) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const intel = analyzeRecordForDecision(event);
  const isRed = intel.severityLabel === "CRÍTICO";
  const isYellow = intel.severityLabel === "OBSERVACIÓN";
  const frontData = FRONT_META[event.evidence?.strategic_front || "CYBER_WARFARE"];

  const handleCopyEvidence = () => {
    if (event.evidence?.raw_evidence) {
      navigator.clipboard.writeText(event.evidence.raw_evidence);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadDump = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(event, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SYNTERGIC-INTEL-${event.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleIsolate = async () => {
    if (onMitigateNode) {
      setMitigating(true);
      try {
        const updated = await onMitigateNode(
          event.id,
          event.geo?.facility,
          "OPERATIONAL_CONTAINMENT"
        );
        if (updated && onUpdateEvent) {
          onUpdateEvent(updated);
        }
        setActionFeedback(
          "AMENAZA CONTENIDA: NODO AISLADO EN PROTOCOLO DE SEGURIDAD"
        );
        setTimeout(() => setActionFeedback(null), 4000);
      } finally {
        setMitigating(false);
      }
    } else {
      setActionFeedback("INCIDENTE MARCADO COMO ATENDIDO");
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border-2 bg-slate-950 shadow-2xl font-mono text-xs flex flex-col ${
          isRed
            ? "border-rose-500/80 shadow-[0_0_40px_rgba(244,63,94,0.3)]"
            : isYellow
            ? "border-amber-500/70 shadow-[0_0_35px_rgba(245,158,11,0.2)]"
            : "border-cyan-500/60 shadow-[0_0_35px_rgba(6,182,212,0.18)]"
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/95 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {isRed ? (
              <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse shrink-0" />
            ) : isYellow ? (
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-100 tracking-wider">
                  EXPEDIENTE DE INTELIGENCIA OPERATIVA
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${
                    isRed
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                      : isYellow
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                  }`}
                >
                  {intel.categoryBadge}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                FRENTE: <span className="text-cyan-400 font-bold">{frontData?.label || intel.frontLabel}</span> | ORIGEN:{" "}
                <span className="text-slate-200 font-semibold">{intel.sourceLabel}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {actionFeedback && (
            <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-center font-bold tracking-wider animate-pulse">
              ✓ {actionFeedback}
            </div>
          )}

          {/* Incident Title Card */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
              <span className="uppercase font-bold text-cyan-400 flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" />
                SUCESO VERIFICADO EN VIVO
              </span>
              <span>ID: <code className="text-slate-300">{event.id}</code></span>
            </div>
            <h2 className="text-slate-100 text-base sm:text-lg font-bold leading-snug">
              {intel.cleanTitle}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pt-1">
              {intel.summary}
            </p>
          </div>

          {/* ACTIONABLE RECOMMENDATION (The Centerpiece for Decision Makers) */}
          <div
            className={`p-4 rounded-xl border-2 transition-all ${
              isRed
                ? "bg-rose-950/25 border-rose-500/80 shadow-[inset_0_0_20px_rgba(244,63,94,0.12)]"
                : "bg-cyan-950/25 border-cyan-500/70 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldAlert className={`w-4 h-4 ${isRed ? "text-rose-400" : "text-cyan-400"}`} />
              <span className={isRed ? "text-rose-300" : "text-cyan-300"}>
                RECOMENDACIÓN OPERATIVA PARA LA TOMA DE DECISIONES
              </span>
            </div>
            <p className="text-slate-100 text-xs sm:text-sm font-semibold leading-relaxed">
              {intel.recommendation}
            </p>
          </div>

          {/* 3 Decision Core Cards: Affected Asset, Location, Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
              <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                <Layers className="w-3.5 h-3.5 text-rose-400" />
                ACTIVO / OBJETIVO AFECTADO
              </span>
              <div className="font-bold text-slate-100 text-xs sm:text-sm truncate">
                {intel.affectedAsset}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {intel.cveId ? `CVE Oficial: ${intel.cveId}` : intel.impactScope}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
              <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                UBICACIÓN &amp; COORDENADAS
              </span>
              <div className="font-bold text-slate-100 text-xs sm:text-sm">
                {intel.locationLabel}
              </div>
              <div className="text-[10px] text-cyan-400 font-mono mt-1">
                {event.geo ? `${event.geo.lat.toFixed(2)}° N, ${event.geo.lng.toFixed(2)}° E` : "Global"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
              <span className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                FUENTE &amp; VERIFICACIÓN
              </span>
              <div className="font-bold text-emerald-300 text-xs truncate">
                {intel.sourceLabel}
              </div>
              <div className="mt-1">
                {event.evidence?.source_url?.startsWith("http") ? (
                  <a
                    href={event.evidence.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Abrir reporte original →
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500">Fuente oficial verificada</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <button
                onClick={handleIsolate}
                disabled={mitigating}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  event.mitigated_by_soc
                    ? "bg-emerald-950/70 border border-emerald-500 text-emerald-300"
                    : "bg-rose-950/80 hover:bg-rose-900 border border-rose-500 text-rose-200 hover:text-white shadow-lg shadow-rose-950/40"
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>
                  {event.mitigated_by_soc
                    ? "AMENAZA CONTENIDA ✓"
                    : mitigating
                    ? "CONTENIENDO..."
                    : "CONTENER AMENAZA / AISLAR"}
                </span>
              </button>

              {event.evidence?.source_url?.startsWith("http") && (
                <a
                  href={event.evidence.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500 text-cyan-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>VERIFICAR FUENTE</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTechnicalLog(!showTechnicalLog)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>{showTechnicalLog ? "OCULTAR REGISTRO TÉCNICO" : "VER LOG TÉCNICO & FORENSE"}</span>
                {showTechnicalLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleDownloadDump}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Descargar JSON Forense Completo"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Collapsible Technical Audit Drawer (For deep dive / logs) */}
          {showTechnicalLog && (
            <div className="mt-3 p-4 rounded-xl border border-slate-800 bg-black/90 space-y-3 font-mono text-[11px] animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5 uppercase text-xs">
                  <Terminal className="w-3.5 h-3.5" />
                  REGISTRO TÉCNICO DE TELEMETRÍA (AUDIT TRAIL)
                </span>
                <button
                  onClick={handleCopyEvidence}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] border border-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "COPIADO" : "COPIAR LOG"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400 text-[10px]">
                <div>
                  <span className="text-slate-500">HUELLA CRIPTOGRÁFICA SHA-256:</span>
                  <div className="text-slate-300 font-mono truncate">
                    {event.evidence?.sha256_fingerprint || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">VECTOR DE DETECCIÓN:</span>
                  <div className="text-slate-300 font-mono truncate">
                    {event.evidence?.detection_vector || "LIVE_OSINT_INGEST"}
                  </div>
                </div>
              </div>

              <pre className="text-emerald-300/95 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto p-3 bg-black/60 rounded border border-slate-900 select-text">
                {event.evidence?.raw_evidence || "No raw forensic capture attached."}
              </pre>

              {event.evidence?.timeline && event.evidence.timeline.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-900">
                  <span className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    CRONOLOGÍA FORENSE REGISTRADA
                  </span>
                  <div className="space-y-1">
                    {event.evidence.timeline.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[10px]">
                        <span className="text-cyan-400 font-bold shrink-0">{step.offset}:</span>
                        <span className="text-slate-300">{step.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
